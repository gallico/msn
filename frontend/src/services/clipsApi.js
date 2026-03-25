async function extractError(res, fallback) {
    try {
        const data = await res.json();
        return data.error || fallback;
    } catch {
        return `${fallback} (HTTP ${res.status})`;
    }
}

export async function getClips(filePath) {
    const res = await fetch(`/api/clips?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error("Failed to load clips");
    return res.json();
}

export async function createClip(filePath, name, startMs, endMs) {
    const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, name, startMs, endMs }),
    });
    if (!res.ok) throw new Error(await extractError(res, "Failed to create clip"));
    return res.json();
}

export async function updateClip(id, data) {
    const res = await fetch(`/api/clips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractError(res, "Failed to update clip"));
    return res.json();
}

export async function deleteClip(id) {
    const res = await fetch(`/api/clips/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await extractError(res, "Failed to delete clip"));
}