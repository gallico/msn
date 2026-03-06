// backend/services/fsBrowser.service.js
const fs = require("fs");
const path = require("path");

const mediaRoot = path.join(__dirname, "../assets");

// Return folders and files for a given relative path
function listDir(relPath = ".") {
    const fullPath = path.join(mediaRoot, relPath);

    if (!fs.existsSync(fullPath)) {
        throw new Error("Path does not exist");
    }

    const dirents = fs.readdirSync(fullPath, { withFileTypes: true });

    const allEntries = [];

    for (const d of dirents) {
        if (d.name.startsWith(".")) continue;

        const isSymlink = d.isSymbolicLink();
        const fullName = path.join(fullPath, d.name);

        let isDirectory = d.isDirectory();
        let mtime = 0;

        if (isSymlink) {
            try {
                const stats = fs.statSync(fullName); // follows symlink
                isDirectory = stats.isDirectory();
                mtime = stats.mtime.getTime();
            } catch (err) {
                console.warn(`Broken symlink ${d.name}:`, err.message);
                continue;
            }
        } else {
            // Regular file/dir: get mtime
            const stats = fs.statSync(fullName);
            isDirectory = stats.isDirectory();
            mtime = stats.mtime.getTime();
        }

        const ext = path.extname(d.name).toLowerCase();
        const isMedia = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".webm", ".avi", ".mov", ".mkv"].includes(ext);

        allEntries.push({
            name: d.name,
            path: path.join(relPath === "." ? "" : relPath, d.name),
            mtime, // NEW: timestamp
            isSymlink,
            isDirectory,
            isMedia // NEW: for future use
        });
    }

    // NEW: Sort by mtime DESC (most recent first)
    allEntries.sort((a, b) => b.mtime - a.mtime);

    // Separate dirs and files
    const directories = allEntries.filter(e => e.isDirectory);
    const files = allEntries.filter(e => !e.isDirectory && e.isMedia);

    return { directories, files, relPath };
}

module.exports = { listDir };
