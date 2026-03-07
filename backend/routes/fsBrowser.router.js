// backend/routes/fsBrowser.router.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { browseDir } = require("../controllers/fsBrowser.controller");

router.get("/browse", browseDir);

// Browse any absolute path on the system filesystem (for directory picker)
router.get("/system-browse", (req, res) => {
    const reqPath = req.query.path || "/";
    const absPath = path.resolve(reqPath);

    if (!fs.existsSync(absPath)) {
        return res.status(400).json({ error: "Path does not exist" });
    }

    let dirs = [];
    try {
        const entries = fs.readdirSync(absPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith(".")) continue;
            const fullPath = path.join(absPath, entry.name);
            let isDir = entry.isDirectory();
            if (entry.isSymbolicLink()) {
                try { isDir = fs.statSync(fullPath).isDirectory(); } catch { continue; }
            }
            if (!isDir) continue;
            dirs.push({ name: entry.name, fullPath });
        }
        dirs.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
        return res.status(403).json({ error: "Permission denied" });
    }

    const parent = absPath !== path.parse(absPath).root ? path.dirname(absPath) : null;
    res.json({ path: absPath, parent, dirs });
});

module.exports = router;
