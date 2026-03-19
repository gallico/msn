export async function fetchGalleryItems(dir) {
    const params = new URLSearchParams({ dir: dir || "" });
    const res = await fetch(`/api/gallery/items?${params}`);
    if (!res.ok) throw new Error("Failed to fetch gallery items");
    return res.json();
}
