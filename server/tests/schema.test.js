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

test('audit_log table exists', () => {
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'").get();
  expect(row).toBeTruthy();
});

test('submittal_revisions has uploaded_files column', () => {
  const cols = db.prepare("PRAGMA table_info(submittal_revisions)").all();
  const names = cols.map(c => c.name);
  expect(names).toContain('uploaded_files');
  expect(names).not.toContain('package_docs');
});
