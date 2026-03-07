const express = require("express");
const router = express.Router();
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");
const { getSettings } = require("../settings");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/zip", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { baseFolder } = getSettings();
    const relTarget = req.body.targetDir || ".";

    // Resolve target directory (must stay within baseFolder)
    const targetDir = path.resolve(baseFolder, relTarget);
    if (!targetDir.startsWith(path.resolve(baseFolder))) {
        return res.status(403).json({ error: "Invalid target directory" });
    }

    let zip;
    try {
        zip = new AdmZip(req.file.buffer);
    } catch {
        return res.status(400).json({ error: "Invalid zip file" });
    }

    const entries = zip.getEntries();

    // Find unique top-level names
    const topLevel = new Set();
    for (const entry of entries) {
        const parts = entry.entryName.split("/").filter(Boolean);
        if (parts.length > 0) topLevel.add(parts[0]);
    }

    const topLevelArray = [...topLevel];
    const singleTopDir =
        topLevelArray.length === 1 &&
        entries.every((e) => e.entryName.startsWith(topLevelArray[0] + "/") || e.entryName === topLevelArray[0] + "/");

    let extractTo;
    if (singleTopDir) {
        // Zip already has its own root folder — extract directly into targetDir
        extractTo = targetDir;
    } else {
        // Multiple roots — wrap in a folder named after the zip file
        const zipName = path.basename(req.file.originalname, ".zip");
        extractTo = path.join(targetDir, zipName);
        fs.mkdirSync(extractTo, { recursive: true });
    }

    try {
        zip.extractAllTo(extractTo, true /* overwrite */);
    } catch (err) {
        return res.status(500).json({ error: `Extraction failed: ${err.message}` });
    }

    res.json({ ok: true, extractedTo: path.relative(baseFolder, extractTo) });
});

module.exports = router;
