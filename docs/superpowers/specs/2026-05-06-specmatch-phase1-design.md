# SpecMatch Platform — Phase 1 Design Spec
**Date:** 2026-05-06
**Scope:** Foundation + Spec Match module
**Phase 2:** Submittals CRM (separate spec + plan)
**Output directory:** `/Users/claude/Documents/Submittal/`

---

## 1. Overview

SpecMatch is a standalone desktop web application for Division 7 commercial construction subcontractors. It combines two workflows: (1) spec-to-product matching for estimating and bidding, and (2) submittal management CRM for awarded projects. Phase 1 delivers the full foundation and the Spec Match module. Phase 2 delivers the Submittals CRM.

- Desktop-only. Minimum 1024px viewport. No mobile layout.
- Replaces the existing Python/FastAPI app at `/Users/claude/Documents/Claude/spec-analyzer/`.
- New app is fully independent — do not modify the existing repo.
- Users upload their own TDS PDFs. No pre-existing TDS files are imported.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| PDF parsing | `pdf-parse` |
| PDF generation | `pdfkit` |
| AI | `@anthropic-ai/sdk` (`claude-sonnet-4-6`) |
| File uploads | `multer` |
| Styling | Tailwind CSS utilities + CSS custom properties for design tokens |
| Dev runner | `concurrently` (root `package.json`) |

### Directory Layout

```
/Users/claude/Documents/Submittal/
  /client
    /src
      /components        ← shared UI: Sidebar, Header, StatusPill, LoadingDot, etc.
      /views             ← one file per route (AnalysesDashboard, NewAnalysis, etc.)
      /api               ← fetch wrapper functions (analyses.js, tds.js, settings.js)
    index.html
    vite.config.js       ← proxy /api → localhost:3001
    tailwind.config.js
  /server
    /routes              ← Express routers: categories.js, tds.js, analyses.js, reports.js, settings.js
    /services
      claudeService.js   ← Spec Match AI (ported from Python ai_matcher.py)
      pdfParser.js       ← PDF text extraction via pdf-parse
      reportService.js   ← PDF report generation via pdfkit
    /db
      schema.js          ← CREATE TABLE IF NOT EXISTS + migration runner
      db.js              ← better-sqlite3 connection singleton
    index.js             ← Express app entry point
  .env
  package.json           ← root: concurrently dev script
  docs/
    superpowers/specs/   ← this file
```

---

## 3. Environment Variables (`.env`)

```
ANTHROPIC_API_KEY=
DB_PATH=                 # path to legacy db.json (migration source, optional)
SQLITE_PATH=./server/db/specmatch.db
TDS_DIR=./server/uploads/tds
REPORTS_DIR=./server/reports
PORT=3001
```

---

## 4. Design System

### Color Tokens (CSS custom properties on `:root`)

```css
--sand:    #EDE6D6;   /* page background / field */
--cream:   #F7F1E0;   /* surface / card background */
--charcoal:#1B1B1B;   /* primary type */
--smoke:   #3A3A3A;   /* body text */
--saffron: #F0B429;   /* accent — ONE high note per screen */
--amber:   #C68C0F;   /* hover state for saffron elements */
--white:   #FFFFFF;
```

### Typography

- **Display/headline:** Cormorant Garamond (Google Fonts, serif), 56px, used large and editorial
- **Body:** Inter (Google Fonts, sans-serif), 17px
- **Mono/labels:** Inter, 13px
- Mixed italic/upright pairs in headings: italic "Match" voice, upright "Spec" voice
- Example: "Good morning, *Thomas.*"

### UI Rules

- Saffron used for ONE primary CTA or highlight per screen only
- Status pills, progress bars, and active nav items use saffron
- Cards: `--cream` background on `--sand` page
- Tables: subtle row separators (`1px solid rgba(0,0,0,0.06)`), no heavy borders
- Buttons: saffron-filled (primary) or charcoal-outlined (secondary)
- Corner radius: 4px throughout (tight, professional)
- No box shadows — separation through color only
- Editorial display text on every major view

### Layout Shell

