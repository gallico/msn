# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a local media gallery app with a Node.js/Express backend and a React/Vite frontend. The backend serves media files from `backend/assets/` and auto-generates video thumbnails via FFmpeg. The frontend displays a resizable sidebar folder browser alongside a media grid.

## Commands

### Backend (run from repo root `/home/ulrb/workspace/msn`)
```bash
node backend/server.js        # start backend on port 3001
npm start                     # same as above
```

### Frontend (run from `/home/ulrb/workspace/msn/frontend`)
```bash
npm run dev      # start Vite dev server (proxies /api and /media to localhost:3001)
npm run build    # production build
npm run lint     # ESLint
```

## Architecture

```
msn/
├── backend/
│   ├── server.js                  # Express entry point, port 3001
│   ├── assets/                    # Served as static /media; media files live here
│   │   └── Media/                 # Default media directory
│   ├── routes/
│   │   ├── gallery.router.js      # GET /api/gallery/items
│   │   └── fsBrowser.router.js    # GET /api/fs/browse
│   ├── controllers/
│   │   ├── gallery.controller.js
│   │   └── fsBrowser.controller.js
│   └── services/
│       ├── gallery.service.js     # Reads files, generates video thumbnails via fluent-ffmpeg
│       └── fsBrowser.service.js   # Lists directories/files sorted by mtime
└── frontend/src/
    ├── App.jsx                    # Layout: resizable sidebar + main gallery
    ├── components/
    │   ├── DirectoryBrowser.jsx   # Sidebar folder tree (calls /api/fs/browse)
    │   ├── Gallery.jsx            # Media grid (calls /api/gallery/items)
    │   └── MediaItem.jsx          # Single image/video card with thumbnail
    └── services/
        ├── galleryApi.js          # fetch wrapper for /api/gallery/items
        └── fsApi.js               # fetch wrapper for /api/fs/browse
```

## Key Behaviors

- **Thumbnail generation**: `gallery.service.js` auto-generates `thumb_<basename>.png` for video files on first request using `fluent-ffmpeg` (seeks to 1s, 320x180). For images, if no `thumb_<basename>.png` exists alongside the file, the full image is used as the thumbnail (scaled via CSS). There is no auto-generation for image thumbnails.
- **Static file serving**: `backend/assets/` maps to `/media` URL path. `server.js` uses `path.join(__dirname, "assets")` — do not change this to a relative path, as the server is started from the repo root and a relative `"assets"` would resolve to the wrong directory.
- **CSS imports**: `App.css` is imported in `App.jsx`. All layout, gallery, sidebar, modal, and directory browser styles live in `App.css`. `index.css` (imported in `main.jsx`) contains only the `#root` rule.
- **Vite proxy**: In dev, the frontend proxies `/api/*` and `/media/*` to `http://localhost:3001`, so both services must run concurrently.
- **Supported media types**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` (images) and `.mp4`, `.webm`, `.avi`, `.mov`, `.mkv` (videos). Files prefixed with `thumb_` are excluded from gallery listings.
- **Sorting**: Both `fsBrowser.service` and `gallery.service` sort entries by `mtime` descending (most recent first), though `gallery.service` does not currently attach `mtime` to returned items.
