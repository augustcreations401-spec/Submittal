# SpecMatch Platform — Phase 2 Design Spec
**Date:** 2026-05-06
**Scope:** Submittals CRM module
**Builds on:** Phase 1 foundation at `/Users/claude/Documents/Submittal/`
**Phase 1 spec:** `docs/superpowers/specs/2026-05-06-specmatch-phase1-design.md`

---

## 1. Overview

Phase 2 adds the Submittals CRM to the existing SpecMatch platform. It allows Division 7 subcontractors to manage awarded project submittals — tracking items, logging revisions with file uploads, building transmittal packages, and using AI to summarize rejections, compare resubmittals, and draft compliance statements.

- All Phase 1 code and design tokens remain unchanged.
- Submittal items are created manually (no AI spec parsing).
- Files (shop drawings, product data PDFs, GC response letters) are uploaded and stored per revision.
- Package building generates a PDF transmittal cover sheet; docs download individually (no PDF merging).
- Three AI functions: summarize rejection, compare resubmittal, draft compliance statement.
- Audit trail is a chronological event log, global but filterable by project.

---

## 2. New Files

```
/server
  /routes
    projects.js          ← CRUD for projects + items + revisions
    submittals.js        ← GET /api/submittals (cross-project list)
    audit.js             ← GET /api/audit
    ai.js                ← POST /api/ai/* (3 endpoints)
  /services
    submittalsAI.js      ← 3 AI functions
    packageService.js    ← transmittal PDF generation (pdfkit)
  /uploads
    /revisions           ← uploaded files per revision (gitignored)

/client/src
  /views
    ProjectsDashboard.jsx     ← SUB-1
    ProjectDetail.jsx         ← SUB-2
    ItemDetail.jsx            ← SUB-3
    BuildPackage.jsx          ← SUB-5
    AllSubmittals.jsx         ← SUB-6
    AuditTrail.jsx            ← SUB-7
  /components
    LogRevisionModal.jsx      ← SUB-4 (modal, used inside ItemDetail)
    SaveToProjectModal.jsx    ← Phase 1 bridge modal (used in SubmittalExport)
    SubmittalStatusPill.jsx   ← status pill for submittal statuses
  /api
    projects.js               ← fetch wrappers for /api/projects
    submittals.js             ← fetch wrappers for /api/submittals + /api/audit
    ai.js                     ← fetch wrappers for /api/ai/*
```

---

## 3. Database Schema Changes

All changes additive — no existing tables modified.

### New table: `audit_log`

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  project_id  TEXT,
  item_id     TEXT,
  action      TEXT NOT NULL,
  detail      TEXT,
  created_at  TEXT
);
```

`action` values: `project_created`, `project_updated`, `project_deleted`, `item_added`, `item_updated`, `item_deleted`, `revision_logged`, `revision_deleted`, `status_changed`, `package_generated`.

`detail` is a JSON string with context relevant to the action (e.g. `{ "from": "submitted", "to": "rejected" }` for `status_changed`).

### Column rename in `submittal_revisions`

`package_docs` → `uploaded_files`. The old column name was misleading — "package" has a specific meaning in the Build Package view. The column stores a JSON array of filenames uploaded when logging a revision.

Migration: `ALTER TABLE submittal_revisions RENAME COLUMN package_docs TO uploaded_files` — run once in `schema.js` using `IF EXISTS` guard.

### File storage

Uploaded revision files stored at `server/uploads/revisions/:revisionId/`. Added to `.gitignore`. Added to `TDS_DIR`-style env var: `REVISIONS_DIR=./server/uploads/revisions`.

---

## 4. Submittal Item Statuses

| Value | Label | Pill color |
|---|---|---|
| `not_yet_submitted` | Not submitted | smoke (gray) |
| `submitted` | Submitted | saffron |
| `approved` | Approved | green (`#2E7D32`) |
| `approved_as_noted` | Approved as noted | teal (`#00695C`) |
| `rejected` | Rejected | red (`#C62828`) |
| `revise_and_resubmit` | Revise & resubmit | amber (`#C68C0F`) |

---

## 5. Backend API Routes

All routes log to `audit_log` on write operations. All errors return `{ error: message }`.

### Projects (`/server/routes/projects.js`)

