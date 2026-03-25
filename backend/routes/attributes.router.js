const express = require("express");
const router = express.Router();
const db = require("../db");

const PREDEFINED_ATTRS = [
    { id: null, name: "image", hasValue: 0, predefined: true },
    { id: null, name: "video", hasValue: 0, predefined: true },
];
const PREDEFINED_NAMES = new Set(PREDEFINED_ATTRS.map(a => a.name));

// GET all attribute definitions
router.get("/defs", (req, res) => {
    const defs = db
        .prepare("SELECT id, name, has_value as hasValue FROM attr_defs ORDER BY name")
        .all();
    res.json([...PREDEFINED_ATTRS, ...defs]);
});

// POST new attribute definition
router.post("/defs", (req, res) => {
    const { name, hasValue } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    try {
        const info = db
            .prepare("INSERT INTO attr_defs (name, has_value) VALUES (?, ?)")
            .run(name.trim(), hasValue ? 1 : 0);
        res.json({ id: info.lastInsertRowid, name: name.trim(), hasValue: hasValue ? 1 : 0 });
    } catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(409).json({ error: "Attribute already exists" });
        throw err;
    }
});

// DELETE attribute definition + all its file assignments
router.delete("/defs/:name", (req, res) => {
    const { name } = req.params;
    if (PREDEFINED_NAMES.has(name))
        return res.status(403).json({ error: "Cannot delete predefined attributes" });
    db.prepare("DELETE FROM file_attrs WHERE attr_name = ?").run(name);
    db.prepare("DELETE FROM attr_defs WHERE name = ?").run(name);
    res.status(204).end();
});

// GET attributes assigned to a specific file
router.get("/file", (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: "path is required" });
    const rows = db
        .prepare("SELECT attr_name, value FROM file_attrs WHERE file_path = ?")
        .all(filePath);
    const result = {};
    for (const row of rows) result[row.attr_name] = row.value; // null for boolean attrs
    res.json(result);
});

// PUT attributes for a file (full replace)
router.put("/file", (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: "path is required" });
    const attrs = req.body; // { attrName: value | null }

    const del = db.prepare("DELETE FROM file_attrs WHERE file_path = ?");
    const ins = db.prepare(
        "INSERT INTO file_attrs (file_path, attr_name, value) VALUES (?, ?, ?)"
    );

    db.transaction(() => {
        del.run(filePath);
        for (const [name, value] of Object.entries(attrs)) {
            ins.run(filePath, name, value ?? null);
        }
    })();

    const rows = db
        .prepare("SELECT attr_name, value FROM file_attrs WHERE file_path = ?")
        .all(filePath);
    const result = {};
    for (const row of rows) result[row.attr_name] = row.value;
    res.json(result);
});

// POST bulk-merge attributes into multiple files
router.post("/bulk", (req, res) => {
    const { paths, attrs } = req.body;
    if (!Array.isArray(paths) || paths.length === 0)
        return res.status(400).json({ error: "paths array is required" });
    if (!attrs || typeof attrs !== "object")
        return res.status(400).json({ error: "attrs object is required" });

    try {
        const ins = db.prepare(
            "INSERT OR REPLACE INTO file_attrs (file_path, attr_name, value) VALUES (?, ?, ?)"
        );

        db.transaction(() => {
            for (const filePath of paths) {
                for (const [name, value] of Object.entries(attrs)) {
                    ins.run(filePath, name, value ?? null);
                }
            }
        })();

        res.json({ ok: true, updated: paths.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
