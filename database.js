// Temukan.co.id — Database Setup
// Menggunakan node-sqlite3-wasm (pure JavaScript/WASM, tidak perlu kompilasi)
const { Database } = require('node-sqlite3-wasm');
const path = require('path');

const DB_PATH = path.join(__dirname, 'temukan.db');
const db = new Database(DB_PATH);

// Aktifkan foreign keys
db.run('PRAGMA foreign_keys = ON', []);

// Buat tabel users
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    email     TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    whatsapp  TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Buat tabel posts
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    type            TEXT NOT NULL CHECK(type IN ('hilang', 'ditemukan')),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL,
    location        TEXT NOT NULL,
    date_lost_found TEXT NOT NULL,
    image_path      TEXT,
    status          TEXT DEFAULT 'aktif' CHECK(status IN ('aktif', 'selesai')),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

console.log('✅ Database siap di:', DB_PATH);
module.exports = db;
