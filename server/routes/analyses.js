const router = require('express').Router();
const multer = require('multer');
const { randomUUID } = require('crypto');
const db = require('../db/db');
const { extractText } = require('../services/pdfParser');
const { analyzeSpec, compareTwoSheets } = require('../services/claudeService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/analysis', upload.single('specFile'), async (req, res) => {
  try {
    const { projectName, categoryIds: rawCatIds } = req.body;
    const categoryIds = JSON.parse(rawCatIds || '[]');
    const specText = await extractText(req.file.buffer);

    const tdsRows = categoryIds.length
      ? db.prepare(`SELECT id, product_name, extracted_text FROM tds_entries WHERE category_id IN (${categoryIds.map(() => '?').join(',')})`)
          .all(...categoryIds)
      : db.prepare('SELECT id, product_name, extracted_text FROM tds_entries').all();

    const products = tdsRows.map(r => ({ tdsId: r.id, productName: r.product_name, tdsText: r.extracted_text }));
    const apiKey = db.prepare("SELECT value FROM settings WHERE key='anthropic_api_key'").get()?.value;
    const results = await analyzeSpec(specText, products, apiKey);

    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO analyses (id, project_name, spec_filename, spec_text, category_ids, results, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, projectName, req.file.originalname, specText, JSON.stringify(categoryIds), JSON.stringify(results), now);
    res.status(201).json({ id, project_name: projectName, results, created_at: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analyses', (req, res) => {
  const rows = db.prepare('SELECT id, project_name, spec_filename, category_ids, results, created_at FROM analyses ORDER BY created_at DESC').all();
  const result = rows.map(r => {
    let topMatch = null, topScore = null;
    try {
      const parsed = JSON.parse(r.results || '{}');
      const top = parsed.rankedProducts?.[0];
      if (top) { topMatch = top.productName; topScore = top.score; }
    } catch {}
    return { id: r.id, project_name: r.project_name, spec_filename: r.spec_filename, category_ids: JSON.parse(r.category_ids || '[]'), created_at: r.created_at, topMatch, topScore };
  });
  res.json(result);
});

router.get('/analyses/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM analyses WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json({ ...row, category_ids: JSON.parse(row.category_ids || '[]'), results: JSON.parse(row.results || '{}'), compare_results: row.compare_results ? JSON.parse(row.compare_results) : null });
});

router.delete('/analyses/:id', (req, res) => {
  db.prepare('DELETE FROM analyses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/analyses/:id/compare', async (req, res) => {
  try {
    const { tdsIdA, tdsIdB } = req.body;
    const analysis = db.prepare('SELECT spec_text FROM analyses WHERE id = ?').get(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    const tdsA = db.prepare('SELECT extracted_text FROM tds_entries WHERE id = ?').get(tdsIdA);
    const tdsB = db.prepare('SELECT extracted_text FROM tds_entries WHERE id = ?').get(tdsIdB);
    if (!tdsA || !tdsB) return res.status(404).json({ error: 'TDS not found' });
    const apiKey = db.prepare("SELECT value FROM settings WHERE key='anthropic_api_key'").get()?.value;
    const compareResult = await compareTwoSheets(tdsA.extracted_text, tdsB.extracted_text, analysis.spec_text || '', apiKey);
    db.prepare('UPDATE analyses SET compare_results = ? WHERE id = ?').run(JSON.stringify({ tdsIdA, tdsIdB, ...compareResult }), req.params.id);
    res.json(compareResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
