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

function scanMediaFiles(dir, baseFolder, results = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return results; }

    for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = path.join(dir, entry.name);
        let isDir = entry.isDirectory();
        let isFile = entry.isFile();
        if (entry.isSymbolicLink()) {
            try { const s = fs.statSync(fullPath); isDir = s.isDirectory(); isFile = s.isFile(); }
            catch { continue; }
        }
        if (isDir) {
            scanMediaFiles(fullPath, baseFolder, results);
        } else if (isFile) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) continue;
            if (path.basename(entry.name, ext).startsWith("thumb_")) continue;
            results.push(path.relative(baseFolder, fullPath));
        }
    }
    return results;
}

async function executeQuery(rule) {
    const { baseFolder } = getSettings();

    // Seed fileAttrs from all media files on disk (with virtual type attrs)
    const fileAttrs = {};
    for (const relPath of scanMediaFiles(baseFolder, baseFolder)) {
        const ext = path.extname(relPath).toLowerCase();
        fileAttrs[relPath] = {};
        if (IMAGE_EXTS.has(ext)) fileAttrs[relPath].image = null;
        else if (VIDEO_EXTS.has(ext)) fileAttrs[relPath].video = null;
    }

    // Seed fileAttrs from all video clips (virtual video attr)
    const clips = db.prepare("SELECT * FROM video_clips").all();
    const clipsById = {};
    for (const clip of clips) {
        fileAttrs[`clip:${clip.id}`] = { video: null };
        clipsById[clip.id] = clip;
    }

    // Merge user-defined attrs from DB (covers files and clips)
    const rows = db.prepare("SELECT file_path, attr_name, value FROM file_attrs").all();
    for (const row of rows) {
        if (!fileAttrs[row.file_path]) fileAttrs[row.file_path] = {};
        fileAttrs[row.file_path][row.attr_name] = row.value;
    }

    // Evaluate rule for each entry
    const matchingPaths = Object.keys(fileAttrs).filter(fp => evaluate(rule, fileAttrs[fp]));

    // Build result items
    const items = [];
    for (const filePath of matchingPaths) {
        if (filePath.startsWith("clip:")) {
            const clipId = parseInt(filePath.slice(5));
            const clip = clipsById[clipId];
            if (!clip) continue;
            const physicalVideoPath = path.join(baseFolder, clip.file_path);
            if (!fs.existsSync(physicalVideoPath)) continue;

            const lastSlash = clip.file_path.lastIndexOf("/");
            const dir = lastSlash >= 0 ? clip.file_path.slice(0, lastSlash) : "";
            const filename = lastSlash >= 0 ? clip.file_path.slice(lastSlash + 1) : clip.file_path;
            const ext = path.extname(filename).toLowerCase();
            const baseName = path.basename(filename, ext);
            const thumbFile = `thumb_${baseName}.png`;
            const thumbPhysical = path.join(dir ? path.join(baseFolder, dir) : baseFolder, thumbFile);

            items.push({
                id: filePath,
                src: `/media/${clip.file_path}`,
                thumb: fs.existsSync(thumbPhysical)
                    ? `/media/${dir ? dir + "/" : ""}${thumbFile}`
                    : null,
                type: "clip",
                title: clip.name,
                dir,
                videoFilePath: clip.file_path,
                clip: { id: clip.id, startMs: clip.start_ms, endMs: clip.end_ms },
            });
        } else {
            const physicalPath = path.join(baseFolder, filePath);
            if (!fs.existsSync(physicalPath)) continue;

            const lastSlash = filePath.lastIndexOf("/");
            const dir = lastSlash >= 0 ? filePath.slice(0, lastSlash) : "";
            const filename = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
            const ext = path.extname(filename).toLowerCase();

            if (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) continue;

            const isImage = IMAGE_EXTS.has(ext);
            const baseName = path.basename(filename, ext);
            const thumbFile = `thumb_${baseName}.png`;
            const thumbDir = dir ? path.join(baseFolder, dir) : baseFolder;
            const thumbPhysical = path.join(thumbDir, thumbFile);
            let thumb = null;

            if (!isImage) {
                try { await ensureThumbnail(physicalPath, thumbDir, thumbFile); } catch {}
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
    }

    return items;
}

module.exports = { executeQuery };