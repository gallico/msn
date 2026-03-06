# MSN – Media Gallery

A local media gallery app for browsing photos and videos stored on your machine.

## Features

- Browse directories via a resizable sidebar
- Grid gallery with thumbnail previews
- Auto-generates thumbnails for videos (via FFmpeg) on first load
- Lightbox viewer with prev/next navigation, keyboard shortcuts, and fullscreen mode
- Supports images (jpg, jpeg, png, gif, webp) and videos (mp4, webm, avi, mov, mkv)

## Setup

### Backend

```bash
npm install
node backend/server.js
```

Runs on `http://localhost:3001`. Media files go in `backend/assets/`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. Proxies `/api` and `/media` to the backend.

## Usage

- Place photos and videos in `backend/assets/` (subdirectories are supported)
- Open `http://localhost:5173` in your browser
- Use the sidebar to navigate folders
- Click any item to open it in the lightbox
- Use `←` / `→` arrow keys to navigate, `Escape` to close
