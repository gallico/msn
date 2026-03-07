async function extractError(res, fallback) {
    try {
        const data = await res.json();
        return data.error || fallback;
    } catch {
        return `${fallback} (HTTP ${res.status})`;
    }
}

export async function getAttrDefs() {
    const res = await fetch("/api/attrs/defs");
    if (!res.ok) throw new Error("Failed to load attribute definitions");
    return res.json();
}

export async function createAttrDef(name, hasValue) {
    const res = await fetch("/api/attrs/defs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hasValue }),
    });
    if (!res.ok) throw new Error(await extractError(res, "Failed to create attribute"));
    return res.json();
}

export async function deleteAttrDef(name) {
    const res = await fetch(`/api/attrs/defs/${encodeURIComponent(name)}`, {
        method: "DELETE",
    });
    if (!res.ok) throw new Error(await extractError(res, "Failed to delete attribute"));
}

export async function getFileAttrs(filePath) {
    const res = await fetch(`/api/attrs/file?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error("Failed to load file attributes");
    return res.json();
}

export async function bulkAssignAttrs(paths, attrs) {
    const res = await fetch("/api/attrs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths, attrs }),
    });
    if (!res.ok) throw new Error(await extractError(res, "Bulk assign failed"));
    return res.json();
}

export async function saveFileAttrs(filePath, attrs) {
    const res = await fetch(`/api/attrs/file?path=${encodeURIComponent(filePath)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attrs),
    });
    if (!res.ok) throw new Error(await extractError(res, "Failed to save attributes"));
    return res.json();
}
