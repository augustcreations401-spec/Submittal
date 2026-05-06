# SpecMatch Platform — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SpecMatch Platform Phase 1 — Express/SQLite backend + React/Vite frontend delivering the full Spec Match module with the sand/cream/saffron design system.

**Architecture:** Express serves REST API on port 3001; Vite React runs on port 5173 proxying `/api` to Express; better-sqlite3 handles all DB ops synchronously; Claude SDK with prompt caching powers analysis; pdfkit generates streamed report PDFs.

**Tech Stack:** Node.js 18+, Express 4, better-sqlite3, pdf-parse, pdfkit, @anthropic-ai/sdk, multer, React 18, Vite 5, React Router 6, Tailwind CSS 3, Lucide React, Jest + supertest (server), Vitest + @testing-library/react (client)

---

## File Map

```
/Users/claude/Documents/Submittal/
  package.json                          root: concurrently dev script
  .env                                  env vars
  .gitignore

  server/
    package.json
    jest.config.js
    index.js                            Express entry, middleware, route mounting
    db/
      db.js                             better-sqlite3 singleton (memory in test)
      schema.js                         CREATE TABLE IF NOT EXISTS + migration
    routes/
      settings.js                       GET /api/settings, PUT /api/settings, GET /api/stats
      categories.js                     CRUD /api/categories
      tds.js                            GET/POST/DELETE /api/tds
      analyses.js                       POST /api/analysis, GET /api/analyses, GET /api/analyses/:id, POST /api/analyses/:id/compare
      reports.js                        GET /api/reports/:id (streams PDF)
    services/
      claudeService.js                  analyzeSpec(), compareTwoSheets(), extractProductInfo()
      pdfParser.js                      extractText(buffer)
      reportService.js                  generateReport(analysis, settings)
    uploads/tds/                        TDS PDF storage (created on start)
    reports/                            generated PDFs (created on start)
    tests/
      settings.test.js
      categories.test.js
      tds.test.js
      analyses.test.js

  client/
    package.json
    vite.config.js                      proxy /api → :3001
    tailwind.config.js
    postcss.config.js
    index.html                          Google Fonts, viewport
    src/
      main.jsx
      App.jsx                           React Router routes
      index.css                         CSS custom properties + base
      api/
        analyses.js
        tds.js
        categories.js
        settings.js
      components/
        Layout.jsx                      Sidebar + Header + <Outlet>
        Sidebar.jsx
        Header.jsx
        MetricCard.jsx
        StatusPill.jsx
        LoadingDot.jsx
        DropZone.jsx
        CategoryCard.jsx
        ProductCard.jsx
        ConfirmDialog.jsx
        ErrorBanner.jsx
        StatusPill.test.jsx
        ConfirmDialog.test.jsx
        ErrorBanner.test.jsx
      views/
        AnalysesDashboard.jsx           SM-1
        NewAnalysis.jsx                 SM-2
        AnalysisResults.jsx             SM-3
        CompareSheets.jsx               SM-4
        SubmittalExport.jsx             SM-5
        Library.jsx                     SM-6
        Settings.jsx
```

---

## Task 1: Root scaffold

**Files:** `package.json`, `.env`, `.gitignore`

- [ ] Create root `package.json`:

```json
{
  "name": "specmatch",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "install:all": "npm install && cd server && npm install && cd ../client && npm install"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] Create `.env` (fill in API key before running):

```
ANTHROPIC_API_KEY=
DB_PATH=
SQLITE_PATH=./server/db/specmatch.db
TDS_DIR=./server/uploads/tds
REPORTS_DIR=./server/reports
PORT=3001
```

- [ ] Create `.gitignore`:

```
node_modules/
.env
server/uploads/
server/reports/
server/db/specmatch.db
*.db
*.db.migrated
dist/
```

- [ ] Run: `cd /Users/claude/Documents/Submittal && npm install`

- [ ] Commit:
```bash
git init
git add package.json .env .gitignore
git commit -m "chore: root scaffold"
```

---

## Task 2: Server package + test setup

**Files:** `server/package.json`, `server/jest.config.js`

- [ ] Create `server/package.json`:

```json
{
  "name": "specmatch-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "NODE_ENV=test jest --runInBand"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "pdfkit": "^0.15.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] Create `server/jest.config.js`:

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
};
```

- [ ] Run: `cd server && npm install`

- [ ] Commit: `git commit -m "chore: server package setup"`

---

## Task 3: Database layer

**Files:** `server/db/db.js`, `server/db/schema.js`

- [ ] Create `server/db/db.js`:

```js
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : (process.env.SQLITE_PATH || path.join(__dirname, 'specmatch.db'));

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
```

- [ ] Create `server/db/schema.js`:

```js
const db = require('./db');
const fs = require('fs');
const path = require('path');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tds_entries (
      id TEXT PRIMARY KEY,
      category_id TEXT REFERENCES categories(id),
      original_name TEXT NOT NULL,
      product_name TEXT,
      manufacturer TEXT,
      file_path TEXT NOT NULL,
      extracted_text TEXT NOT NULL,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      project_name TEXT,
      spec_filename TEXT,
      spec_text TEXT,
      category_ids TEXT,
      results TEXT,
      compare_results TEXT,
      created_at TEXT,
      project_id TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gc_name TEXT,
      project_number TEXT,
      bid_date TEXT,
      contract_date TEXT,
      created_at TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS submittal_items (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id),
      scope_item TEXT NOT NULL,
      spec_section TEXT,
      spec_section_title TEXT,
      status TEXT NOT NULL DEFAULT 'not_yet_submitted',
      required_docs TEXT,
      deadline TEXT,
      assigned_to TEXT,
      notes TEXT,
      linked_analysis_id TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS submittal_revisions (
      id TEXT PRIMARY KEY,
      submittal_item_id TEXT REFERENCES submittal_items(id),
      revision_number INTEGER,
      submitted_date TEXT,
      submitted_by TEXT,
      response_date TEXT,
      response_status TEXT,
      reviewer_comments TEXT,
      ai_summary TEXT,
      ai_action_items TEXT,
      package_docs TEXT,
      created_at TEXT
    );
  `);

  // seed default settings
  const defaults = [
    ['company_name', 'Your Company'],
    ['coordinator_name', 'Thomas'],
    ['deadline_warning_days', '7'],
  ];
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of defaults) insert.run(k, v);
}

function runMigration() {
  const dbPath = process.env.DB_PATH;
  if (!dbPath || !fs.existsSync(dbPath)) {
    console.log('No legacy db.json found, starting fresh.');
    return;
  }
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (id, name, created_at) VALUES (?, ?, ?)');
  const insertTds = db.prepare('INSERT OR IGNORE INTO tds_entries (id, category_id, original_name, file_path, extracted_text, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const insertAna = db.prepare('INSERT OR IGNORE INTO analyses (id, project_name, spec_filename, category_ids, results, created_at) VALUES (?, ?, ?, ?, ?, ?)');

  const migrate = db.transaction(() => {
    for (const c of (data.categories || [])) insertCat.run(c.id, c.name, c.created_at);
    for (const t of (data.tdsEntries || [])) insertTds.run(t.id, t.category_id, t.original_name, t.file_path || '', t.extracted_text || '', t.created_at);
    for (const a of (data.analyses || [])) insertAna.run(a.id, a.project_name, a.spec_filename, a.category_ids, a.results, a.created_at);
  });
  migrate();

  fs.renameSync(dbPath, dbPath + '.migrated');
  console.log(`Migration complete from ${dbPath}`);
}

module.exports = { initSchema, runMigration };
```

- [ ] Write `server/tests/schema.test.js`:

```js
const { initSchema } = require('../db/schema');
const db = require('../db/db');

beforeAll(() => initSchema());

test('categories table exists', () => {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='categories'").get();
  expect(row).toBeDefined();
});

test('tds_entries table exists', () => {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tds_entries'").get();
  expect(row).toBeDefined();
});

test('settings seeds coordinator_name default', () => {
  const row = db.prepare("SELECT value FROM settings WHERE key='coordinator_name'").get();
  expect(row.value).toBe('Thomas');
});
```

- [ ] Run: `cd server && npm test -- tests/schema.test.js`
Expected: 3 passing

- [ ] Commit: `git commit -m "feat: database schema + migration runner"`

---

## Task 4: Server entry point

**Files:** `server/index.js`

- [ ] Create `server/index.js`:

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initSchema, runMigration } = require('./db/schema');

const app = express();
app.use(cors());
app.use(express.json());

