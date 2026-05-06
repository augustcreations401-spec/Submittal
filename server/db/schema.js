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
