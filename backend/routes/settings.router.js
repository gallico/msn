const express = require("express");
const router = express.Router();
const fs = require("fs");
const { getSettings, saveSettings } = require("../settings");

router.get("/", (req, res) => {
    res.json(getSettings());
});

router.put("/", (req, res) => {
    const { baseFolder } = req.body;
    if (!baseFolder) return res.status(400).json({ error: "baseFolder is required" });
    if (!fs.existsSync(baseFolder)) return res.status(400).json({ error: "Path does not exist" });
    const stats = fs.statSync(baseFolder);
    if (!stats.isDirectory()) return res.status(400).json({ error: "Path is not a directory" });
    saveSettings({ ...getSettings(), baseFolder });
    res.json(getSettings());
});

module.exports = router;
