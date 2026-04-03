const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const { getSettings } = require("../settings");

let sharp;
try { sharp = require("sharp"); } catch { sharp = null; }

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".avi", ".mov", ".mkv"]);

function sha256File(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        fs.createReadStream(filePath)
            .on("data", d => hash.update(d))
            .on("end", () => resolve(hash.digest("hex")))
            .on("error", reject);
    });
}

// dHash: resize to 9×8 grayscale, compare adjacent pixels in each row → 64-bit hash
async function computePhash(filePath) {
    if (!sharp) return null;
    try {
        const { data } = await sharp(filePath)
            .resize(9, 8, { fit: "fill" })
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });
        let bits = 0n;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const i = row * 9 + col;
                bits = (bits << 1n) | (data[i] > data[i + 1] ? 1n : 0n);
            }
        }
        return bits.toString(16).padStart(16, "0");
    } catch {
        return null;
    }
}

function hammingDistance(hexA, hexB) {
    let xor = BigInt("0x" + hexA) ^ BigInt("0x" + hexB);
    let dist = 0;
    while (xor > 0n) { dist += Number(xor & 1n); xor >>= 1n; }
    return dist;
}

// List media files directly inside absDir (non-recursive)
function listMediaFiles(absDir, baseFolder) {
    let entries;
    try { entries = fs.readdirSync(absDir, { withFileTypes: true }); }
    catch { return []; }

    const results = [];
    for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const full = path.join(absDir, entry.name);
        let isFile = entry.isFile();
        if (entry.isSymbolicLink()) {
            try { isFile = fs.statSync(full).isFile(); } catch { continue; }
        }
        if (!isFile) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) continue;
        if (path.basename(entry.name, ext).startsWith("thumb_")) continue;
        results.push(path.relative(baseFolder, full));
    }
    return results;
}

const stmtUpsert = db.prepare(`
    INSERT INTO media_fingerprints (file_path, file_size, mtime, sha256, phash)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET
        file_size = excluded.file_size,
        mtime     = excluded.mtime,
        sha256    = excluded.sha256,
        phash     = excluded.phash
`);

const stmtGetMtime = db.prepare(
    "SELECT mtime FROM media_fingerprints WHERE file_path = ?"
);

async function scanFolder(relDir) {
    const { baseFolder } = getSettings();
    const absDir = relDir ? path.join(baseFolder, relDir) : baseFolder;
    const files = listMediaFiles(absDir, baseFolder);

    let processed = 0, skipped = 0, errors = 0;

    for (const relPath of files) {
        const absPath = path.join(baseFolder, relPath);
        let stat;
        try { stat = fs.statSync(absPath); } catch { errors++; continue; }

        const mtime = Math.round(stat.mtimeMs);
        const existing = stmtGetMtime.get(relPath);
        if (existing && existing.mtime === mtime) { skipped++; continue; }

        const ext = path.extname(relPath).toLowerCase();
        try {
            const [sha, ph] = await Promise.all([
                sha256File(absPath),
                IMAGE_EXTS.has(ext) ? computePhash(absPath) : Promise.resolve(null),
            ]);
            stmtUpsert.run(relPath, stat.size, mtime, sha, ph);
            processed++;
        } catch { errors++; }
    }

    return { total: files.length, processed, skipped, errors };
}

// Escape LIKE special chars in a path segment
function likePattern(relDir) {
    if (!relDir || relDir === ".") return null;
    return relDir.replace(/[%_\\]/g, "\\$&") + "/%";
}

function getDuplicates(relDir) {
    const pattern = likePattern(relDir);
    const rows = pattern
        ? db.prepare("SELECT file_path, sha256 FROM media_fingerprints WHERE file_path LIKE ? ESCAPE '\\'").all(pattern)
        : db.prepare("SELECT file_path, sha256 FROM media_fingerprints").all();

    const byHash = {};
    for (const { file_path, sha256 } of rows) {
        if (!byHash[sha256]) byHash[sha256] = [];
        byHash[sha256].push(file_path);
    }
    return Object.values(byHash).filter(g => g.length > 1);
}

function getSimilar(relDir, threshold = 10) {
    const pattern = likePattern(relDir);
    const rows = pattern
        ? db.prepare("SELECT file_path, phash FROM media_fingerprints WHERE phash IS NOT NULL AND file_path LIKE ? ESCAPE '\\'").all(pattern)
        : db.prepare("SELECT file_path, phash FROM media_fingerprints WHERE phash IS NOT NULL").all();

    const groups = [];
    const used = new Set();
    for (let i = 0; i < rows.length; i++) {
        if (used.has(i)) continue;
        const group = [rows[i].file_path];
        for (let j = i + 1; j < rows.length; j++) {
            if (used.has(j)) continue;
            if (hammingDistance(rows[i].phash, rows[j].phash) <= threshold) {
                group.push(rows[j].file_path);
                used.add(j);
            }
        }
        if (group.length > 1) {
            used.add(i);
            groups.push(group);
        }
    }
    return groups;
}

module.exports = { scanFolder, getDuplicates, getSimilar };
