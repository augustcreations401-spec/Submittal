const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : (process.env.SQLITE_PATH || path.join(__dirname, 'specmatch.db'));

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
