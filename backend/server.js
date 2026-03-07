const express = require("express");
const path = require("path");
const app = express();
const port = 3001;

const { getSettings } = require("./settings");
const fsBrowserRouter = require("./routes/fsBrowser.router");
const settingsRouter = require("./routes/settings.router");
const uploadRouter = require("./routes/upload.router");
const attrsRouter = require("./routes/attributes.router");

// CORS, if frontend runs on different port (e.g., 3000)
app.use(require("cors")());

// parse JSON bodies
app.use(express.json());

// static assets: images/videos — served from the configured base folder
app.use("/media", (req, res, next) => {
    const { baseFolder } = getSettings();
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(req.path);
    } catch {
        return res.status(400).send("Bad request");
    }
    const filePath = path.join(baseFolder, decodedPath);
    // Prevent path traversal
    if (!filePath.startsWith(path.resolve(baseFolder))) {
        return res.status(403).send("Forbidden");
    }
    res.sendFile(filePath, (err) => {
        if (err && !res.headersSent) next(err);
    });
});

// gallery routes
const galleryRouter = require("./routes/gallery.router");
app.use("/api/gallery", galleryRouter);

app.use("/api/fs", fsBrowserRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/attrs", attrsRouter);

app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});
