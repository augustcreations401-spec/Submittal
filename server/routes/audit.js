const router = require('express').Router();
const db = require('../db/db');

router.get('/', (req, res) => {
  let sql = 'SELECT * FROM audit_log';
  const params = [];
  const where = [];
  if (req.query.project_id) { where.push('project_id=?'); params.push(req.query.project_id); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  if (req.query.limit) { sql += ' LIMIT ?'; params.push(parseInt(req.query.limit, 10)); }
  res.json(db.prepare(sql).all(...params));
});

module.exports = router;