```
GET    /api/projects                              → list all projects with item count + nearest deadline
POST   /api/projects                              → create { name, gc_name, project_number, bid_date, contract_date }
GET    /api/projects/:id                          → project detail + items array
PUT    /api/projects/:id                          → update project fields
DELETE /api/projects/:id                          → delete project + cascade items + revisions + files

GET    /api/projects/:id/items                    → list items for project
POST   /api/projects/:id/items                    → create { scope_item, spec_section, spec_section_title, required_docs[], deadline, notes, linked_analysis_id }
GET    /api/projects/:id/items/:itemId            → item + revisions array
PUT    /api/projects/:id/items/:itemId            → update { status, deadline, notes, assigned_to }
DELETE /api/projects/:id/items/:itemId            → delete item + revisions + files

POST   /api/projects/:id/items/:itemId/revisions  → multipart: files[] + { submitted_date, submitted_by, response_date, response_status, reviewer_comments }
                                                     auto-increments revision_number; stores filenames in uploaded_files JSON
DELETE /api/projects/:id/items/:itemId/revisions/:revId → delete revision + files from disk

GET    /api/projects/:id/items/:itemId/package    → streams transmittal PDF (packageService)
```

### Cross-project views

```
GET    /api/submittals           → all items joined with projects; supports ?status=&project_id= filters
GET    /api/audit                → all audit_log rows DESC; supports ?project_id=&limit= filters
```

### AI endpoints (`/server/routes/ai.js`)

```
POST   /api/ai/summarize-rejection     → { reviewerComments } → { summary, actionItems[] }
POST   /api/ai/compare-resubmittal     → { revisionIdA, revisionIdB } → { addressed[], outstanding[], summary }
POST   /api/ai/draft-compliance        → { specSection, specText, productName, manufacturer } → { statement }
```

All three read `anthropic_api_key` from settings table, fall back to `process.env.ANTHROPIC_API_KEY`.

---

## 6. AI Service: `submittalsAI.js`

```js
async function summarizeRejection(reviewerComments, apiKey)
// Returns { summary: string, actionItems: [string] }
// Prompt: construction submittal specialist, extract action items from GC response

async function compareResubmittal(revAComments, revAFiles, revBComments, revBFiles, apiKey)
// revA = older revision, revB = newer revision
// revAFiles / revBFiles are arrays of filenames (not file contents)
// The route handler fetches both revisions from DB before calling this function
// Returns { addressed: [string], outstanding: [string], summary: string }
// Prompt: what changed between submissions, what was addressed, what remains

async function draftComplianceStatement(specSection, specText, productName, manufacturer, apiKey)
// Returns { statement: string }
// Prompt: draft a professional compliance statement asserting product meets spec section
```

All three use `claude-sonnet-4-6`, max_tokens 1024, JSON response only. Error handling: throw with message, caught by route handler.

---

## 7. Package Service: `packageService.js`

`generateTransmittal(item, project, revision, selectedFiles, complianceStatement)` → PDFDocument

Cover sheet layout (pdfkit):
1. Company name (from settings) — top right
2. "Submittal Transmittal" — large heading
3. Project name, GC name, project number, date
4. Spec section + scope item
5. Revision number
6. Compliance statement (user-provided or AI-drafted, editable before generating)
7. "Enclosed Documents" — numbered list of `selectedFiles`
8. Footer: "Prepared by SpecMatch · All submittals reviewed by preparer"

---

## 8. Frontend Views

### SUB-1: Projects Dashboard (`/projects`)

- Editorial display: "Your projects."
- Metric cards: Active projects | Total submittal items | Items due this week
- Project cards grid (3 col): project name, GC name, project number, item count, status summary bar (green/saffron/red segments), nearest deadline
- Saffron CTA: "New project →" — opens inline form or modal
- Empty state: "No projects yet." + CTA

### SUB-2: Project Detail (`/projects/:id`)

- Header: project name (display text), GC · project number · contract date subtext. Edit + Delete buttons (charcoal outline).
- Submittal items table: SCOPE ITEM | SPEC SECTION | STATUS | DEADLINE | REVISIONS | ACTIONS
- Status shown as `SubmittalStatusPill`
- ACTIONS: View → navigates to item detail. Deadline overdue items highlighted with amber left border.
- Saffron CTA: "+ Add item" — inline row append or modal
- Empty state: "No submittal items yet."

### SUB-3: Item Detail (`/projects/:id/items/:itemId`)

Two-column layout (60% / 40%):

**Left — Revision timeline:**
- Vertical timeline, newest revision at top
- Each revision card: revision number badge, submitted date, submitted by, response status pill, reviewer comments (collapsible), uploaded files list (each file: filename + download link)
- AI results (if run): summary + action items shown below reviewer comments
- "Log revision →" saffron button at top

**Right — AI Actions panel:**
- "Summarize rejection" — only enabled when latest revision has reviewer comments. Calls `/api/ai/summarize-rejection`, displays result inline.
- "Compare with previous →" — only enabled when 2+ revisions exist. Calls `/api/ai/compare-resubmittal`, displays addressed/outstanding lists.
- "Build package →" — charcoal outline button, navigates to SUB-5.
- Item metadata: scope item, spec section, deadline, notes (editable inline).

