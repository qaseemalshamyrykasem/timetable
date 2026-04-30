const Database = require('better-sqlite3');
const path = require('path');

// Initialize database connection to /home/z/my-project/database/db.sqlite
const dbPath = path.join(__dirname, '..', '..', 'database', 'db.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better performance and concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    student_id TEXT UNIQUE NOT NULL,
    class_name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    available_days TEXT DEFAULT '["Saturday","Sunday","Monday","Tuesday","Wednesday"]',
    available_slots TEXT DEFAULT '["1","2","3","4","5"]'
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    teacher_id INTEGER REFERENCES teachers(id),
    weekly_sessions INTEGER DEFAULT 4
  );

  CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 30
  );

  CREATE TABLE IF NOT EXISTS timetable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_name TEXT NOT NULL,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    subject_id INTEGER REFERENCES subjects(id),
    teacher_id INTEGER REFERENCES teachers(id),
    classroom_id INTEGER REFERENCES classrooms(id),
    UNIQUE(class_name, day, time_slot)
  );
`);

/**
 * Returns the active database instance.
 * @returns {Database} The better-sqlite3 database instance.
 */
function getDb() {
  return db;
}

module.exports = db;
module.exports.getDb = getDb;