- **Left sidebar:** 240px wide, `--charcoal` background, cream/sand text, always visible
- **Header:** 56px tall — SM monogram + "Spec/*Match*" wordmark left, breadcrumb center, search + CTA right
- **Content area:** fills remaining width, `--sand` background, 32px padding

### Logo / Wordmark

- Monogram: Stacked "S" and "M" with a saffron rule between letters
- Wordmark: upright "Spec" + saffron "/" + italic "*Match*"

### Icons

Lucide React, thin stroke, consistent weight throughout.

### Sidebar Bottom Badge

Saffron dot + "SM · LIVE" version label. TDS count + "Last sync Xm ago" subtext.

---

## 5. Database Schema (SQLite)

All tables created with `CREATE TABLE IF NOT EXISTS` on server start. UUIDs via `crypto.randomUUID()`. Dates as ISO strings.

```sql
-- Phase 1 tables (active)

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS tds_entries (
  id             TEXT PRIMARY KEY,
  category_id    TEXT REFERENCES categories(id),
  original_name  TEXT NOT NULL,
  product_name   TEXT,        -- AI-extracted or user-provided display name
  manufacturer   TEXT,        -- AI-extracted from PDF
  file_path      TEXT NOT NULL, -- absolute path on disk in TDS_DIR
  extracted_text TEXT NOT NULL, -- full PDF text, stored at upload time
  created_at     TEXT
);

CREATE TABLE IF NOT EXISTS analyses (
  id              TEXT PRIMARY KEY,
  project_name    TEXT,
  spec_filename   TEXT,
  spec_text       TEXT,   -- stored for later use in compare + export
  category_ids    TEXT,   -- JSON array
  results         TEXT,   -- JSON: { rankedProducts: [...] }
  compare_results TEXT,   -- JSON: { tdsIdA, tdsIdB, attributes: [{attribute, sheetA, sheetB, differs}] }
  created_at      TEXT,
  project_id      TEXT    -- nullable, Phase 2 foreign key
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Phase 2 tables (created now, populated later)

CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  gc_name         TEXT,
  project_number  TEXT,
  bid_date        TEXT,
  contract_date   TEXT,
  created_at      TEXT,
  status          TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS submittal_items (
  id                 TEXT PRIMARY KEY,
  project_id         TEXT REFERENCES projects(id),
  scope_item         TEXT NOT NULL,
  spec_section       TEXT,
  spec_section_title TEXT,
  status             TEXT NOT NULL DEFAULT 'not_yet_submitted',
  required_docs      TEXT,  -- JSON array
  deadline           TEXT,
  assigned_to        TEXT,
  notes              TEXT,
  linked_analysis_id TEXT,
  created_at         TEXT,
  updated_at         TEXT
);

CREATE TABLE IF NOT EXISTS submittal_revisions (
  id                  TEXT PRIMARY KEY,
  submittal_item_id   TEXT REFERENCES submittal_items(id),
  revision_number     INTEGER,
  submitted_date      TEXT,
  submitted_by        TEXT,
  response_date       TEXT,
  response_status     TEXT,
  reviewer_comments   TEXT,
  ai_summary          TEXT,
  ai_action_items     TEXT,  -- JSON array
  package_docs        TEXT,  -- JSON array of filenames
  created_at          TEXT
);
```

---

## 6. Migration

On first server start, `schema.js` checks for `db.json` at the path in `DB_PATH`.

**If found:**
1. Import all `categories` entries → `categories` table
2. Import all `tdsEntries` entries → `tds_entries` table
3. Import all `analyses` entries → `analyses` table
4. Log migration result to console
5. Rename `db.json` → `db.json.migrated`

**If not found:** skip silently, log "No legacy db.json found, starting fresh."

**Note on existing TDS data:** Users upload their own TDS PDFs via the Library view. No pre-existing TDS files are imported from the old app or any local directory. The old `products.db` is not referenced.

---

## 7. Backend API Routes (Phase 1)

All routes under `/api`. Express JSON body parser + multer for file uploads.

### Categories
```
GET    /api/categories          → list all
POST   /api/categories          → create { name }
DELETE /api/categories/:id      → delete
```

