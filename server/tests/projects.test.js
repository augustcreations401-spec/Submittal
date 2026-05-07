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

  test('PUT /api/projects/:id logs project_updated audit event', async () => {
    const create = await request(app).post('/api/projects').send({ name: 'Audit PUT Test', gc_name: 'GC' });
    await request(app).put(`/api/projects/${create.body.id}`).send({ name: 'Updated Name' });
    const log = db.prepare("SELECT * FROM audit_log WHERE action='project_updated'").get();
    expect(log).toBeTruthy();
  });

  test('DELETE /api/projects/:id logs project_deleted audit event', async () => {
    const create = await request(app).post('/api/projects').send({ name: 'Audit DEL Test', gc_name: 'GC' });
    await request(app).delete(`/api/projects/${create.body.id}`);
    const log = db.prepare("SELECT * FROM audit_log WHERE action='project_deleted'").get();
    expect(log).toBeTruthy();
  });
});

describe('Items CRUD', () => {
  let projectId;
  beforeEach(async () => {
    const res = await request(app).post('/api/projects').send({ name: 'Items Project', gc_name: 'GC' });
    projectId = res.body.id;
  });

  test('POST /api/projects/:id/items creates item', async () => {
    const res = await request(app).post(`/api/projects/${projectId}/items`).send({
      scope_item: 'Air Barrier System', spec_section: '07 2719',
      spec_section_title: 'Air Barriers', deadline: '2026-08-01'
    });
    expect(res.status).toBe(201);
    expect(res.body.scope_item).toBe('Air Barrier System');
    expect(res.body.status).toBe('not_yet_submitted');
  });

  test('GET /api/projects/:id/items returns items', async () => {
    await request(app).post(`/api/projects/${projectId}/items`).send({ scope_item: 'Item A', spec_section: '07 0000' });
    const res = await request(app).get(`/api/projects/${projectId}/items`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /api/projects/:id/items/:itemId returns item with revisions array', async () => {
    const create = await request(app).post(`/api/projects/${projectId}/items`).send({ scope_item: 'Item B', spec_section: '07 0000' });
    const res = await request(app).get(`/api/projects/${projectId}/items/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.revisions)).toBe(true);
  });

  test('PUT /api/projects/:id/items/:itemId updates status', async () => {
    const create = await request(app).post(`/api/projects/${projectId}/items`).send({ scope_item: 'Item C', spec_section: '07 0000' });
    const res = await request(app).put(`/api/projects/${projectId}/items/${create.body.id}`).send({ status: 'submitted' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('submitted');
  });

  test('PUT status change logs status_changed audit event', async () => {
    const create = await request(app).post(`/api/projects/${projectId}/items`).send({ scope_item: 'Item D', spec_section: '07 0000' });
    await request(app).put(`/api/projects/${projectId}/items/${create.body.id}`).send({ status: 'submitted' });
    const log = db.prepare("SELECT * FROM audit_log WHERE action='status_changed'").get();
    expect(log).toBeTruthy();
    const detail = JSON.parse(log.detail);
    expect(detail.from).toBe('not_yet_submitted');
    expect(detail.to).toBe('submitted');
  });

  test('DELETE /api/projects/:id/items/:itemId deletes item', async () => {
    const create = await request(app).post(`/api/projects/${projectId}/items`).send({ scope_item: 'Del Item', spec_section: '07 0000' });
    const del = await request(app).delete(`/api/projects/${projectId}/items/${create.body.id}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/projects/${projectId}/items/${create.body.id}`);
    expect(get.status).toBe(404);
  });
});

describe('Revisions', () => {
  let projectId, itemId;
  beforeEach(async () => {
    const p = await request(app).post('/api/projects').send({ name: 'Rev Project', gc_name: 'GC' });
    projectId = p.body.id;
    const i = await request(app).post(`/api/projects/${projectId}/items`).send({ scope_item: 'Roof System', spec_section: '07 5216' });
    itemId = i.body.id;
  });

  test('POST revisions creates revision with revision_number=1', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/items/${itemId}/revisions`)
      .field('submitted_date', '2026-07-01')
      .field('submitted_by', 'Thomas')
      .field('response_status', 'submitted');
    expect(res.status).toBe(201);
    expect(res.body.revision_number).toBe(1);
  });

  test('second revision auto-increments revision_number', async () => {
    await request(app).post(`/api/projects/${projectId}/items/${itemId}/revisions`).field('submitted_by', 'Thomas');
    const res = await request(app).post(`/api/projects/${projectId}/items/${itemId}/revisions`).field('submitted_by', 'Thomas');
    expect(res.body.revision_number).toBe(2);
  });

  test('DELETE revision removes the revision', async () => {
    const create = await request(app).post(`/api/projects/${projectId}/items/${itemId}/revisions`).field('submitted_by', 'T');
    const del = await request(app).delete(`/api/projects/${projectId}/items/${itemId}/revisions/${create.body.id}`);
    expect(del.status).toBe(200);
    const item = await request(app).get(`/api/projects/${projectId}/items/${itemId}`);
    expect(item.body.revisions).toHaveLength(0);
  });

  test('POST .../package streams PDF with correct content-type', async () => {
    await request(app).post(`/api/projects/${projectId}/items/${itemId}/revisions`).field('submitted_by', 'T');
    const res = await request(app)
      .post(`/api/projects/${projectId}/items/${itemId}/package`)
      .send({ selectedFiles: [], complianceStatement: 'Meets spec.' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
  });
});
