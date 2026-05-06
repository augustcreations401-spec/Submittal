const request = require('supertest');
const app = require('../index');
const { initSchema } = require('../db/schema');

beforeAll(() => initSchema());

let catId;

test('POST /api/categories creates a category', async () => {
  const res = await request(app).post('/api/categories').send({ name: 'Air Barrier' });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Air Barrier');
  expect(res.body.id).toBeDefined();
  catId = res.body.id;
});

test('GET /api/categories lists categories', async () => {
  const res = await request(app).get('/api/categories');
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.find(c => c.id === catId)).toBeDefined();
});

test('POST /api/categories returns 400 without name', async () => {
  const res = await request(app).post('/api/categories').send({});
  expect(res.status).toBe(400);
});

test('DELETE /api/categories/:id removes category', async () => {
  const res = await request(app).delete(`/api/categories/${catId}`);
  expect(res.status).toBe(200);
  const check = await request(app).get('/api/categories');
  expect(check.body.find(c => c.id === catId)).toBeUndefined();
});
