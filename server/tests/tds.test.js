const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../index');
const { initSchema } = require('../db/schema');
const db = require('../db/db');

jest.mock('../services/pdfParser', () => ({ extractText: async () => 'mock pdf text content' }));
jest.mock('../services/claudeService', () => ({
  extractProductInfo: async () => ({ product_name: 'MockProduct', manufacturer: 'MockCo' }),
  analyzeSpec: jest.fn(),
  compareTwoSheets: jest.fn(),
  scoreToRating: (s) => s >= 85 ? 'Excellent' : s >= 65 ? 'Good' : s >= 40 ? 'Partial' : 'Does Not Meet',
}));

beforeAll(() => {
  initSchema();
  db.prepare("INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('cat1', 'Air Barrier', '2024-01-01')").run();
});

let tdsId;

test('POST /api/tds/upload accepts a PDF and creates entry', async () => {
  const fakePdf = Buffer.from('%PDF-1.4 fake content');
  const res = await request(app)
    .post('/api/tds/upload')
    .field('category_id', 'cat1')
    .attach('file', fakePdf, 'test-sheet.pdf');
  expect(res.status).toBe(201);
  expect(res.body.id).toBeDefined();
  expect(res.body.product_name).toBe('MockProduct');
  expect(res.body.manufacturer).toBe('MockCo');
  tdsId = res.body.id;
});

test('GET /api/tds lists entries', async () => {
  const res = await request(app).get('/api/tds');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.find(t => t.id === tdsId)).toBeDefined();
});

test('DELETE /api/tds/:id removes entry', async () => {
  const res = await request(app).delete(`/api/tds/${tdsId}`);
  expect(res.status).toBe(200);
  const check = await request(app).get('/api/tds');
  expect(check.body.find(t => t.id === tdsId)).toBeUndefined();
});
