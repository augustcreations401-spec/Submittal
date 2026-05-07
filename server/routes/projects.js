const router = require('express').Router();
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../db/db');

const projectRoot = path.join(__dirname, '../../');

function getRevisionsDir() {
  const raw = process.env.REVISIONS_DIR || './server/uploads/revisions';
  return path.isAbsolute(raw) ? raw : path.join(projectRoot, raw);
}

function logAudit(projectId, itemId, action, detail) {
  db.prepare('INSERT INTO audit_log (id, project_id, item_id, action, detail, created_at) VALUES (?,?,?,?,?,?)')
    .run(randomUUID(), projectId || null, itemId || null, action, detail ? JSON.stringify(detail) : null, new Date().toISOString());
}

// GET /api/projects
router.get('/', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  const withCounts = projects.map(p => {
    const itemCount = db.prepare('SELECT COUNT(*) as n FROM submittal_items WHERE project_id=?').get(p.id).n;
    const nearest = db.prepare('SELECT MIN(deadline) as d FROM submittal_items WHERE project_id=? AND deadline IS NOT NULL').get(p.id);
    const statuses = db.prepare('SELECT status, COUNT(*) as n FROM submittal_items WHERE project_id=? GROUP BY status').all(p.id);
    return { ...p, itemCount, nearestDeadline: nearest?.d || null, statuses };
  });
  res.json(withCounts);
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, gc_name, project_number, bid_date, contract_date } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare('INSERT INTO projects (id, name, gc_name, project_number, bid_date, contract_date, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, name, gc_name || null, project_number || null, bid_date || null, contract_date || null, now);
  logAudit(id, null, 'project_created', { name });
  res.status(201).json(db.prepare('SELECT * FROM projects WHERE id=?').get(id));
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  const items = db.prepare('SELECT * FROM submittal_items WHERE project_id=? ORDER BY created_at ASC').all(req.params.id);
  res.json({ ...project, items });
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  const fields = ['name', 'gc_name', 'project_number', 'bid_date', 'contract_date'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (Object.keys(updates).length === 0) return res.json(project);
  const set = Object.keys(updates).map(k => `${k}=?`).join(', ');
  db.prepare(`UPDATE projects SET ${set} WHERE id=?`).run(...Object.values(updates), req.params.id);
  logAudit(req.params.id, null, 'project_updated', updates);
  res.json(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id));
});

// DELETE /api/projects/:id — cascade: items, revisions, revision files
router.delete('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  const revisionsBase = getRevisionsDir();
  const items = db.prepare('SELECT id FROM submittal_items WHERE project_id=?').all(req.params.id);
  for (const item of items) {
    const revisions = db.prepare('SELECT id FROM submittal_revisions WHERE submittal_item_id=?').all(item.id);
    for (const rev of revisions) {
      const dir = path.join(revisionsBase, rev.id);
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    }
    db.prepare('DELETE FROM submittal_revisions WHERE submittal_item_id=?').run(item.id);
  }
  db.prepare('DELETE FROM submittal_items WHERE project_id=?').run(req.params.id);
  db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  logAudit(req.params.id, null, 'project_deleted', { name: project.name });
  res.json({ ok: true });
});

module.exports = router;
