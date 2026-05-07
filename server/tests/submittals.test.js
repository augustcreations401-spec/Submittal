const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');
const db = require('../db/db');

beforeAll(() => { initSchema(); });
afterEach(() => {
  db.exec('DELETE FROM audit_log');
  db.exec('DELETE FROM submittal_revisions');
  db.exec('DELETE FROM submittal_items');
  db.exec('DELETE FROM projects');
});

function seedProject() {
  const id = require('crypto').randomUUID();
  db.prepare('INSERT INTO projects (id, name, gc_name, created_at) VALUES (?,?,?,?)').run(id, 'P', 'G', new Date().toISOString());
  return id;
}

function seedItem(projectId, status = 'submitted') {
  const id = require('crypto').randomUUID();
  db.prepare('INSERT INTO submittal_items (id, project_id, scope_item, spec_section, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)').run(id, projectId, 'Roof', '07 5216', status, new Date().toISOString(), new Date().toISOString());
  return id;
}

describe('GET /api/submittals', () => {
  test('returns all items joined with project', async () => {
    const pid = seedProject();
    seedItem(pid);
    const res = await request(app).get('/api/submittals');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('project_name');
  });

  test('filters by status', async () => {
    const pid = seedProject();
    seedItem(pid, 'approved');
    seedItem(pid, 'submitted');
    const res = await request(app).get('/api/submittals?status=approved');
    expect(res.body.every(i => i.status === 'approved')).toBe(true);
  });

  test('filters by project_id', async () => {
    const pid1 = seedProject();
    const pid2 = seedProject();
    seedItem(pid1);
    seedItem(pid2);
    const res = await request(app).get(`/api/submittals?project_id=${pid1}`);
    expect(res.body.every(i => i.project_id === pid1)).toBe(true);
  });
});

describe('GET /api/audit', () => {
  test('returns audit log entries', async () => {
    db.prepare('INSERT INTO audit_log (id, action, created_at) VALUES (?,?,?)').run('a1', 'project_created', new Date().toISOString());
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('filters by project_id', async () => {
    db.prepare('INSERT INTO audit_log (id, project_id, action, created_at) VALUES (?,?,?,?)').run('a2', 'proj-x', 'item_added', new Date().toISOString());
    db.prepare('INSERT INTO audit_log (id, project_id, action, created_at) VALUES (?,?,?,?)').run('a3', 'proj-y', 'item_added', new Date().toISOString());
    const res = await request(app).get('/api/audit?project_id=proj-x');
    expect(res.body.every(e => e.project_id === 'proj-x')).toBe(true);
  });
});
