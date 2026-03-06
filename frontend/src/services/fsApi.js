// frontend/src/services/fsApi.js
const API_BASE = ""; // same origin, Vite proxy handles /api

export async function browseDir(path = ".") {
    const params = new URLSearchParams({ path });
    const res = await fetch(`/api/fs/browse?${params}`);
    if (!res.ok) throw new Error("Failed to browse directory");
    return res.json();
}