// ensure upload + report dirs exist
const tdsDir = process.env.TDS_DIR || './server/uploads/tds';
const reportsDir = process.env.REPORTS_DIR || './server/reports';
fs.mkdirSync(path.resolve(tdsDir), { recursive: true });
fs.mkdirSync(path.resolve(reportsDir), { recursive: true });

// routes
app.use('/api/settings', require('./routes/settings'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tds', require('./routes/tds'));
app.use('/api', require('./routes/analyses'));
app.use('/api/reports', require('./routes/reports'));

// init db
initSchema();
if (process.env.NODE_ENV !== 'test') runMigration();

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`SpecMatch server on :${PORT}`));
}

module.exports = app;
```

- [ ] Commit: `git commit -m "feat: express entry point"`

---

## Task 5: Settings routes

**Files:** `server/routes/settings.js`, `server/tests/settings.test.js`

- [ ] Create `server/tests/settings.test.js`:

```js
const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');

beforeAll(() => initSchema());

test('GET /api/settings returns defaults', async () => {
  const res = await request(app).get('/api/settings');
  expect(res.status).toBe(200);
  expect(res.body.coordinator_name).toBe('Thomas');
});

test('PUT /api/settings updates a key', async () => {
  const res = await request(app).put('/api/settings').send({ key: 'company_name', value: 'Acme Roofing' });
  expect(res.status).toBe(200);
  const check = await request(app).get('/api/settings');
  expect(check.body.company_name).toBe('Acme Roofing');
});

test('GET /api/stats returns counts', async () => {
  const res = await request(app).get('/api/stats');
  expect(res.status).toBe(200);
  expect(typeof res.body.analysesCount).toBe('number');
  expect(typeof res.body.tdsCount).toBe('number');
});
```

- [ ] Run: `npm test -- tests/settings.test.js` → expect FAIL (route missing)

- [ ] Create `server/routes/settings.js`:

```js
const router = require('express').Router();
const db = require('../db/db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
  // expose server-only env vars as read-only settings
  obj.tds_dir = process.env.TDS_DIR || './server/uploads/tds';
  res.json(obj);
});

router.put('/', (req, res) => {
  const { key, value, updates } = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  if (updates && typeof updates === 'object') {
    const tx = db.transaction(() => {
      for (const [k, v] of Object.entries(updates)) upsert.run(k, String(v));
    });
    tx();
  } else if (key) {
    upsert.run(key, String(value));
  }
  res.json({ ok: true });
});

// stats used by sidebar badges
router.get('/stats', (req, res) => {
  // Note: mounted at /api/settings but we expose /api/stats by adding to app directly
  res.json({});
});

module.exports = router;
```

- [ ] Update `server/index.js` to add a dedicated stats route before other routes:

```js
app.get('/api/stats', (req, res) => {
  const db = require('./db/db');
  const analysesCount = db.prepare('SELECT COUNT(*) as n FROM analyses').get().n;
  const tdsCount = db.prepare('SELECT COUNT(*) as n FROM tds_entries').get().n;
  const lastSync = db.prepare("SELECT value FROM settings WHERE key='last_tds_upload'").get();
  res.json({ analysesCount, tdsCount, lastTdsUpload: lastSync ? lastSync.value : null });
});
```

- [ ] Run: `npm test -- tests/settings.test.js` → expect PASS

- [ ] Commit: `git commit -m "feat: settings routes + stats endpoint"`

---

## Task 6: Categories routes

**Files:** `server/routes/categories.js`, `server/tests/categories.test.js`

- [ ] Create `server/tests/categories.test.js`:

```js
const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');

beforeAll(() => initSchema());

let catId;

test('POST /api/categories creates a category', async () => {
  const res = await request(app).post('/api/categories').send({ name: 'Air Barrier' });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Air Barrier');
  catId = res.body.id;
});

test('GET /api/categories lists categories', async () => {
  const res = await request(app).get('/api/categories');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.find(c => c.id === catId)).toBeDefined();
});

test('DELETE /api/categories/:id removes category', async () => {
  const res = await request(app).delete(`/api/categories/${catId}`);
  expect(res.status).toBe(200);
  const check = await request(app).get('/api/categories');
  expect(check.body.find(c => c.id === catId)).toBeUndefined();
});
```

- [ ] Run: `npm test -- tests/categories.test.js` → FAIL

- [ ] Create `server/routes/categories.js`:

```js
const router = require('express').Router();
const db = require('../db/db');
const { randomUUID } = require('crypto');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)').run(id, name, now);
  res.status(201).json({ id, name, created_at: now });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] Run: `npm test -- tests/categories.test.js` → PASS

- [ ] Commit: `git commit -m "feat: categories CRUD routes"`

---

## Task 7: PDF parser service

**Files:** `server/services/pdfParser.js`

- [ ] Create `server/services/pdfParser.js`:

```js
const pdfParse = require('pdf-parse');

async function extractText(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err) {
    console.error('PDF parse error:', err.message);
    return '';
  }
}

module.exports = { extractText };
```

- [ ] Commit: `git commit -m "feat: pdf parser service"`

---

## Task 8: Claude service

**Files:** `server/services/claudeService.js`

- [ ] Create `server/services/claudeService.js`:

```js
const Anthropic = require('@anthropic-ai/sdk');

const MAX_CHARS = 40000;

const ANALYZE_SYSTEM = `You are a construction product specification analyst specializing in Division 7 building envelope products (air barriers, spray foam, waterproofing, traffic coatings).

Given a construction specification excerpt and a product's technical data sheet (TDS), analyze whether the product meets the specification requirements.

Respond ONLY with valid JSON:
{
  "tdsId": "<string>",
  "match_score": <integer 0-100>,
  "summary": "<1-2 sentence summary>",
  "requirements_met": ["<requirement>"],
  "gaps": ["<gap>"],
  "exceedances": ["<exceeds>"]
}

Scoring: 85-100 Excellent, 65-84 Good, 40-64 Partial, 0-39 Does Not Meet.
Cite actual values (e.g. "perm rating 0.02 meets spec max of 0.10").`;

const COMPARE_SYSTEM = `You are a technical product comparison specialist for Division 7 construction products.

Given two TDS documents, extract all technically meaningful attributes and compare them side by side.

Respond ONLY with valid JSON:
{
  "attributes": [
    { "attribute": "<name>", "sheetA": "<value>", "sheetB": "<value>", "differs": true|false }
  ]
}

Include: perm rating, tensile strength, elongation, VOC content, coverage rate, temperature range, cure time, color options, approvals/listings, shelf life, substrate compatibility, application method.`;

const EXTRACT_SYSTEM = `Extract the product name and manufacturer from this technical data sheet excerpt. Respond ONLY with JSON: { "product_name": "<name>", "manufacturer": "<company>" }`;

function scoreToRating(score) {
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Good';
  if (score >= 40) return 'Partial';
  return 'Does Not Meet';
}

function parseJson(raw) {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(text);
}

async function analyzeSpec(specText, products, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const truncSpec = specText.slice(0, MAX_CHARS);
  const results = [];

  for (const product of products) {
    const truncTds = (product.tdsText || '').slice(0, MAX_CHARS);
    const userContent = `SPECIFICATION:\n${truncSpec}\n\nPRODUCT TDS (tdsId=${product.tdsId}, name=${product.productName}):\n${truncTds}\n\nReturn JSON analysis. Set tdsId to "${product.tdsId}".`;

    try {
      const response = await client.beta.promptCaching.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: [{ type: 'text', text: ANALYZE_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userContent }],
      });
      const parsed = parseJson(response.content[0].text);
      parsed.tdsId = product.tdsId;
      parsed.productName = product.productName;
      parsed.rating = scoreToRating(parsed.match_score || 0);
      parsed.score = parsed.match_score;
      parsed.meets = parsed.requirements_met;
      parsed.shortfalls = parsed.gaps;
      results.push(parsed);
    } catch (err) {
      console.error(`analyzeSpec failed for ${product.tdsId}:`, err.message);
    }
  }

  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  return { rankedProducts: results };
}

async function compareTwoSheets(tdsTextA, tdsTextB, specText, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  const content = `SPEC CONTEXT:\n${specText.slice(0, 10000)}\n\nSHEET A:\n${tdsTextA.slice(0, MAX_CHARS)}\n\nSHEET B:\n${tdsTextB.slice(0, MAX_CHARS)}\n\nReturn comparison JSON.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: COMPARE_SYSTEM,
    messages: [{ role: 'user', content }],
  });
  return parseJson(response.content[0].text);
}

