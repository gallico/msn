const express = require("express");
const router = express.Router();
const { scanFolder, getDuplicates, getSimilar } = require("../services/fingerprint.service");

// POST /api/fingerprint/scan  { dir: "relative/path" }
router.post("/scan", async (req, res) => {
    const { dir = "" } = req.body;
    try {
        const result = await scanFolder(dir);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fingerprint/duplicates?dir=relative/path
router.get("/duplicates", (req, res) => {
    const { dir = "" } = req.query;
    try {
        res.json({ groups: getDuplicates(dir) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fingerprint/similar?dir=relative/path&threshold=10
router.get("/similar", (req, res) => {
    const { dir = "", threshold = "10" } = req.query;
    try {
        res.json({ groups: getSimilar(dir, parseInt(threshold, 10)) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
