require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initSchema, runMigration } = require('./db/schema');

const app = express();
app.use(cors());
app.use(express.json());

const projectRoot = path.join(__dirname, '..');

function resolveFromRoot(p, fallback) {
  const resolved = p || fallback;
  return path.isAbsolute(resolved) ? resolved : path.join(projectRoot, resolved);
}

// ensure upload + report dirs exist
const tdsDir = resolveFromRoot(process.env.TDS_DIR, './server/uploads/tds');
const reportsDir = resolveFromRoot(process.env.REPORTS_DIR, './server/reports');
fs.mkdirSync(tdsDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });

// stats endpoint (before other routes to avoid :id conflicts)
app.get('/api/stats', (req, res) => {
  const db = require('./db/db');
  const analysesCount = db.prepare('SELECT COUNT(*) as n FROM analyses').get().n;
  const tdsCount = db.prepare('SELECT COUNT(*) as n FROM tds_entries').get().n;
  const lastSync = db.prepare("SELECT value FROM settings WHERE key='last_tds_upload'").get();
  res.json({ analysesCount, tdsCount, lastTdsUpload: lastSync ? lastSync.value : null });
});

// routes
app.use('/api/settings', require('./routes/settings'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tds', require('./routes/tds'));
app.use('/api', require('./routes/analyses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/projects', require('./routes/projects'));

// init db
initSchema();
if (process.env.NODE_ENV !== 'test') runMigration();

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`SpecMatch server on :${PORT}`));
}

module.exports = app;
