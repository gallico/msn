const express = require("express");
const router = express.Router();
const db = require("../db");

const SEL = "SELECT id, file_path as filePath, name, start_ms as startMs, end_ms as endMs FROM video_clips";

// GET /api/clips?path=<filePath> — list clips for a video
router.get("/", (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: "path is required" });
    const clips = db.prepare(`${SEL} WHERE file_path = ? ORDER BY COALESCE(start_ms, -1)`)
        .all(filePath);
    res.json(clips);
});

// POST /api/clips — create a clip
router.post("/", (req, res) => {
    const { filePath, name, startMs, endMs } = req.body;
    if (!filePath?.trim() || !name?.trim())
        return res.status(400).json({ error: "filePath and name are required" });
    try {
        const info = db.prepare(
            "INSERT INTO video_clips (file_path, name, start_ms, end_ms) VALUES (?, ?, ?, ?)"
        ).run(filePath.trim(), name.trim(), startMs ?? null, endMs ?? null);
        res.json({
            id: info.lastInsertRowid,
            filePath: filePath.trim(),
            name: name.trim(),
            startMs: startMs ?? null,
            endMs: endMs ?? null,
        });
    } catch (err) {
        if (err.message.includes("UNIQUE"))
            return res.status(409).json({ error: "A clip with this name already exists for this video" });
        throw err;
    }
});

// PATCH /api/clips/:id — update name/timestamps
router.patch("/:id", (req, res) => {
    const { id } = req.params;
    const clip = db.prepare("SELECT * FROM video_clips WHERE id = ?").get(id);
    if (!clip) return res.status(404).json({ error: "Clip not found" });
    const { name, startMs, endMs } = req.body;
    db.prepare("UPDATE video_clips SET name = ?, start_ms = ?, end_ms = ? WHERE id = ?")
        .run(
            name ?? clip.name,
            startMs !== undefined ? startMs : clip.start_ms,
            endMs  !== undefined ? endMs  : clip.end_ms,
            id
        );
    res.json(db.prepare(`${SEL} WHERE id = ?`).get(id));
});

// DELETE /api/clips/:id — delete clip and its attributes
router.delete("/:id", (req, res) => {
    db.transaction(() => {
        db.prepare("DELETE FROM file_attrs WHERE file_path = ?").run(`clip:${req.params.id}`);
        db.prepare("DELETE FROM video_clips WHERE id = ?").run(req.params.id);
    })();
    res.status(204).end();
});

module.exports = router;