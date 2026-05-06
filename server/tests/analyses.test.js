const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');
const db = require('../db/db');

jest.mock('../services/pdfParser', () => ({ extractText: async () => 'Air barrier shall have perm rating of 0.02 or less.' }));
jest.mock('../services/claudeService', () => ({
  analyzeSpec: async () => ({
    rankedProducts: [{ tdsId: 'tds-ana1', productName: 'AeroBarrier', rating: 'Excellent', score: 92, meets: ['perm rating'], shortfalls: [], exceedances: [] }]
  }),
  compareTwoSheets: async () => ({ attributes: [{ attribute: 'Perm Rating', sheetA: '0.01', sheetB: '0.05', differs: true }] }),
  extractProductInfo: async () => ({ product_name: 'MockProd', manufacturer: 'MockCo' }),
  scoreToRating: (s) => s >= 85 ? 'Excellent' : s >= 65 ? 'Good' : s >= 40 ? 'Partial' : 'Does Not Meet',
}));

beforeAll(() => {
  initSchema();
  db.prepare("INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat-ana1', 'Air Barrier', '2024-01-01')").run();
  db.prepare("INSERT OR IGNORE INTO tds_entries (id, category_id, original_name, product_name, file_path, extracted_text, created_at) VALUES ('tds-ana1', 'cat-ana1', 'test.pdf', 'AeroBarrier', '/tmp/test.pdf', 'mock tds text', '2024-01-01')").run();
});

let analysisId;

test('POST /api/analysis runs analysis and returns id', async () => {
  const fakePdf = Buffer.from('%PDF-1.4 fake spec');
  const res = await request(app)
    .post('/api/analysis')
    .field('projectName', 'Test Project')
    .field('categoryIds', JSON.stringify(['cat-ana1']))
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

test('GET /api/analyses/:id returns full analysis with results', async () => {
  const res = await request(app).get(`/api/analyses/${analysisId}`);
  expect(res.status).toBe(200);
  expect(res.body.results.rankedProducts[0].tdsId).toBe('tds-ana1');
  expect(res.body.results.rankedProducts[0].score).toBe(92);
});

test('POST /api/analyses/:id/compare returns attribute table', async () => {
  const res = await request(app)
    .post(`/api/analyses/${analysisId}/compare`)
    .send({ tdsIdA: 'tds-ana1', tdsIdB: 'tds-ana1' });
  expect(res.status).toBe(200);
  expect(res.body.attributes[0].attribute).toBe('Perm Rating');
  expect(res.body.attributes[0].differs).toBe(true);
});

test('DELETE /api/analyses/:id removes analysis', async () => {
  const res = await request(app).delete(`/api/analyses/${analysisId}`);
  expect(res.status).toBe(200);
  const check = await request(app).get(`/api/analyses/${analysisId}`);
  expect(check.status).toBe(404);
});
