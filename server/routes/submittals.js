const router = require('express').Router();
const db = require('../db/db');

router.get('/', (req, res) => {
  let sql = `SELECT i.*, p.name as project_name, p.gc_name, p.project_number,
    (SELECT COUNT(*) FROM submittal_revisions WHERE submittal_item_id=i.id) as revision_count
    FROM submittal_items i JOIN projects p ON i.project_id=p.id`;
  const params = [];
  const where = [];
  if (req.query.status) { where.push('i.status=?'); params.push(req.query.status); }
  if (req.query.project_id) { where.push('i.project_id=?'); params.push(req.query.project_id); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY i.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
