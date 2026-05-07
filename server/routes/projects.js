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

  // collect all revision dirs to delete before touching DB
  const items = db.prepare('SELECT id FROM submittal_items WHERE project_id=?').all(req.params.id);
  const revDirsToDelete = [];
  for (const item of items) {
    const revisions = db.prepare('SELECT id FROM submittal_revisions WHERE submittal_item_id=?').all(item.id);
    for (const rev of revisions) {
      revDirsToDelete.push(path.join(revisionsBase, rev.id));
    }
  }

  // delete DB records in a transaction
  db.transaction(() => {
    for (const item of items) {
      db.prepare('DELETE FROM submittal_revisions WHERE submittal_item_id=?').run(item.id);
    }
    db.prepare('DELETE FROM submittal_items WHERE project_id=?').run(req.params.id);
    db.prepare('DELETE FROM projects WHERE id=?').run(req.params.id);
  })();

  // delete files after DB is clean
  for (const dir of revDirsToDelete) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }

  logAudit(req.params.id, null, 'project_deleted', { name: project.name });
  res.json({ ok: true });
});

// GET /api/projects/:id/items
router.get('/:id/items', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  res.json(db.prepare('SELECT * FROM submittal_items WHERE project_id=? ORDER BY created_at ASC').all(req.params.id));
});

// POST /api/projects/:id/items
router.post('/:id/items', (req, res) => {
  const project = db.prepare('SELECT id FROM projects WHERE id=?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'not found' });
  const { scope_item, spec_section, spec_section_title, required_docs, deadline, notes, linked_analysis_id, assigned_to } = req.body;
  if (!scope_item) return res.status(400).json({ error: 'scope_item required' });
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`INSERT INTO submittal_items (id, project_id, scope_item, spec_section, spec_section_title, required_docs, deadline, notes, linked_analysis_id, assigned_to, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,'not_yet_submitted',?,?)`)
    .run(id, req.params.id, scope_item, spec_section || null, spec_section_title || null,
         required_docs ? JSON.stringify(required_docs) : null, deadline || null, notes || null,
         linked_analysis_id || null, assigned_to || null, now, now);
  logAudit(req.params.id, id, 'item_added', { scope_item });
  res.status(201).json(db.prepare('SELECT * FROM submittal_items WHERE id=?').get(id));
});

// GET /api/projects/:id/items/:itemId
router.get('/:id/items/:itemId', (req, res) => {
  const item = db.prepare('SELECT * FROM submittal_items WHERE id=? AND project_id=?').get(req.params.itemId, req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  const revisions = db.prepare('SELECT * FROM submittal_revisions WHERE submittal_item_id=? ORDER BY revision_number ASC').all(req.params.itemId);
  res.json({ ...item, revisions });
});

// PUT /api/projects/:id/items/:itemId
router.put('/:id/items/:itemId', (req, res) => {
  const item = db.prepare('SELECT * FROM submittal_items WHERE id=? AND project_id=?').get(req.params.itemId, req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  const fields = ['status', 'deadline', 'notes', 'assigned_to'];
  const updates = { updated_at: new Date().toISOString() };
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  const set = Object.keys(updates).map(k => `${k}=?`).join(', ');
  db.prepare(`UPDATE submittal_items SET ${set} WHERE id=?`).run(...Object.values(updates), req.params.itemId);
  if (req.body.status && req.body.status !== item.status) {
    logAudit(req.params.id, req.params.itemId, 'status_changed', { from: item.status, to: req.body.status });
  } else {
    logAudit(req.params.id, req.params.itemId, 'item_updated', updates);
  }
  res.json(db.prepare('SELECT * FROM submittal_items WHERE id=?').get(req.params.itemId));
});

// DELETE /api/projects/:id/items/:itemId
router.delete('/:id/items/:itemId', (req, res) => {
  const item = db.prepare('SELECT * FROM submittal_items WHERE id=? AND project_id=?').get(req.params.itemId, req.params.id);
  if (!item) return res.status(404).json({ error: 'not found' });
  const revisionsBase = getRevisionsDir();
  const revisions = db.prepare('SELECT id FROM submittal_revisions WHERE submittal_item_id=?').all(req.params.itemId);
  const revDirsToDelete = revisions.map(r => path.join(revisionsBase, r.id));

  db.transaction(() => {
    db.prepare('DELETE FROM submittal_revisions WHERE submittal_item_id=?').run(req.params.itemId);
    db.prepare('DELETE FROM submittal_items WHERE id=?').run(req.params.itemId);
  })();

  for (const dir of revDirsToDelete) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }

  logAudit(req.params.id, req.params.itemId, 'item_deleted', { scope_item: item.scope_item });
  res.json({ ok: true });
});

module.exports = router;