### SUB-4: Log Revision Modal

Triggered by "Log revision →" in Item Detail. Full-screen modal overlay.

Fields:
- Revision number (auto-incremented, editable)
- Submitted date (date input)
- Submitted by (text, defaults to `coordinator_name` from settings)
- Upload files (DropZone, multiple files, PDF + common doc types)
- Response received? (toggle)
  - If yes: response date, response status (select), reviewer comments (textarea)
  - "Summarize →" button next to reviewer comments — calls AI inline, shows result below textarea
- Save → POST to revisions endpoint, closes modal, refreshes timeline

### SUB-5: Build Package (`/projects/:id/items/:itemId/package`)

Three-column layout:

**Col 1 — Document selector:**
- All uploaded files across all revisions for this item, grouped by revision
- Checkbox + drag handle per file
- "Select all" toggle

**Col 2 — Transmittal preview:**
- Read-only preview of the cover sheet (project name, GC, spec section, scope item, revision, enclosed docs list)
- Compliance statement textarea (editable, pre-fillable via AI)
- "AI Draft Cover →" button — calls `/api/ai/draft-compliance`, inserts into textarea

**Col 3 — Actions:**
- "Stamp & download transmittal →" saffron button — calls `GET /api/projects/:id/items/:itemId/package` with selected files + statement, streams PDF
- Selected files listed with individual "Download" links
- Footer note: "Documents download separately. Transmittal is the cover sheet only."

### SUB-6: All Submittals (`/submittals`)

- Editorial display: "All submittals."
- Filter bar: status pill toggles + project dropdown
- Table: PROJECT | SCOPE ITEM | SPEC SECTION | STATUS | DEADLINE | REVISIONS | ACTIONS
- ACTIONS: View item (→ SUB-3)
- Deadline column: overdue items show date in amber
- Empty state: "No submittal items yet."

### SUB-7: Audit Trail (`/audit`)

- Editorial display: "Audit trail."
- Filter: project dropdown (default: all)
- Chronological list, newest first
- Each entry: timestamp (relative + absolute on hover), action label, detail (e.g. "Status changed: submitted → rejected on Air Barrier Submittal #2")
- No delete or edit — read-only log
- Empty state: "No activity yet."

---

## 9. Phase 1 Bridge: SaveToProjectModal

Triggered from `SubmittalExport.jsx` when user clicks "Stamp & Submit →".

Modal content:
- Heading: "Save this match to a project?"
- Project selector: dropdown of existing projects + "Create new project" option
  - If "Create new project": shows inline name field
- On confirm: POST to `/api/projects/:id/items` with `{ scope_item: analysisProjectName, linked_analysis_id: analysisId, status: 'not_yet_submitted' }`
- "Skip — just download" link: closes modal, triggers PDF download without saving
- "Save & download": saves item, then triggers PDF download

After save, the analysis record's `project_id` is updated to link it.

---

## 10. Sidebar Updates

Activate the three disabled nav items. Update `Sidebar.jsx`:

```jsx
<NavItem to="/projects" icon={FolderOpen} label="Projects" badge={projectsCount} />
<NavItem to="/submittals" icon={List} label="All Submittals" badge={openCount} />
<NavItem to="/audit" icon={Clock} label="Audit Trail" />
```

`projectsCount` and `openCount` fetched from an updated `/api/stats` that adds `projectsCount` and `openSubmittalsCount`.

---

## 11. Router Updates (`App.jsx`)

Add 6 new routes under the existing `<Layout>`:

```jsx
<Route path="/projects" element={<ProjectsDashboard />} />
<Route path="/projects/:id" element={<ProjectDetail />} />
<Route path="/projects/:id/items/:itemId" element={<ItemDetail />} />
<Route path="/projects/:id/items/:itemId/package" element={<BuildPackage />} />
<Route path="/submittals" element={<AllSubmittals />} />
<Route path="/audit" element={<AuditTrail />} />
```

---

## 12. Error Handling & Loading States

Same patterns as Phase 1:
- All AI calls: `ErrorBanner` on failure, `LoadingDot` while running
- All async fetches: `LoadingDot` with contextual message
- Confirm dialog before DELETE on projects and items
- File upload errors shown inline in `LogRevisionModal`
- Overdue deadlines: amber highlight, no blocking behavior

---

## 13. Out of Scope for Phase 2

- AI parsing of spec PDF to auto-generate submittal items (`parseSpecForSubmittals`)
- PDF merging of multiple docs into a single package file
- Email sending or GC portal integration
- User accounts / multi-user assignment tracking
- CSV export of submittal log
- Mobile layout
