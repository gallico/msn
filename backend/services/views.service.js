const fs = require("fs");
const path = require("path");
const db = require("../db");
const { getSettings } = require("../settings");
const { ensureThumbnail } = require("./gallery.service");

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".avi", ".mov", ".mkv"]);

// Evaluate a rule tree against an attr map { attrName: value|null }
function evaluate(rule, attrMap) {
    if (rule.type === "condition") {
        const { attr, op, value } = rule;
        if (op === "set") return attr in attrMap;
        const v = attrMap[attr];
        if (v === undefined || v === null) return false;
        const n = Number(value);
        switch (op) {
            case "=":  return v === n;
            case "!=": return v !== n;
            case ">":  return v > n;
            case ">=": return v >= n;
            case "<":  return v < n;
            case "<=": return v <= n;
        }
        return false;
    }
    if (rule.type === "group") {
        if (!rule.rules || rule.rules.length === 0) return !rule.negate;
        const results = rule.rules.map(r => evaluate(r, attrMap));
        const combined = rule.combinator === "or"
            ? results.some(Boolean)
            : results.every(Boolean);
        return rule.negate ? !combined : combined;
    }
    return false;
}

async function executeQuery(rule) {
    const { baseFolder } = getSettings();

    // Load all attributed file paths and group by file_path
    const rows = db.prepare("SELECT file_path, attr_name, value FROM file_attrs").all();
    const fileAttrs = {};
    for (const row of rows) {
        if (!fileAttrs[row.file_path]) fileAttrs[row.file_path] = {};
        fileAttrs[row.file_path][row.attr_name] = row.value;
    }

    // Evaluate rule for each file_path
    const matchingPaths = Object.keys(fileAttrs).filter(fp => evaluate(rule, fileAttrs[fp]));

    // Build media items for matching paths
    const items = [];
    for (const filePath of matchingPaths) {
        const physicalPath = path.join(baseFolder, filePath);
        if (!fs.existsSync(physicalPath)) continue;

        const lastSlash = filePath.lastIndexOf("/");
        const dir = lastSlash >= 0 ? filePath.slice(0, lastSlash) : "";
        const filename = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
        const ext = path.extname(filename).toLowerCase();

        if (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) continue;

        const isImage = IMAGE_EXTS.has(ext);
        const isVideo = VIDEO_EXTS.has(ext);
        const baseName = path.basename(filename, ext);
        const thumbFile = `thumb_${baseName}.png`;
        const thumbDir = dir ? path.join(baseFolder, dir) : baseFolder;
        const thumbPhysical = path.join(thumbDir, thumbFile);
        let thumb = null;

        if (isVideo) {
            try {
                await ensureThumbnail(physicalPath, thumbDir, thumbFile);
            } catch { /* thumb stays null */ }
        }

        if (fs.existsSync(thumbPhysical)) {
            thumb = `/media/${dir ? dir + "/" : ""}${thumbFile}`;
        }

        items.push({
            id: filename,
            src: `/media/${filePath}`,
            thumb,
            type: isImage ? "image" : "video",
            title: filename,
            dir,
        });
    }

    return items;
}

module.exports = { executeQuery };