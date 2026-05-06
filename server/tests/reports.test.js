const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');
const db = require('../db/db');

beforeAll(() => {
  initSchema();
  db.prepare(`INSERT OR IGNORE INTO analyses (id, project_name, spec_filename, category_ids, results, created_at)
    VALUES ('rpt-test-1', 'Report Test Project', 'spec.pdf', '[]', '{"rankedProducts":[{"tdsId":"t1","productName":"TestProd","score":90,"rating":"Excellent","meets":["perm"],"shortfalls":[],"exceedances":[]}]}', '2024-01-01T00:00:00.000Z')`).run();
});

test('GET /api/reports/:id streams a PDF', async () => {
  const res = await request(app).get('/api/reports/rpt-test-1').buffer(true).parse((res, callback) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(chunks)));
  });
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toContain('application/pdf');
  // PDF starts with %PDF
  expect(res.body.toString('utf8', 0, 4)).toBe('%PDF');
});

test('GET /api/reports/:id returns 404 for unknown id', async () => {
  const res = await request(app).get('/api/reports/nonexistent-id');
  expect(res.status).toBe(404);
});
