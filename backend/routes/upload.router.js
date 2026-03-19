const express = require("express");
const router = express.Router();
const multer = require("multer");
const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");
const { getSettings } = require("../settings");

const upload = multer({ storage: multer.memoryStorage() });

function resolveTarget(baseFolder, relTarget) {
    const targetDir = path.resolve(baseFolder, relTarget);
    if (!targetDir.startsWith(path.resolve(baseFolder))) return null;
    return targetDir;
}

// Write a single file entry, skipping if it already exists.
function writeIfAbsent(destPath, getData) {
    if (fs.existsSync(destPath)) return;
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, getData());
}

function extractZip(buffer, extractTo) {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Determine single-top-dir wrapping
    const topLevel = new Set();
    for (const entry of entries) {
        const parts = entry.entryName.split("/").filter(Boolean);
        if (parts.length > 0) topLevel.add(parts[0]);
    }
    const topLevelArray = [...topLevel];
    const singleTopDir =
        topLevelArray.length === 1 &&
        entries.every(
            (e) =>
                e.entryName.startsWith(topLevelArray[0] + "/") ||
                e.entryName === topLevelArray[0] + "/"
        );

    const dest = singleTopDir ? extractTo.base : extractTo.wrapped;
    fs.mkdirSync(dest, { recursive: true });

    const resolvedDest = path.resolve(dest);
    for (const entry of entries) {
        const destPath = path.join(dest, entry.entryName);
        if (!destPath.startsWith(resolvedDest + path.sep) && destPath !== resolvedDest) continue;
        if (entry.isDirectory) {
            fs.mkdirSync(destPath, { recursive: true });
        } else {
            writeIfAbsent(destPath, () => entry.getData());
        }
    }

    return dest;
}

async function extractRar(buffer, extractTo) {
    const { createExtractorFromData } = await import("node-unrar-js");
    const extractor = await createExtractorFromData({ data: buffer });

    const listResult = extractor.getFileList();
    const fileHeaders = [...listResult.fileHeaders];

    // Determine single-top-dir wrapping
    const topLevel = new Set();
    for (const h of fileHeaders) {
        const parts = h.name.split("/").filter(Boolean);
        if (parts.length > 0) topLevel.add(parts[0]);
    }
    const topLevelArray = [...topLevel];
    const singleTopDir =
        topLevelArray.length === 1 &&
        fileHeaders.every(
            (h) =>
                h.name.startsWith(topLevelArray[0] + "/") ||
                h.name === topLevelArray[0] + "/" ||
                h.name === topLevelArray[0]
        );

    const dest = singleTopDir ? extractTo.base : extractTo.wrapped;
    fs.mkdirSync(dest, { recursive: true });

    const resolvedDest = path.resolve(dest);
    const extracted = extractor.extract({ files: fileHeaders.map((h) => h.name) });

    for (const file of extracted.files) {
        const entryName = file.fileHeader.name;
        const destPath = path.join(dest, entryName);
        if (!destPath.startsWith(resolvedDest + path.sep) && destPath !== resolvedDest) continue;
        if (file.fileHeader.flags.directory) {
            fs.mkdirSync(destPath, { recursive: true });
        } else {
            writeIfAbsent(destPath, () => Buffer.from(file.extraction));
        }
    }

    return dest;
}

router.post("/zip", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { baseFolder } = getSettings();
    const relTarget = req.body.targetDir || ".";
    const targetDir = resolveTarget(baseFolder, relTarget);
    if (!targetDir) return res.status(403).json({ error: "Invalid target directory" });

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext !== ".zip" && ext !== ".rar") {
        return res.status(400).json({ error: "Only .zip and .rar files are supported" });
    }

    const archiveName = path.basename(req.file.originalname, ext);
    const extractTo = {
        base: targetDir,
        wrapped: path.join(targetDir, archiveName),
    };

    let dest;
    try {
        if (ext === ".zip") {
            dest = extractZip(req.file.buffer, extractTo);
        } else {
            dest = await extractRar(req.file.buffer, extractTo);
        }
    } catch (err) {
        return res.status(500).json({ error: `Extraction failed: ${err.message}` });
    }

    res.json({ ok: true, extractedTo: path.relative(baseFolder, dest) });
});

module.exports = router;