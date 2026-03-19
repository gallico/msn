const Database = require("better-sqlite3");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || __dirname;
const db = new Database(path.join(DATA_DIR, "gallery.db"));

db.exec(`
    CREATE TABLE IF NOT EXISTS attr_defs (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name    TEXT UNIQUE NOT NULL,
        has_value INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS file_attrs (
        file_path TEXT    NOT NULL,
        attr_name TEXT    NOT NULL,
        value     INTEGER,
        PRIMARY KEY (file_path, attr_name)
    );

    CREATE TABLE IF NOT EXISTS saved_views (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT UNIQUE NOT NULL,
        rule_json TEXT NOT NULL
    );
`);

module.exports = db;
