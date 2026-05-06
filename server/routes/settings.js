const router = require('express').Router();
const db = require('../db/db');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const obj = Object.fromEntries(rows.map(r => [r.key, r.value]));
  // expose server-only env vars as read-only settings
  obj.tds_dir = process.env.TDS_DIR || './server/uploads/tds';
  res.json(obj);
});

router.put('/', (req, res) => {
  const { key, value, updates } = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  if (updates && typeof updates === 'object') {
    const tx = db.transaction(() => {
      for (const [k, v] of Object.entries(updates)) upsert.run(k, String(v));
    });
    tx();
  } else if (key) {
    upsert.run(key, String(value ?? ''));
  }
  res.json({ ok: true });
});

module.exports = router;
