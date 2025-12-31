const Database = require('better-sqlite3');
const path = require('path');

let db = null;

function initDatabase() {
  const dbPath = path.join(__dirname, 'data.db');
  db = new Database(dbPath);
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      upload_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      latest_version INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      image_id TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      comment TEXT NOT NULL,
      author TEXT DEFAULT 'Anonymous',
      created_at TEXT NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      image_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
    );
  `);

  console.log('Database initialized');
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

module.exports = { initDatabase, getDb };

