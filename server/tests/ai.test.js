jest.mock('../services/submittalsAI', () => ({
  summarizeRejection: jest.fn().mockResolvedValue({ summary: 'Fix firestop', actionItems: ['Add firestop detail'] }),
  compareResubmittal: jest.fn().mockResolvedValue({ addressed: ['firestop'], outstanding: [], summary: 'All resolved' }),
  draftComplianceStatement: jest.fn().mockResolvedValue({ statement: 'Product meets spec.' }),
}));

const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');
const db = require('../db/db');

beforeAll(() => { initSchema(); });
afterEach(() => {
  db.exec('DELETE FROM submittal_revisions');
  db.exec('DELETE FROM submittal_items');
  db.exec('DELETE FROM projects');
});

test('POST /api/ai/summarize-rejection returns summary and actionItems', async () => {
  const res = await request(app).post('/api/ai/summarize-rejection').send({ reviewerComments: 'Missing firestop detail' });
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('summary');
  expect(res.body).toHaveProperty('actionItems');
});

test('POST /api/ai/summarize-rejection returns 400 without reviewerComments', async () => {
  const res = await request(app).post('/api/ai/summarize-rejection').send({});
  expect(res.status).toBe(400);
});

test('POST /api/ai/compare-resubmittal returns comparison', async () => {
  const pid = require('crypto').randomUUID();
  db.prepare('INSERT INTO projects (id, name, created_at) VALUES (?,?,?)').run(pid, 'P', new Date().toISOString());
  const iid = require('crypto').randomUUID();
  db.prepare('INSERT INTO submittal_items (id, project_id, scope_item, spec_section, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?)').run(iid, pid, 'Roof', '07', 'submitted', new Date().toISOString(), new Date().toISOString());
  const ra = require('crypto').randomUUID();
  const rb = require('crypto').randomUUID();
  db.prepare('INSERT INTO submittal_revisions (id, submittal_item_id, revision_number, reviewer_comments, uploaded_files, created_at) VALUES (?,?,?,?,?,?)').run(ra, iid, 1, 'Fix A', '[]', new Date().toISOString());
  db.prepare('INSERT INTO submittal_revisions (id, submittal_item_id, revision_number, reviewer_comments, uploaded_files, created_at) VALUES (?,?,?,?,?,?)').run(rb, iid, 2, 'Fix B', '[]', new Date().toISOString());
  const res = await request(app).post('/api/ai/compare-resubmittal').send({ revisionIdA: ra, revisionIdB: rb });
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('addressed');
  expect(res.body).toHaveProperty('outstanding');
  expect(res.body).toHaveProperty('summary');
});

test('POST /api/ai/compare-resubmittal returns 400 without required fields', async () => {
  const res = await request(app).post('/api/ai/compare-resubmittal').send({ revisionIdA: 'x' });
  expect(res.status).toBe(400);
});

test('POST /api/ai/draft-compliance returns statement', async () => {
  const res = await request(app).post('/api/ai/draft-compliance').send({
    specSection: '07 2719', specText: 'Air barrier system...', productName: 'AirGuard', manufacturer: 'GCP'
  });
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('statement');
});

test('POST /api/ai/draft-compliance returns 400 without specSection', async () => {
  const res = await request(app).post('/api/ai/draft-compliance').send({ productName: 'AirGuard' });
  expect(res.status).toBe(400);
});

test('POST /api/ai/compare-resubmittal returns 404 when revision not found', async () => {
  const res = await request(app).post('/api/ai/compare-resubmittal').send({
    revisionIdA: 'nonexistent-a', revisionIdB: 'nonexistent-b'
  });
  expect(res.status).toBe(404);
});