async function extractProductInfo(tdsText, apiKey) {
  const client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: tdsText.slice(0, 2000) }],
    });
    return parseJson(response.content[0].text);
  } catch {
    return { product_name: null, manufacturer: null };
  }
}

module.exports = { analyzeSpec, compareTwoSheets, extractProductInfo, scoreToRating };
```

- [ ] Commit: `git commit -m "feat: claude service (analyzeSpec, compareTwoSheets, extractProductInfo)"`

---

## Task 9: TDS routes

**Files:** `server/routes/tds.js`, `server/tests/tds.test.js`

- [ ] Create `server/tests/tds.test.js`:

```js
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../index');
const { initSchema } = require('../db/schema');
const db = require('../db/db');

// mock heavy deps
jest.mock('../services/pdfParser', () => ({ extractText: async () => 'mock pdf text' }));
jest.mock('../services/claudeService', () => ({
  extractProductInfo: async () => ({ product_name: 'MockProd', manufacturer: 'MockCo' }),
  analyzeSpec: jest.fn(),
  compareTwoSheets: jest.fn(),
  scoreToRating: () => 'Good',
}));

beforeAll(() => {
  initSchema();
  db.prepare("INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat1', 'Air Barrier', '2024-01-01')").run();
});

let tdsId;

test('POST /api/tds/upload accepts a PDF and creates entry', async () => {
  const fakePdf = Buffer.from('%PDF-1.4 fake');
  const res = await request(app)
    .post('/api/tds/upload')
    .field('category_id', 'cat1')
    .attach('file', fakePdf, 'test-sheet.pdf');
  expect(res.status).toBe(201);
  expect(res.body.id).toBeDefined();
  expect(res.body.product_name).toBe('MockProd');
  tdsId = res.body.id;
});

test('GET /api/tds lists entries', async () => {
  const res = await request(app).get('/api/tds');
  expect(res.status).toBe(200);
  expect(res.body.find(t => t.id === tdsId)).toBeDefined();
});

test('DELETE /api/tds/:id removes entry', async () => {
  const res = await request(app).delete(`/api/tds/${tdsId}`);
  expect(res.status).toBe(200);
  const check = await request(app).get('/api/tds');
  expect(check.body.find(t => t.id === tdsId)).toBeUndefined();
});
```

- [ ] Run: `npm test -- tests/tds.test.js` → FAIL

- [ ] Create `server/routes/tds.js`:

```js
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const db = require('../db/db');
const { extractText } = require('../services/pdfParser');
const { extractProductInfo } = require('../services/claudeService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.env.TDS_DIR || './server/uploads/tds');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM tds_entries ORDER BY created_at DESC').all());
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { category_id } = req.body;
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const extractedText = await extractText(buffer);
    const { product_name, manufacturer } = await extractProductInfo(extractedText);
    const fallbackName = path.basename(req.file.originalname, '.pdf').replace(/[-_]/g, ' ');
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO tds_entries (id, category_id, original_name, product_name, manufacturer, file_path, extracted_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, category_id, req.file.originalname, product_name || fallbackName, manufacturer || '', filePath, extractedText, now);

    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_tds_upload', ?)").run(now);

    res.status(201).json({ id, category_id, original_name: req.file.originalname, product_name: product_name || fallbackName, manufacturer, file_path: filePath, created_at: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tds_entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] Run: `npm test -- tests/tds.test.js` → PASS

- [ ] Commit: `git commit -m "feat: TDS upload/list/delete routes"`

---

## Task 10: Analyses routes

**Files:** `server/routes/analyses.js`, `server/tests/analyses.test.js`

- [ ] Create `server/tests/analyses.test.js`:

```js
const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');
const db = require('../db/db');

jest.mock('../services/pdfParser', () => ({ extractText: async () => 'Air barrier shall have perm rating of 0.02 or less.' }));
jest.mock('../services/claudeService', () => ({
  analyzeSpec: async () => ({
    rankedProducts: [{ tdsId: 'tds1', productName: 'AeroBarrier', rating: 'Excellent', score: 92, meets: ['perm rating'], shortfalls: [], exceedances: [] }]
  }),
  compareTwoSheets: async () => ({ attributes: [{ attribute: 'Perm Rating', sheetA: '0.01', sheetB: '0.05', differs: true }] }),
  extractProductInfo: async () => ({ product_name: 'MockProd', manufacturer: 'MockCo' }),
  scoreToRating: () => 'Excellent',
}));

beforeAll(() => {
  initSchema();
  db.prepare("INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat1', 'Air Barrier', '2024-01-01')").run();
  db.prepare("INSERT OR IGNORE INTO tds_entries (id, category_id, original_name, product_name, file_path, extracted_text, created_at) VALUES ('tds1', 'cat1', 'test.pdf', 'AeroBarrier', '/tmp/test.pdf', 'mock tds text', '2024-01-01')").run();
});

let analysisId;

test('POST /api/analysis runs analysis and returns id', async () => {
  const fakePdf = Buffer.from('%PDF-1.4 fake spec');
  const res = await request(app)
    .post('/api/analysis')
    .field('projectName', 'Test Project')
    .field('categoryIds', JSON.stringify(['cat1']))
    .attach('specFile', fakePdf, 'spec.pdf');
  expect(res.status).toBe(201);
  expect(res.body.id).toBeDefined();
  analysisId = res.body.id;
});

test('GET /api/analyses lists analyses', async () => {
  const res = await request(app).get('/api/analyses');
  expect(res.status).toBe(200);
  expect(res.body.find(a => a.id === analysisId)).toBeDefined();
});

test('GET /api/analyses/:id returns full analysis', async () => {
  const res = await request(app).get(`/api/analyses/${analysisId}`);
  expect(res.status).toBe(200);
  expect(res.body.results.rankedProducts[0].tdsId).toBe('tds1');
});

test('POST /api/analyses/:id/compare returns attribute table', async () => {
  const res = await request(app)
    .post(`/api/analyses/${analysisId}/compare`)
    .send({ tdsIdA: 'tds1', tdsIdB: 'tds1' });
  expect(res.status).toBe(200);
  expect(res.body.attributes[0].attribute).toBe('Perm Rating');
});
```

- [ ] Run: `npm test -- tests/analyses.test.js` → FAIL

- [ ] Create `server/routes/analyses.js`:

```js
const router = require('express').Router();
const multer = require('multer');
const { randomUUID } = require('crypto');
const db = require('../db/db');
const { extractText } = require('../services/pdfParser');
const { analyzeSpec, compareTwoSheets } = require('../services/claudeService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/analysis', upload.single('specFile'), async (req, res) => {
  try {
    const { projectName, categoryIds: rawCatIds } = req.body;
    const categoryIds = JSON.parse(rawCatIds || '[]');
    const specText = await extractText(req.file.buffer);

    const placeholders = categoryIds.map(() => '?').join(',');
    const tdsRows = categoryIds.length
      ? db.prepare(`SELECT id, product_name, extracted_text FROM tds_entries WHERE category_id IN (${placeholders})`).all(...categoryIds)
      : db.prepare('SELECT id, product_name, extracted_text FROM tds_entries').all();

    const products = tdsRows.map(r => ({ tdsId: r.id, productName: r.product_name, tdsText: r.extracted_text }));
    const apiKey = db.prepare("SELECT value FROM settings WHERE key='anthropic_api_key'").get()?.value;
    const results = await analyzeSpec(specText, products, apiKey);

    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO analyses (id, project_name, spec_filename, spec_text, category_ids, results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, projectName, req.file.originalname, specText, JSON.stringify(categoryIds), JSON.stringify(results), now);
    res.status(201).json({ id, project_name: projectName, results, created_at: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analyses', (req, res) => {
  const rows = db.prepare('SELECT id, project_name, spec_filename, category_ids, created_at FROM analyses ORDER BY created_at DESC').all();
  const result = rows.map(r => {
    let topMatch = null, topScore = null;
    try {
      // peek at results for summary columns
      const full = db.prepare('SELECT results FROM analyses WHERE id = ?').get(r.id);
      const parsed = JSON.parse(full.results || '{}');
      const top = parsed.rankedProducts?.[0];
      if (top) { topMatch = top.productName; topScore = top.score; }
    } catch {}
    return { ...r, category_ids: JSON.parse(r.category_ids || '[]'), topMatch, topScore };
  });
  res.json(result);
});

router.get('/analyses/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, category_ids: JSON.parse(row.category_ids || '[]'), results: JSON.parse(row.results || '{}'), compare_results: row.compare_results ? JSON.parse(row.compare_results) : null });
});

router.delete('/analyses/:id', (req, res) => {
  db.prepare('DELETE FROM analyses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/analyses/:id/compare', async (req, res) => {
  try {
    const { tdsIdA, tdsIdB } = req.body;
    const analysis = db.prepare('SELECT spec_text FROM analyses WHERE id = ?').get(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    const tdsA = db.prepare('SELECT extracted_text FROM tds_entries WHERE id = ?').get(tdsIdA);
    const tdsB = db.prepare('SELECT extracted_text FROM tds_entries WHERE id = ?').get(tdsIdB);
    if (!tdsA || !tdsB) return res.status(404).json({ error: 'TDS not found' });
    const apiKey = db.prepare("SELECT value FROM settings WHERE key='anthropic_api_key'").get()?.value;
    const compareResult = await compareTwoSheets(tdsA.extracted_text, tdsB.extracted_text, analysis.spec_text, apiKey);
    db.prepare('UPDATE analyses SET compare_results = ? WHERE id = ?').run(JSON.stringify({ tdsIdA, tdsIdB, ...compareResult }), req.params.id);
    res.json(compareResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] Run: `npm test -- tests/analyses.test.js` → PASS

- [ ] Commit: `git commit -m "feat: analyses routes (run, list, get, compare)"`

---

## Task 11: Report service + route

**Files:** `server/services/reportService.js`, `server/routes/reports.js`

- [ ] Create `server/services/reportService.js`:

```js
const PDFDocument = require('pdfkit');

function generateReport(analysis, settings = {}) {
  const doc = new PDFDocument({ margin: 50 });
  const company = settings.company_name || 'SpecMatch';
  const { project_name, spec_filename, created_at, results } = analysis;
  const ranked = results?.rankedProducts || [];

  // Cover
  doc.fontSize(24).font('Helvetica-Bold').text('SpecMatch Analysis Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica').text(`Project: ${project_name || 'Untitled'}`, { align: 'center' });
  doc.text(`Spec File: ${spec_filename || ''}`, { align: 'center' });
  doc.text(`Date: ${created_at ? created_at.slice(0, 10) : ''}`, { align: 'center' });
  doc.text(`Prepared by: ${company}`, { align: 'center' });
  doc.moveDown(2);
  doc.addPage();

  // Results table header
  doc.fontSize(18).font('Helvetica-Bold').text('Matched Products', { underline: true });
  doc.moveDown(1);

  ranked.forEach((p, i) => {
    doc.fontSize(14).font('Helvetica-Bold').text(`${i + 1}. ${p.productName || p.tdsId}`);
    doc.fontSize(11).font('Helvetica').text(`Score: ${p.score || 0}/100 (${p.rating || ''})`, { indent: 20 });
    doc.text(`Summary: ${p.summary || ''}`, { indent: 20 });
    if (p.meets?.length) doc.text(`Meets: ${p.meets.join('; ')}`, { indent: 20 });
    if (p.shortfalls?.length) doc.text(`Gaps: ${p.shortfalls.join('; ')}`, { indent: 20 });
    doc.moveDown(0.5);
    if (i < ranked.length - 1) doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
  });

  doc.moveDown(2);
  doc.fontSize(9).fillColor('#888').text('Citations generated by SpecMatch against project manual · All matches reviewed by preparer', { align: 'center' });

  return doc;
}

module.exports = { generateReport };
```

- [ ] Create `server/routes/reports.js`:

```js
const router = require('express').Router();
const db = require('../db/db');
const { generateReport } = require('../services/reportService');

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const settings = Object.fromEntries(
    db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value])
  );
  const analysis = { ...row, results: JSON.parse(row.results || '{}') };
  const doc = generateReport(analysis, settings);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="analysis-${row.id}.pdf"`);
  doc.pipe(res);
  doc.end();
});

module.exports = router;
```

