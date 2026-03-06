const API_BASE = "http://localhost:3001";

export async function fetchGalleryItems(dir) {
    const params = new URLSearchParams({ dir: dir || "" });
    const res = await fetch(`${API_BASE}/api/gallery/items?${params}`);
    if (!res.ok) throw new Error("Failed to fetch gallery items");
    return res.json();
}