### TDS
```
GET    /api/tds                 → list all (with category_id, original_name)
POST   /api/tds/upload          → multipart: file + category_id; saves to TDS_DIR; extracts text via pdf-parse; stores entry
DELETE /api/tds/:id             → delete entry (does not delete file from disk)
```

### Analyses
```
POST   /api/analysis              → { projectName, categoryIds, specFile (multipart) }
                                     → runs claudeService.analyzeSpec(); returns analysis id
GET    /api/analyses              → list all analyses (summary fields only)
GET    /api/analyses/:id          → full analysis with results
POST   /api/analyses/compare      → { analysisId, tdsIdA, tdsIdB }
                                     → calls claudeService.compareTwoSheets(); stores + returns compare_results
GET    /api/reports/:id           → streams PDF report (pdfkit)
```

### Settings
```
GET    /api/settings            → all key/value pairs as object
PUT    /api/settings            → { key, value } or { updates: {...} }
```

---

## 8. AI Service: `claudeService.js`

Ports `ai_matcher.py` to JavaScript. Uses `@anthropic-ai/sdk` with prompt caching.

**Function:** `analyzeSpec(specText, products)`

- `products`: array of `{ tdsId, productName, tdsText }`
- Calls Claude with system prompt cached (`cache_control: ephemeral`)
- Truncates spec and TDS text to 40,000 chars each
- Parses JSON response per product
- Returns `{ rankedProducts: [{ tdsId, productName, rating, score, meets, shortfalls, exceedances }] }` sorted highest score first

**Scoring:**
- Excellent: 85–100
- Good: 65–84
- Partial: 40–64
- Does Not Meet: 0–39

**Function:** `compareTwoSheets(tdsTextA, tdsTextB, specText)`

Returns `{ attributes: [{ attribute: string, sheetA: string, sheetB: string, differs: boolean }] }`. Extracts all technically meaningful attributes from both TDS texts (perm rating, tensile strength, VOC content, coverage rate, etc.) and produces a row-by-row comparison. Used exclusively by SM-4. Results stored in `analyses.compare_results`.

**System prompt:** Construction product specification analyst, Division 7 specialist. Returns JSON with `match_score`, `summary`, `requirements_met`, `gaps`, `exceedances`. Cites actual values from spec and TDS.

---

## 9. Frontend Views (Phase 1)

React Router v6 for routing. All views share the Layout component (sidebar + header).

### SM-1: Analyses Dashboard (`/analyses`) — default landing

- Editorial display: "Your analyses."
- Metric cards: Total analyses | Products in library | This week
- Table: PROJECT NAME | SPEC FILE | CATEGORIES | TOP MATCH | SCORE | DATE | ACTIONS
- Actions per row: View | Download report | Delete (with confirm dialog)
- Saffron CTA: "New analysis →"
- Empty state: "No analyses yet." + CTA

### SM-2: New Analysis (`/analyses/new`)

- Step 1: Project name text input
- Step 2: Category selector — grid of cards with checkbox toggle, saffron when selected; "Select all / Deselect all"
- Step 3: Spec PDF drop zone — large drop target, sand bg, dashed border, shows filename + page count on upload
- "Run analysis →" saffron button
- Loading states: animated saffron dot → "Reading spec…" → "Comparing products…" → "Ranking results…"

### SM-3: Analysis Results (`/analyses/:id`)

Two-column layout (~65% / 35%)

**Left:** Spec section display — editorial heading with section number and title. Clause-by-clause breakdown with key requirements highlighted in saffron. Matched clause count + processing time subtext.

**Right — "Matches":** Ranked product cards highest score first. Each card: clause reference + score (large italic saffron %), product name (italic display), manufacturer name, TDS filename, "Approve" + "Compare" buttons (charcoal outline). Bottom: saffron "Stamp & Submit →" button.

### SM-4: Compare Two Sheets (`/analyses/:id/compare`)

User arrives here from SM-3 by clicking "Compare" on two product cards (Sheet A = recommended, Sheet B = selected). The frontend sends both `tdsId` values to `POST /api/analyses/compare`, which calls Claude with both TDS texts and asks it to return a structured JSON attribute table: `[{ attribute, sheetA, sheetB, differs: bool }]`. This response is cached in the analysis record under `compare_results`.

