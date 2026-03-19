const express = require("express");
const router = express.Router();
const db = require("../db");
const { executeQuery } = require("../services/views.service");

// GET all saved views
router.get("/", (req, res) => {
    const rows = db.prepare("SELECT id, name, rule_json FROM saved_views ORDER BY name").all();
    res.json(rows.map(v => ({ id: v.id, name: v.name, rule: JSON.parse(v.rule_json) })));
});

// POST create new view
router.post("/", (req, res) => {
    const { name, rule } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    if (!rule) return res.status(400).json({ error: "rule is required" });
    try {
        const info = db
            .prepare("INSERT INTO saved_views (name, rule_json) VALUES (?, ?)")
            .run(name.trim(), JSON.stringify(rule));
        res.json({ id: info.lastInsertRowid, name: name.trim(), rule });
    } catch (err) {
        if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "View name already exists" });
        throw err;
    }
});

// PUT update existing view
router.put("/:id", (req, res) => {
    const { name, rule } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });
    if (!rule) return res.status(400).json({ error: "rule is required" });
    try {
        db.prepare("UPDATE saved_views SET name = ?, rule_json = ? WHERE id = ?")
            .run(name.trim(), JSON.stringify(rule), req.params.id);
        res.json({ id: Number(req.params.id), name: name.trim(), rule });
    } catch (err) {
        if (err.message.includes("UNIQUE")) return res.status(409).json({ error: "View name already exists" });
        throw err;
    }
});

// DELETE view
router.delete("/:id", (req, res) => {
    db.prepare("DELETE FROM saved_views WHERE id = ?").run(req.params.id);
    res.status(204).end();
});

// POST /query — execute a rule without saving (used for preview)
router.post("/query", async (req, res) => {
    const { rule } = req.body;
    if (!rule) return res.status(400).json({ error: "rule is required" });
    try {
        const items = await executeQuery(rule);
        res.json({ items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /:id/items — execute a saved view
router.get("/:id/items", async (req, res) => {
    const row = db.prepare("SELECT rule_json FROM saved_views WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "View not found" });
    try {
        const items = await executeQuery(JSON.parse(row.rule_json));
        res.json({ items });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;