- [ ] Commit: `git commit -m "feat: report generation + PDF stream route"`

---

## Task 12: Client scaffold

**Files:** `client/package.json`, `client/vite.config.js`, `client/tailwind.config.js`, `client/postcss.config.js`, `client/index.html`

- [ ] Create `client/package.json`:

```json
{
  "name": "specmatch-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "lucide-react": "^0.400.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.24.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "vite": "^5.3.1",
    "vitest": "^1.6.0"
  }
}
```

- [ ] Create `client/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
});
```

- [ ] Create `client/tailwind.config.js`:

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#EDE6D6',
        cream: '#F7F1E0',
        charcoal: '#1B1B1B',
        smoke: '#3A3A3A',
        saffron: '#F0B429',
        amber: '#C68C0F',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};
```

- [ ] Create `client/postcss.config.js`:

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] Create `client/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SpecMatch</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] Run: `cd client && npm install`

- [ ] Commit: `git commit -m "chore: client scaffold (vite, tailwind, fonts)"`

---

## Task 13: Design tokens + base CSS

**Files:** `client/src/index.css`, `client/src/main.jsx`

- [ ] Create `client/src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@400;500;600&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --sand:    #EDE6D6;
  --cream:   #F7F1E0;
  --charcoal:#1B1B1B;
  --smoke:   #3A3A3A;
  --saffron: #F0B429;
  --amber:   #C68C0F;
  --white:   #FFFFFF;
}

*, *::before, *::after { box-sizing: border-box; }

html, body, #root {
  height: 100%;
  margin: 0;
  background: var(--sand);
  color: var(--smoke);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 17px;
  line-height: 1.5;
}

/* editorial display */
.display {
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: 56px;
  line-height: 1.05;
  color: var(--charcoal);
}

.display em {
  font-style: italic;
}

/* table rows */
table { width: 100%; border-collapse: collapse; }
th { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--smoke); text-align: left; padding: 10px 16px; border-bottom: 1px solid rgba(0,0,0,0.1); }
td { padding: 12px 16px; border-bottom: 1px solid rgba(0,0,0,0.06); font-size: 15px; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(0,0,0,0.02); }

/* buttons */
.btn-primary {
  background: var(--saffron);
  color: var(--charcoal);
  border: none;
  border-radius: 4px;
  padding: 9px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: var(--amber); }

.btn-secondary {
  background: transparent;
  color: var(--charcoal);
  border: 1.5px solid var(--charcoal);
  border-radius: 4px;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.btn-secondary:hover { opacity: 0.7; }

/* cards */
.card {
  background: var(--cream);
  border-radius: 4px;
  padding: 20px 24px;
}
```

- [ ] Create `client/src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] Commit: `git commit -m "feat: design tokens + base CSS"`

---

## Task 14: App routing + API wrappers

**Files:** `client/src/App.jsx`, `client/src/api/analyses.js`, `client/src/api/tds.js`, `client/src/api/categories.js`, `client/src/api/settings.js`

- [ ] Create `client/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AnalysesDashboard from './views/AnalysesDashboard.jsx';
import NewAnalysis from './views/NewAnalysis.jsx';
import AnalysisResults from './views/AnalysisResults.jsx';
import CompareSheets from './views/CompareSheets.jsx';
import SubmittalExport from './views/SubmittalExport.jsx';
import Library from './views/Library.jsx';
import Settings from './views/Settings.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/analyses" replace />} />
          <Route path="analyses" element={<AnalysesDashboard />} />
          <Route path="analyses/new" element={<NewAnalysis />} />
          <Route path="analyses/:id" element={<AnalysisResults />} />
          <Route path="analyses/:id/compare" element={<CompareSheets />} />
          <Route path="analyses/:id/export" element={<SubmittalExport />} />
          <Route path="library" element={<Library />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] Create `client/src/api/settings.js`:

```js
export const getSettings = () => fetch('/api/settings').then(r => r.json());
export const updateSetting = (key, value) => fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) }).then(r => r.json());
export const updateSettings = (updates) => fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) }).then(r => r.json());
export const getStats = () => fetch('/api/stats').then(r => r.json());
```

- [ ] Create `client/src/api/categories.js`:

```js
export const getCategories = () => fetch('/api/categories').then(r => r.json());
export const createCategory = (name) => fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(r => r.json());
export const deleteCategory = (id) => fetch(`/api/categories/${id}`, { method: 'DELETE' }).then(r => r.json());
```

- [ ] Create `client/src/api/tds.js`:

```js
export const getTds = () => fetch('/api/tds').then(r => r.json());

export const uploadTds = (file, categoryId) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('category_id', categoryId);
  return fetch('/api/tds/upload', { method: 'POST', body: fd }).then(r => r.json());
};

export const deleteTds = (id) => fetch(`/api/tds/${id}`, { method: 'DELETE' }).then(r => r.json());
```

