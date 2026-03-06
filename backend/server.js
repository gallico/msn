const express = require("express");
const path = require("path");
const app = express();
const port = 3001;

const fsBrowserRouter = require("./routes/fsBrowser.router");

// CORS, if frontend runs on different port (e.g., 3000)
app.use(require("cors")());

// parse JSON bodies
app.use(express.json());

// static assets: images/videos
app.use("/media", express.static(path.join(__dirname, "assets")));

// gallery routes
const galleryRouter = require("./routes/gallery.router");
app.use("/api/gallery", galleryRouter);

app.listen(port, () => {
    console.log(`Backend listening on http://localhost:${port}`);
});

app.use("/api/fs", fsBrowserRouter);
