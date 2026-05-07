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
const revisionsDir = resolveFromRoot(process.env.REVISIONS_DIR, './server/uploads/revisions');
fs.mkdirSync(tdsDir, { recursive: true });
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(revisionsDir, { recursive: true });

// stats endpoint (before other routes to avoid :id conflicts)
app.get('/api/stats', (req, res) => {
  const db = require('./db/db');
  const analysesCount = db.prepare('SELECT COUNT(*) as n FROM analyses').get().n;
  const tdsCount = db.prepare('SELECT COUNT(*) as n FROM tds_entries').get().n;
  const lastSync = db.prepare("SELECT value FROM settings WHERE key='last_tds_upload'").get();
  const projectsCount = db.prepare('SELECT COUNT(*) as n FROM projects').get().n;
  const openSubmittalsCount = db.prepare("SELECT COUNT(*) as n FROM submittal_items WHERE status NOT IN ('approved','approved_as_noted')").get().n;
  res.json({ analysesCount, tdsCount, lastTdsUpload: lastSync ? lastSync.value : null, projectsCount, openSubmittalsCount });
});

// routes
app.use('/api/settings', require('./routes/settings'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/tds', require('./routes/tds'));
app.use('/api', require('./routes/analyses'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/submittals', require('./routes/submittals'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/ai', require('./routes/ai'));

// init db
initSchema();
if (process.env.NODE_ENV !== 'test') runMigration();

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`SpecMatch server on :${PORT}`));
}

module.exports = app;
