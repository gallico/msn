const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3001;

const { getSettings } = require("./settings");
const fsBrowserRouter = require("./routes/fsBrowser.router");
const settingsRouter  = require("./routes/settings.router");
const uploadRouter    = require("./routes/upload.router");
const attrsRouter     = require("./routes/attributes.router");
const authRouter      = require("./routes/auth.router");
const viewsRouter     = require("./routes/views.router");
const clipsRouter     = require("./routes/clips.router");

// Session
const session = require("express-session");
app.use(session({
    secret: process.env.SESSION_SECRET || require("crypto").randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: fs.existsSync(path.join(process.env.DATA_DIR || __dirname, "server.key")), httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// Auth middleware — protects /api/* and /media/* when credentials are configured
function requireAuth(req, res, next) {
    const { AUTH_USER, AUTH_PASS } = process.env;
    if (!AUTH_USER || !AUTH_PASS) return next();           // auth disabled
    if (req.session.authenticated) return next();           // logged in
    res.status(401).json({ error: "Unauthorized" });
}

// CORS, if frontend runs on different port (e.g., 3000)
app.use(require("cors")());

// parse JSON bodies
app.use(express.json());

// Auth routes (no auth required)
app.use("/api/auth", authRouter);

// static assets: images/videos — served from the configured base folder
app.use("/media", requireAuth, (req, res, next) => {
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
app.use("/api/gallery",  requireAuth, galleryRouter);
app.use("/api/fs",       requireAuth, fsBrowserRouter);
app.use("/api/settings", requireAuth, settingsRouter);
app.use("/api/upload",   requireAuth, uploadRouter);
app.use("/api/attrs",    requireAuth, attrsRouter);
app.use("/api/views",   requireAuth, viewsRouter);
app.use("/api/clips",   requireAuth, clipsRouter);

// Serve built frontend (production — skipped in dev where Vite runs separately)
const distPath = path.join(__dirname, "../frontend/dist");
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
}

// Use HTTPS if cert files are present in DATA_DIR, otherwise plain HTTP
const DATA_DIR = process.env.DATA_DIR || __dirname;
const keyPath  = path.join(DATA_DIR, "server.key");
const certPath = path.join(DATA_DIR, "server.crt");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    require("https").createServer(
        { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
        app
    ).listen(port, () => console.log(`Backend listening on https://localhost:${port}`));
} else {
    app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
}
