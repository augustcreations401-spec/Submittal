const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');
const db = require('../db/db');

beforeAll(() => { initSchema(); });
afterEach(() => {
  db.exec('DELETE FROM audit_log');
  db.exec('DELETE FROM submittal_items');
  db.exec('DELETE FROM projects');
});

describe('Projects CRUD', () => {
  test('POST /api/projects creates project', async () => {
    const res = await request(app).post('/api/projects').send({
      name: 'Test Project', gc_name: 'GC Corp', project_number: 'P-001',
      bid_date: '2026-06-01', contract_date: '2026-07-01'
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Project');
    expect(res.body.id).toBeTruthy();
  });

  test('GET /api/projects returns list', async () => {
    await request(app).post('/api/projects').send({ name: 'Project A', gc_name: 'GC' });
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/projects/:id returns project with items array', async () => {
    const create = await request(app).post('/api/projects').send({ name: 'Project B', gc_name: 'GC' });
    const res = await request(app).get(`/api/projects/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(create.body.id);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('GET /api/projects/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/projects/nonexistent-id');
    expect(res.status).toBe(404);
  });

  test('PUT /api/projects/:id updates project', async () => {
    const create = await request(app).post('/api/projects').send({ name: 'Old Name', gc_name: 'GC' });
    const res = await request(app).put(`/api/projects/${create.body.id}`).send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
  });

  test('DELETE /api/projects/:id deletes project', async () => {
    const create = await request(app).post('/api/projects').send({ name: 'Del Me', gc_name: 'GC' });
    const del = await request(app).delete(`/api/projects/${create.body.id}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/projects/${create.body.id}`);
    expect(get.status).toBe(404);
  });

  test('POST /api/projects logs audit event', async () => {
    await request(app).post('/api/projects').send({ name: 'Audit Test', gc_name: 'GC' });
    const log = db.prepare("SELECT * FROM audit_log WHERE action='project_created'").get();
    expect(log).toBeTruthy();
  });
});