- [ ] Create `client/src/api/analyses.js`:

```js
export const getAnalyses = () => fetch('/api/analyses').then(r => r.json());
export const getAnalysis = (id) => fetch(`/api/analyses/${id}`).then(r => r.json());
export const deleteAnalysis = (id) => fetch(`/api/analyses/${id}`, { method: 'DELETE' }).then(r => r.json());

export const runAnalysis = (projectName, categoryIds, specFile) => {
  const fd = new FormData();
  fd.append('projectName', projectName);
  fd.append('categoryIds', JSON.stringify(categoryIds));
  fd.append('specFile', specFile);
  return fetch('/api/analysis', { method: 'POST', body: fd }).then(r => r.json());
};

export const compareSheets = (analysisId, tdsIdA, tdsIdB) =>
  fetch(`/api/analyses/${analysisId}/compare`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tdsIdA, tdsIdB }) }).then(r => r.json());

export const getReportUrl = (id) => `/api/reports/${id}`;
```

- [ ] Commit: `git commit -m "feat: app routing + API wrappers"`

---

## Task 15: Layout shell

**Files:** `client/src/components/Layout.jsx`, `client/src/components/Sidebar.jsx`, `client/src/components/Header.jsx`

- [ ] Create `client/src/components/Sidebar.jsx`:

```jsx
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart2, BookOpen, FolderOpen, List, Clock, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStats, getSettings } from '../api/settings.js';

function NavItem({ to, icon: Icon, label, badge, disabled }) {
  if (disabled) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', opacity: 0.35, cursor: 'default', color: '#F7F1E0', fontSize: 14 }}>
      <Icon size={16} strokeWidth={1.5} />{label}
    </div>
  );
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px',
      color: isActive ? '#F0B429' : '#F7F1E0', fontSize: 14, textDecoration: 'none',
      borderLeft: isActive ? '3px solid #F0B429' : '3px solid transparent',
      background: isActive ? 'rgba(240,180,41,0.08)' : 'transparent',
    })}>
      <Icon size={16} strokeWidth={1.5} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && <span style={{ background: '#F0B429', color: '#1B1B1B', borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{badge}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const [stats, setStats] = useState({ analysesCount: 0, tdsCount: 0, lastTdsUpload: null });
  const [company, setCompany] = useState('');

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getSettings().then(s => setCompany(s.company_name || '')).catch(() => {});
  }, []);

  const lastSync = stats.lastTdsUpload
    ? `${Math.round((Date.now() - new Date(stats.lastTdsUpload)) / 60000)}m ago`
    : 'never';

  return (
    <div style={{ width: 240, background: '#1B1B1B', display: 'flex', flexDirection: 'column', height: '100vh', flexShrink: 0 }}>
      {/* wordmark */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* SM monogram */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
            <span style={{ color: '#F7F1E0', fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontWeight: 600 }}>S</span>
            <div style={{ width: 18, height: 2, background: '#F0B429', margin: '2px 0' }} />
            <span style={{ color: '#F7F1E0', fontFamily: '"Cormorant Garamond", serif', fontSize: 18, fontWeight: 600 }}>M</span>
          </div>
          <span style={{ color: '#F7F1E0', fontSize: 15, fontWeight: 500 }}>
            Spec<span style={{ color: '#F0B429' }}>/</span><em style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic' }}>Match</em>
          </span>
        </div>
      </div>

      <div style={{ padding: '12px 20px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(247,241,224,0.4)' }}>Workspace</div>
      <div style={{ padding: '4px 20px 8px', color: '#F7F1E0', fontSize: 14, opacity: 0.7 }}>{company || '—'}</div>

      <div style={{ padding: '12px 20px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(247,241,224,0.4)' }}>Spec Match</div>
      <NavItem to="/analyses" icon={BarChart2} label="Analyses" badge={stats.analysesCount || null} />
      <NavItem to="/library" icon={BookOpen} label="Library" badge={stats.tdsCount || null} />

      <div style={{ padding: '12px 20px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(247,241,224,0.4)' }}>Submittals</div>
      <NavItem to="/projects" icon={FolderOpen} label="Projects" disabled />
      <NavItem to="/submittals" icon={List} label="All Submittals" disabled />
      <NavItem to="/audit" icon={Clock} label="Audit Trail" disabled />

      <div style={{ padding: '12px 20px 4px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(247,241,224,0.4)' }}>System</div>
      <NavItem to="/settings" icon={Settings} label="Settings" />

      <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#F0B429' }} />
          <span style={{ color: 'rgba(247,241,224,0.7)', fontSize: 12, fontWeight: 500 }}>SM · LIVE</span>
        </div>
        <div style={{ color: 'rgba(247,241,224,0.4)', fontSize: 11 }}>{stats.tdsCount} sheets · Last sync {lastSync}</div>
      </div>
    </div>
  );
}
```

- [ ] Create `client/src/components/Header.jsx`:

```jsx
export default function Header({ breadcrumb, cta }) {
  return (
    <div style={{ height: 56, background: '#F7F1E0', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', padding: '0 32px', gap: 16, flexShrink: 0 }}>
      <div style={{ flex: 1, color: 'rgba(58,58,58,0.5)', fontSize: 13 }}>{breadcrumb}</div>
      {cta && <div>{cta}</div>}
    </div>
  );
}
```

- [ ] Create `client/src/components/Layout.jsx`:

```jsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export default function Layout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--sand)' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat: layout shell (sidebar, header, layout)"`

---

## Task 16: Shared UI components

**Files:** all 10 components + 3 test files

- [ ] Create `client/src/components/MetricCard.jsx`:

```jsx
export default function MetricCard({ label, value }) {
  return (
    <div className="card" style={{ minWidth: 160 }}>
      <div style={{ fontSize: 13, color: 'var(--smoke)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 36, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, color: 'var(--charcoal)' }}>{value ?? '—'}</div>
    </div>
  );
}
```

- [ ] Create `client/src/components/StatusPill.jsx`:

```jsx
const STYLES = {
  Excellent: { background: 'rgba(240,180,41,0.15)', color: '#C68C0F', border: '1px solid rgba(240,180,41,0.4)' },
  Good: { background: 'rgba(240,180,41,0.08)', color: '#C68C0F', border: '1px solid rgba(240,180,41,0.25)' },
  Partial: { background: 'rgba(58,58,58,0.08)', color: 'var(--smoke)', border: '1px solid rgba(58,58,58,0.2)' },
  'Does Not Meet': { background: 'rgba(27,27,27,0.08)', color: 'var(--charcoal)', border: '1px solid rgba(27,27,27,0.3)' },
};

export default function StatusPill({ rating }) {
  const s = STYLES[rating] || STYLES['Partial'];
  return (
    <span data-testid="status-pill" style={{ ...s, borderRadius: 4, padding: '2px 10px', fontSize: 12, fontWeight: 600, display: 'inline-block' }}>{rating}</span>
  );
}
```

- [ ] Create `client/src/components/LoadingDot.jsx`:

```jsx
import { useEffect, useState } from 'react';

export default function LoadingDot({ messages = ['Loading…'] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (messages.length <= 1) return;
    const t = setInterval(() => setI(p => Math.min(p + 1, messages.length - 1)), 2500);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--smoke)', fontSize: 15 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--saffron)', display: 'inline-block', animation: 'pulse 1s infinite' }} />
      {messages[i]}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}
```

- [ ] Create `client/src/components/DropZone.jsx`:

```jsx
import { useState } from 'react';
import { FileText } from 'lucide-react';

export default function DropZone({ onFile, accept = '.pdf' }) {
  const [info, setInfo] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handle = (file) => {
    if (!file) return;
    setInfo({ name: file.name, size: (file.size / 1024).toFixed(0) + ' KB' });
    onFile(file);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
      style={{
        background: 'var(--sand)', border: `2px dashed ${dragging ? 'var(--saffron)' : 'var(--smoke)'}`,
        borderRadius: 4, padding: '40px 32px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onClick={() => document.getElementById('dz-input').click()}
    >
      <input id="dz-input" type="file" accept={accept} style={{ display: 'none' }} onChange={e => handle(e.target.files[0])} />
      <FileText size={32} strokeWidth={1} style={{ color: 'var(--smoke)', marginBottom: 12 }} />
      {info ? (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{info.name}</div>
          <div style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.7 }}>{info.size}</div>
        </div>
      ) : (
        <div style={{ color: 'var(--smoke)' }}>Drop spec section PDF here<br /><span style={{ fontSize: 13, opacity: 0.6 }}>or click to browse</span></div>
      )}
    </div>
  );
}
```

