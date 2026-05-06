const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const projectRoot = path.join(__dirname, '../../');

function resolvePath(p) {
  if (!p) return path.join(__dirname, 'specmatch.db');
  return path.isAbsolute(p) ? p : path.join(projectRoot, p);
}

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : resolvePath(process.env.SQLITE_PATH);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
