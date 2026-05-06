const router = require('express').Router();
const db = require('../db/db');
const { generateReport } = require('../services/reportService');

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });

  const settings = Object.fromEntries(
    db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value])
  );

  let results = {};
  try { results = JSON.parse(row.results || '{}'); } catch {}

  const analysis = { ...row, results };
  const doc = generateReport(analysis, settings);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="analysis-${row.id.slice(0, 8)}.pdf"`);
  doc.pipe(res);
  doc.end();
});

module.exports = router;
