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

test('PUT /api/settings supports updates object', async () => {
  const res = await request(app).put('/api/settings').send({ updates: { coordinator_name: 'Alex', deadline_warning_days: '5' } });
  expect(res.status).toBe(200);
  const check = await request(app).get('/api/settings');
  expect(check.body.coordinator_name).toBe('Alex');
  expect(check.body.deadline_warning_days).toBe('5');
});

test('GET /api/stats returns counts', async () => {
  const res = await request(app).get('/api/stats');
  expect(res.status).toBe(200);
  expect(typeof res.body.analysesCount).toBe('number');
  expect(typeof res.body.tdsCount).toBe('number');
});

test('GET /api/settings includes tds_dir', async () => {
  const res = await request(app).get('/api/settings');
  expect(res.body.tds_dir).toBeDefined();
});