- [ ] Create `client/src/components/CategoryCard.jsx`:

```jsx
export default function CategoryCard({ category, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(category.id)}
      style={{
        background: selected ? 'rgba(240,180,41,0.12)' : 'var(--cream)',
        border: `1.5px solid ${selected ? 'var(--saffron)' : 'rgba(0,0,0,0.1)'}`,
        borderRadius: 4, padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
        color: 'var(--charcoal)', fontSize: 14, fontWeight: selected ? 600 : 400, transition: 'all 0.15s',
      }}
    >
      {category.name}
    </button>
  );
}
```

- [ ] Create `client/src/components/ProductCard.jsx`:

```jsx
import { useState } from 'react';
import StatusPill from './StatusPill.jsx';

export default function ProductCard({ product, rank, onCompare, onApprove }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ fontSize: 42, fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', color: 'var(--saffron)', lineHeight: 1 }}>{product.score}%</div>
        <StatusPill rating={product.rating} />
      </div>
      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 20, color: 'var(--charcoal)', marginBottom: 2 }}>{product.productName}</div>
      <div style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.7, marginBottom: 12 }}>{product.manufacturer || ''}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => onApprove(product)}>Approve</button>
        {rank > 0 && <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => onCompare(product)}>Compare</button>}
      </div>
    </div>
  );
}
```

- [ ] Create `client/src/components/ConfirmDialog.jsx`:

```jsx
export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div data-testid="confirm-dialog" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ marginBottom: 20, color: 'var(--charcoal)', fontSize: 16 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] Create `client/src/components/ErrorBanner.jsx`:

```jsx
import { X } from 'lucide-react';
import { useState } from 'react';

export default function ErrorBanner({ message }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div data-testid="error-banner" style={{ background: 'var(--charcoal)', color: '#C68C0F', borderRadius: 4, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <span>{message}</span>
      <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C68C0F' }}><X size={16} /></button>
    </div>
  );
}
```

- [ ] Create `client/src/components/StatusPill.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import StatusPill from './StatusPill.jsx';

test('renders Excellent with saffron color', () => {
  render(<StatusPill rating="Excellent" />);
  const pill = screen.getByTestId('status-pill');
  expect(pill.textContent).toBe('Excellent');
  expect(pill.style.color).toBe('rgb(198, 140, 15)');
});

test('renders Does Not Meet', () => {
  render(<StatusPill rating="Does Not Meet" />);
  expect(screen.getByTestId('status-pill').textContent).toBe('Does Not Meet');
});
```

- [ ] Create `client/src/components/ConfirmDialog.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog.jsx';

test('calls onConfirm when Delete clicked', () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<ConfirmDialog message="Delete this?" onConfirm={onConfirm} onCancel={onCancel} />);
  fireEvent.click(screen.getByText('Delete'));
  expect(onConfirm).toHaveBeenCalled();
});

test('calls onCancel when Cancel clicked', () => {
  const onCancel = vi.fn();
  render(<ConfirmDialog message="Delete this?" onConfirm={vi.fn()} onCancel={onCancel} />);
  fireEvent.click(screen.getByText('Cancel'));
  expect(onCancel).toHaveBeenCalled();
});
```

- [ ] Create `client/src/components/ErrorBanner.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBanner from './ErrorBanner.jsx';

test('renders message', () => {
  render(<ErrorBanner message="Something went wrong" />);
  expect(screen.getByText('Something went wrong')).toBeDefined();
});