UI: Three sections — header (spec clause ref), Sheet A (saffron header, RECOMMENDED badge) vs Sheet B. Attribute comparison table: ATTRIBUTE | SHEET A | SHEET B | Δ. Differences: saffron dot + "differs". Identical: "— same" in smoke text. Top right: "Hide identical" toggle + saffron "Approve A →".

### SM-5: Submittal Export (`/analyses/:id/export`)

Three-column page preview: Cover sheet | Contents page | First product detail. "Edit cover" outline button + saffron "Stamp & download .pdf →". Footer: "Citations generated by SpecMatch against project manual · All matches reviewed by preparer".

### SM-6: Library (`/library`)

- Left sub-panel: Division filter list with counts; tag filters; year filters
- Main: "Your library." editorial display. Search bar + saffron "+ Upload sheet" button.
- Product card grid (3 columns): CSI section + year header, product name (italic display), manufacturer, category tag pill.
- Upload modal: PDF drop zone + category selector (existing or create new). On upload, server extracts PDF text via `pdf-parse`, then calls Claude with a short prompt to extract `product_name` and `manufacturer` from the first 2,000 chars. Both are stored in `tds_entries`; falls back to filename if extraction fails.
- Empty state: "No sheets yet." + CTA

### Settings (`/settings`)

- Company name (stored in settings table)
- Default coordinator name (pre-fills from settings, default "Thomas")
- Anthropic API key (masked input)
- Deadline warning threshold (days, default 7)
- TDS storage path (read-only display from env)
- Migration status: shows whether legacy db.json was found and migrated; "Re-index library" button

---

## 10. Navigation (Left Sidebar — Phase 1)

```
[SM monogram]  Spec/Match

─── WORKSPACE ───────────────────
  [company name from settings]

─── SPEC MATCH ──────────────────
  Analyses          [count badge]
  Library           [TDS count badge]

─── SUBMITTALS ──────────────────   ← dimmed, not yet active
  Projects
  All Submittals
  Audit Trail

─── SYSTEM ──────────────────────
  Settings

────────────────────────────────
  ● SM · LIVE
  26 sheets · Last sync 2m ago
```

Active nav item: saffron left border + saffron text. Inactive: smoke text. Disabled (Submittals): 40% opacity, no hover effect.

---

## 11. Shared UI Components

| Component | Purpose |
|---|---|
| `Sidebar` | Full left nav, badge counts, bottom status |
| `Header` | 56px top bar, breadcrumb, search, slot for CTA |
| `MetricCard` | Sand bg card with label + large number |
| `StatusPill` | Colored pill for analysis ratings |
| `LoadingDot` | Animated saffron dot + message string |
| `DropZone` | PDF drag-and-drop target, shows file info on drop |
| `CategoryCard` | Checkbox card in category selector grid |
| `ProductCard` | Ranked match card in results right panel |
| `ConfirmDialog` | Modal for destructive actions |
| `ErrorBanner` | Dismissible charcoal banner, amber text |

---

## 12. Error Handling & Loading States

- All AI calls wrapped in try/catch; on error: `ErrorBanner` with fallback message "Analysis failed. Check your API key and try again."
- Loading states on all async operations: `LoadingDot` with contextual message
- Confirm dialog before any DELETE action
- Empty states: editorial display text + primary CTA on every list view

---

## 13. Phase 2 Preview (not in this spec)

Phase 2 adds the full Submittals CRM:
- Views: SUB-1 through SUB-7 (Projects dashboard, Project detail, Item detail, Log revision modal, Build package, All submittals, Audit trail)
- `submittalsAI.js` with 4 functions: `parseSpecForSubmittals`, `summarizeRejection`, `compareResubmittal`, `draftComplianceStatement`
- Extended `reportService.js` for submittal package PDF generation
- All routes under `/api/projects/...` and `/api/ai/...`
- Audit trail logging for all actions

---

## 14. Out of Scope for Phase 1

- Any Submittals view beyond nav shell
- `submittalsAI.js`
- Submittal package PDF generation
- AI parse-spec-for-submittals endpoint
- Audit trail
- CSV export for submittal log
