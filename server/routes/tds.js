const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const db = require('../db/db');
const { extractText } = require('../services/pdfParser');
const { extractProductInfo } = require('../services/claudeService');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.env.TDS_DIR || './server/uploads/tds');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM tds_entries ORDER BY created_at DESC').all());
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { category_id } = req.body;
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const extractedText = await extractText(buffer);
    const { product_name, manufacturer } = await extractProductInfo(extractedText);
    const fallbackName = path.basename(req.file.originalname, '.pdf').replace(/[-_]/g, ' ');
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(`INSERT INTO tds_entries (id, category_id, original_name, product_name, manufacturer, file_path, extracted_text, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, category_id || null, req.file.originalname, product_name || fallbackName, manufacturer || '', filePath, extractedText, now);

    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_tds_upload', ?)").run(now);

    res.status(201).json({ id, category_id, original_name: req.file.originalname, product_name: product_name || fallbackName, manufacturer: manufacturer || '', file_path: filePath, created_at: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tds_entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