test('dismisses on X click', () => {
  render(<ErrorBanner message="Error" />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.queryByTestId('error-banner')).toBeNull();
});
```

- [ ] Run: `cd client && npm test` → PASS

- [ ] Commit: `git commit -m "feat: shared UI components + component tests"`

---

## Task 17: SM-1 Analyses Dashboard

**Files:** `client/src/views/AnalysesDashboard.jsx`

- [ ] Create `client/src/views/AnalysesDashboard.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAnalyses, deleteAnalysis, getReportUrl } from '../api/analyses.js';
import Header from '../components/Header.jsx';
import MetricCard from '../components/MetricCard.jsx';
import StatusPill from '../components/StatusPill.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function AnalysesDashboard() {
  const [analyses, setAnalyses] = useState([]);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();

  const load = () => getAnalyses().then(setAnalyses).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const thisWeek = analyses.filter(a => {
    const d = new Date(a.created_at);
    return (Date.now() - d) < 7 * 86400000;
  }).length;

  const handleDelete = async () => {
    await deleteAnalysis(deleteTarget);
    setDeleteTarget(null);
    load();
  };

  const CTA = <button className="btn-primary" onClick={() => navigate('/analyses/new')}>New analysis →</button>;

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb="Spec Match / Analyses" cta={CTA} />
      <h1 className="display" style={{ margin: '32px 0 24px' }}>Your analyses.</h1>
      {error && <ErrorBanner message={error} />}

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <MetricCard label="Total analyses" value={analyses.length} />
        <MetricCard label="This week" value={thisWeek} />
      </div>

      {analyses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div className="display" style={{ fontSize: 36, marginBottom: 16 }}>No analyses yet.</div>
          <button className="btn-primary" onClick={() => navigate('/analyses/new')}>Run your first analysis →</button>
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Project Name</th><th>Spec File</th><th>Top Match</th><th>Score</th><th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map(a => (
              <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/analyses/${a.id}`)}>
                <td style={{ fontWeight: 500 }}>{a.project_name || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.7 }}>{a.spec_filename || '—'}</td>
                <td>{a.topMatch || '—'}</td>
                <td>{a.topScore != null ? <StatusPill rating={a.topScore >= 85 ? 'Excellent' : a.topScore >= 65 ? 'Good' : a.topScore >= 40 ? 'Partial' : 'Does Not Meet'} /> : '—'}</td>
                <td style={{ fontSize: 13 }}>{a.created_at ? a.created_at.slice(0, 10) : '—'}</td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', marginRight: 6 }} onClick={() => navigate(`/analyses/${a.id}`)}>View</button>
                  <a href={getReportUrl(a.id)} download style={{ textDecoration: 'none' }}>
                    <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', marginRight: 6 }}>Report</button>
                  </a>
                  <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px', color: 'crimson', borderColor: 'crimson' }} onClick={() => setDeleteTarget(a.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {deleteTarget && <ConfirmDialog message="Delete this analysis? This cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat: SM-1 analyses dashboard"`

---

## Task 18: SM-2 New Analysis

**Files:** `client/src/views/NewAnalysis.jsx`

- [ ] Create `client/src/views/NewAnalysis.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../api/categories.js';
import { runAnalysis } from '../api/analyses.js';
import Header from '../components/Header.jsx';
import DropZone from '../components/DropZone.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const LOADING_MSGS = ['Reading spec…', 'Comparing products…', 'Ranking results…'];

export default function NewAnalysis() {
  const [projectName, setProjectName] = useState('');
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState([]);
  const [specFile, setSpecFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { getCategories().then(setCategories).catch(() => {}); }, []);

  const toggle = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const submit = async () => {
    if (!projectName || selected.length === 0 || !specFile) {
      setError('Please complete all steps before running.'); return;
    }
    setLoading(true); setError(null);
    try {
      const result = await runAnalysis(projectName, selected, specFile);
      if (result.id) navigate(`/analyses/${result.id}`);
      else setError(result.error || 'Analysis failed.');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ padding: 32, maxWidth: 760 }}>
      <Header breadcrumb="Spec Match / Analyses / New" />
      <h1 className="display" style={{ margin: '32px 0 32px' }}>New analysis.</h1>
      {error && <ErrorBanner message={error} />}

      {/* Step 1 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 10 }}>Step 1 — Project name</div>
        <input
          type="text" placeholder="e.g. 450 Main Street Plaza"
          value={projectName} onChange={e => setProjectName(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', border: '1.5px solid rgba(0,0,0,0.15)', borderRadius: 4, fontSize: 16, background: 'var(--cream)', color: 'var(--charcoal)' }}
        />
      </div>

      {/* Step 2 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)' }}>Step 2 — Categories</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setSelected(categories.map(c => c.id))}>Select all</button>
            <button className="btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setSelected([])}>Deselect all</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {categories.map(c => <CategoryCard key={c.id} category={c} selected={selected.includes(c.id)} onToggle={toggle} />)}
        </div>
        {categories.length === 0 && <div style={{ color: 'var(--smoke)', opacity: 0.6, fontSize: 14 }}>No categories yet. Add them in Library.</div>}
      </div>

      {/* Step 3 */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 10 }}>Step 3 — Spec PDF</div>
        <DropZone onFile={setSpecFile} />
      </div>

      {loading ? (
        <LoadingDot messages={LOADING_MSGS} />
      ) : (
        <button className="btn-primary" style={{ fontSize: 15, padding: '11px 28px' }} onClick={submit}>Run analysis →</button>
      )}
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat: SM-2 new analysis wizard"`

---

## Task 19: SM-3 Analysis Results

**Files:** `client/src/views/AnalysisResults.jsx`

- [ ] Create `client/src/views/AnalysisResults.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnalysis } from '../api/analyses.js';
import Header from '../components/Header.jsx';
import ProductCard from '../components/ProductCard.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingDot from '../components/LoadingDot.jsx';

export default function AnalysisResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [compareTarget, setCompareTarget] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAnalysis(id).then(setAnalysis).catch(e => setError(e.message));
  }, [id]);

  if (error) return <div style={{ padding: 32 }}><ErrorBanner message={error} /></div>;
  if (!analysis) return <div style={{ padding: 32 }}><LoadingDot messages={['Loading results…']} /></div>;

  const ranked = analysis.results?.rankedProducts || [];
  const top = ranked[0];

  const handleCompare = (product) => {
    if (!top) return;
    navigate(`/analyses/${id}/compare?a=${top.tdsId}&b=${product.tdsId}`);
  };

  const CTA = (
    <button className="btn-primary" onClick={() => navigate(`/analyses/${id}/export`)}>Stamp & Submit →</button>
  );

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb={`Spec Match / Analyses / ${analysis.project_name || id}`} cta={CTA} />
      <h1 className="display" style={{ margin: '32px 0 8px' }}>{analysis.project_name || 'Analysis'}</h1>
      <div style={{ color: 'var(--smoke)', opacity: 0.6, fontSize: 13, marginBottom: 32 }}>{analysis.spec_filename} · {ranked.length} products compared</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
        {/* Left: spec excerpt */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 16 }}>Specification</div>
          <div className="card">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--smoke)', margin: 0, lineHeight: 1.7 }}>
              {(analysis.spec_text || '').slice(0, 3000)}
              {(analysis.spec_text || '').length > 3000 ? '\n\n[…]' : ''}
            </pre>
          </div>
        </div>

        {/* Right: ranked matches */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 16 }}>Matches</div>
          {ranked.length === 0 && <div style={{ color: 'var(--smoke)', opacity: 0.6 }}>No products matched.</div>}
          {ranked.map((p, i) => (
            <ProductCard key={p.tdsId} product={p} rank={i} onCompare={handleCompare} onApprove={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat: SM-3 analysis results view"`

---

## Task 20: SM-4 Compare Sheets

**Files:** `client/src/views/CompareSheets.jsx`

- [ ] Create `client/src/views/CompareSheets.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getAnalysis, compareSheets } from '../api/analyses.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function CompareSheets() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tdsIdA = searchParams.get('a');
  const tdsIdB = searchParams.get('b');

  const [attributes, setAttributes] = useState(null);
  const [nameA, setNameA] = useState('Sheet A');
  const [nameB, setNameB] = useState('Sheet B');
  const [loading, setLoading] = useState(true);
  const [hideIdentical, setHideIdentical] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tdsIdA || !tdsIdB) { setError('Missing sheet IDs'); setLoading(false); return; }
    getAnalysis(id).then(a => {
      const ranked = a.results?.rankedProducts || [];
      const pA = ranked.find(p => p.tdsId === tdsIdA);
      const pB = ranked.find(p => p.tdsId === tdsIdB);
      if (pA) setNameA(pA.productName);
      if (pB) setNameB(pB.productName);
      // check if compare_results already cached
      if (a.compare_results && a.compare_results.tdsIdA === tdsIdA && a.compare_results.tdsIdB === tdsIdB) {
        setAttributes(a.compare_results.attributes);
        setLoading(false);
      } else {
        compareSheets(id, tdsIdA, tdsIdB)
          .then(r => { setAttributes(r.attributes); setLoading(false); })
          .catch(e => { setError(e.message); setLoading(false); });
      }
    }).catch(e => { setError(e.message); setLoading(false); });
  }, [id, tdsIdA, tdsIdB]);

  const visible = hideIdentical ? (attributes || []).filter(a => a.differs) : (attributes || []);

  const CTA = <button className="btn-primary" onClick={() => navigate(`/analyses/${id}/export`)}>Approve A →</button>;

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb={`Spec Match / Analyses / Compare`} cta={CTA} />
      <h1 className="display" style={{ margin: '32px 0 8px' }}>Compare sheets.</h1>
      {error && <ErrorBanner message={error} />}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
          <input type="checkbox" checked={hideIdentical} onChange={e => setHideIdentical(e.target.checked)} />
          Hide identical
        </label>
      </div>

      {loading ? <LoadingDot messages={['Comparing sheets…']} /> : (
        <table>
          <thead>
            <tr>
              <th>Attribute</th>
              <th>
                <span style={{ background: 'rgba(240,180,41,0.15)', color: 'var(--amber)', borderRadius: 4, padding: '2px 8px', fontSize: 11, marginRight: 6 }}>RECOMMENDED</span>
                {nameA}
              </th>
              <th>{nameB}</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500, width: '25%' }}>{row.attribute}</td>
                <td style={{ width: '30%' }}>{row.sheetA}</td>
                <td style={{ width: '30%' }}>{row.sheetB}</td>
                <td style={{ width: '15%' }}>
                  {row.differs
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--saffron)', display: 'inline-block' }} /> differs</span>
                    : <span style={{ color: 'var(--smoke)', opacity: 0.5 }}>— same</span>}
                </td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', opacity: 0.5 }}>No differences found.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat: SM-4 compare sheets view"`

---

## Task 21: SM-5 Submittal Export

**Files:** `client/src/views/SubmittalExport.jsx`

- [ ] Create `client/src/views/SubmittalExport.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAnalysis, getReportUrl } from '../api/analyses.js';
import { getSettings } from '../api/settings.js';
import Header from '../components/Header.jsx';
import LoadingDot from '../components/LoadingDot.jsx';

export default function SubmittalExport() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    getAnalysis(id).then(setAnalysis);
    getSettings().then(setSettings);
  }, [id]);

  if (!analysis) return <div style={{ padding: 32 }}><LoadingDot messages={['Preparing export…']} /></div>;

  const ranked = analysis.results?.rankedProducts || [];
  const today = new Date().toISOString().slice(0, 10);

  const CTA = (
    <a href={getReportUrl(id)} download>
      <button className="btn-primary">Stamp & download .pdf →</button>
    </a>
  );

  return (
    <div style={{ padding: 32 }}>
      <Header breadcrumb={`Spec Match / Analyses / Export`} cta={CTA} />
      <h1 className="display" style={{ margin: '32px 0 24px' }}>Export package.</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Col 1: Cover sheet preview */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 12 }}>Cover Sheet</div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 22, fontWeight: 600, marginBottom: 8 }}>{settings.company_name || 'Your Company'}</div>
          <div style={{ fontSize: 13, color: 'var(--smoke)', lineHeight: 1.8 }}>
            <div><strong>Project:</strong> {analysis.project_name || '—'}</div>
            <div><strong>Spec File:</strong> {analysis.spec_filename || '—'}</div>
            <div><strong>Date:</strong> {today}</div>
            <div><strong>Products:</strong> {ranked.length}</div>
          </div>
        </div>

        {/* Col 2: Contents page */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 12 }}>Contents</div>
          {ranked.map((p, i) => (
            <div key={p.tdsId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <span>{p.productName}</span>
              <span style={{ color: 'var(--smoke)', opacity: 0.5 }}>p.{i + 2}</span>
            </div>
          ))}
        </div>

        {/* Col 3: First product detail */}
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 12 }}>Top Match</div>
          {ranked[0] ? (
            <>
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 20, marginBottom: 4 }}>{ranked[0].productName}</div>
              <div style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.7, marginBottom: 12 }}>{ranked[0].manufacturer || ''}</div>
              <div style={{ fontSize: 42, fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', color: 'var(--saffron)' }}>{ranked[0].score}%</div>
            </>
          ) : <div style={{ opacity: 0.5 }}>No products</div>}
        </div>
      </div>

      <div style={{ fontSize: 12, color: 'var(--smoke)', opacity: 0.5, textAlign: 'center' }}>
        Citations generated by SpecMatch against project manual · All matches reviewed by preparer
      </div>
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat: SM-5 submittal export view"`

---

## Task 22: SM-6 Library

**Files:** `client/src/views/Library.jsx`

- [ ] Create `client/src/views/Library.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { getTds, uploadTds, deleteTds } from '../api/tds.js';
import { getCategories, createCategory } from '../api/categories.js';
import Header from '../components/Header.jsx';
import DropZone from '../components/DropZone.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import LoadingDot from '../components/LoadingDot.jsx';

export default function Library() {
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterCat, setFilterCat] = useState(null);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCatId, setUploadCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    const [e, c] = await Promise.all([getTds(), getCategories()]);
    setEntries(e); setCategories(c);
    if (!uploadCatId && c.length) setUploadCatId(c[0].id);
  };
  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!uploadFile) { setError('Select a PDF first.'); return; }
    let catId = uploadCatId;
    if (!catId && newCatName) {
      const cat = await createCategory(newCatName);
      catId = cat.id;
    }
    if (!catId) { setError('Select or create a category.'); return; }
    setUploading(true); setError(null);
    try {
      await uploadTds(uploadFile, catId);
      setShowUpload(false); setUploadFile(null); setNewCatName('');
      load();
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    await deleteTds(deleteTarget);
    setDeleteTarget(null); load();
  };

  const visible = entries.filter(e => {
    const matchCat = !filterCat || e.category_id === filterCat;
    const matchSearch = !search || (e.product_name || '').toLowerCase().includes(search.toLowerCase()) || (e.manufacturer || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const countByCat = (cid) => entries.filter(e => e.category_id === cid).length;

  const CTA = <button className="btn-primary" onClick={() => setShowUpload(true)}>+ Upload sheet</button>;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Left filter panel */}
      <div style={{ width: 200, background: 'var(--cream)', borderRight: '1px solid rgba(0,0,0,0.08)', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--smoke)', marginBottom: 12 }}>Categories</div>
        <button
          onClick={() => setFilterCat(null)}
          style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: !filterCat ? 'rgba(240,180,41,0.1)' : 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: !filterCat ? 'var(--saffron)' : 'var(--charcoal)', fontWeight: !filterCat ? 600 : 400 }}
        >
          All <span style={{ opacity: 0.5, fontSize: 12 }}>({entries.length})</span>
        </button>
        {categories.map(c => (
          <button key={c.id}
            onClick={() => setFilterCat(c.id)}
            style={{ width: '100%', textAlign: 'left', padding: '8px 20px', background: filterCat === c.id ? 'rgba(240,180,41,0.1)' : 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: filterCat === c.id ? 'var(--saffron)' : 'var(--charcoal)', fontWeight: filterCat === c.id ? 600 : 400 }}
          >
            {c.name} <span style={{ opacity: 0.5, fontSize: 12 }}>({countByCat(c.id)})</span>
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Header breadcrumb="Spec Match / Library" cta={CTA} />
        <h1 className="display" style={{ margin: '32px 0 24px' }}>Your library.</h1>
        {error && <ErrorBanner message={error} />}

        <input
          type="text" placeholder="Search products or manufacturers…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 420, padding: '9px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 4, fontSize: 14, background: 'var(--cream)', marginBottom: 24 }}
        />

        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="display" style={{ fontSize: 36, marginBottom: 16 }}>No sheets yet.</div>
            <button className="btn-primary" onClick={() => setShowUpload(true)}>Upload your first sheet →</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {visible.map(e => {
              const cat = categories.find(c => c.id === e.category_id);
              return (
                <div key={e.id} className="card" style={{ position: 'relative' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--smoke)', marginBottom: 8 }}>{cat?.name || 'Uncategorized'}</div>
                  <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontSize: 18, color: 'var(--charcoal)', marginBottom: 2 }}>{e.product_name || e.original_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--smoke)', opacity: 0.6, marginBottom: 10 }}>{e.manufacturer || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--smoke)', opacity: 0.4 }}>{e.original_name}</div>
                  <button
                    onClick={() => setDeleteTarget(e.id)}
                    style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--smoke)', opacity: 0.4 }}
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 480 }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 24, marginBottom: 20 }}>Upload TDS sheet</div>
            {error && <ErrorBanner message={error} />}
            <DropZone onFile={setUploadFile} />
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Category</div>
              <select
                value={uploadCatId} onChange={e => setUploadCatId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 4, fontSize: 14, background: 'var(--cream)', marginBottom: 8 }}
              >
                <option value="">— select —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="text" placeholder="Or create new category…"
                value={newCatName} onChange={e => { setNewCatName(e.target.value); setUploadCatId(''); }}
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 4, fontSize: 14, background: 'var(--cream)' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              {uploading ? <LoadingDot messages={['Uploading…']} /> : <button className="btn-primary" onClick={handleUpload}>Upload sheet</button>}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && <ConfirmDialog message="Remove this sheet from the library?" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat: SM-6 library view"`

---

## Task 23: Settings view

**Files:** `client/src/views/Settings.jsx`

- [ ] Create `client/src/views/Settings.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../api/settings.js';
import Header from '../components/Header.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

function Field({ label, value, onChange, type = 'text', readOnly = false }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--smoke)' }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} readOnly={readOnly}
        style={{ width: '100%', maxWidth: 480, padding: '9px 14px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 4, fontSize: 15, background: readOnly ? 'rgba(0,0,0,0.03)' : 'var(--cream)', color: 'var(--charcoal)' }}
      />
    </div>
  );
}

export default function SettingsView() {
  const [s, setS] = useState({ company_name: '', coordinator_name: '', anthropic_api_key: '', deadline_warning_days: '7' });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { getSettings().then(setS).catch(e => setError(e.message)); }, []);

  const set = (key) => (val) => setS(prev => ({ ...prev, [key]: val }));

  const saveAll = async () => {
    try {
      // strip read-only server env vars before saving
      const { tds_dir, ...writeable } = s;
      await updateSettings(writeable);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
  };

  return (
    <div style={{ padding: 32, maxWidth: 640 }}>
      <Header breadcrumb="System / Settings" />
      <h1 className="display" style={{ margin: '32px 0 32px' }}>Settings.</h1>
      {error && <ErrorBanner message={error} />}

      <Field label="Company name" value={s.company_name || ''} onChange={set('company_name')} />
      <Field label="Default coordinator name" value={s.coordinator_name || ''} onChange={set('coordinator_name')} />
      <Field label="Anthropic API key" value={s.anthropic_api_key || ''} onChange={set('anthropic_api_key')} type="password" />
      <Field label="Deadline warning threshold (days)" value={s.deadline_warning_days || '7'} onChange={set('deadline_warning_days')} />
      <Field label="TDS storage path" value={s.tds_dir || './server/uploads/tds'} onChange={() => {}} readOnly />

      <div style={{ marginTop: 8 }}>
        <button className="btn-primary" onClick={saveAll} style={{ fontSize: 15, padding: '11px 28px' }}>Save settings</button>
        {saved && <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--amber)' }}>Saved ✓</span>}
      </div>
    </div>
  );
}
```

- [ ] Commit: `git commit -m "feat: settings view"`

---

## Task 24: Final integration smoke test

- [ ] Start the server: `cd server && npm run dev`

- [ ] Start the client in another terminal: `cd client && npm run dev`

- [ ] Open `http://localhost:5173` in a browser. Verify:
  - [ ] Sidebar renders with SM · LIVE badge
  - [ ] Navigate to `/library` → "No sheets yet." empty state
  - [ ] Navigate to `/analyses` → "No analyses yet." empty state
  - [ ] Navigate to `/settings` → Settings fields render
  - [ ] Enter API key in settings, save
  - [ ] Upload a TDS PDF in Library → card appears
  - [ ] Navigate to New Analysis → complete all 3 steps → click Run
  - [ ] Analysis results render with ranked product cards
  - [ ] Click "Stamp & Submit →" → export preview renders
  - [ ] Click "Stamp & download .pdf →" → PDF downloads

- [ ] Run all server tests: `cd server && npm test`
  Expected: all pass

- [ ] Run all client tests: `cd client && npm test`
  Expected: all pass

- [ ] Final commit:
```bash
git add -A
git commit -m "feat: SpecMatch Phase 1 complete — spec match module + foundation"
```

---

## Notes for Phase 2

Phase 2 spec will be written separately. It adds:
- `server/services/submittalsAI.js` (4 functions)
- All `/api/projects/...` routes
- Submittal package PDF generation in `reportService.js`
- 7 Submittals views (SUB-1 through SUB-7)
- Audit trail
- The Submittals section in the sidebar becomes active
