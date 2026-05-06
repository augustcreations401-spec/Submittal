const router = require('express').Router();
const db = require('../db/db');
const { randomUUID } = require('crypto');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO categories (id, name, created_at) VALUES (?, ?, ?)').run(id, name, now);
  res.status(201).json({ id, name, created_at: now });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
