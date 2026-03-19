export async function fetchViews() {
    const res = await fetch("/api/views");
    if (!res.ok) throw new Error("Failed to fetch views");
    return res.json();
}

export async function createView(name, rule) {
    const res = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rule }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to create view");
    return res.json();
}

export async function updateView(id, name, rule) {
    const res = await fetch(`/api/views/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rule }),
    });
    if (!res.ok) throw new Error((await res.json()).error || "Failed to update view");
    return res.json();
}

export async function deleteView(id) {
    const res = await fetch(`/api/views/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete view");
}

export async function fetchViewItems(id) {
    const res = await fetch(`/api/views/${id}/items`);
    if (!res.ok) throw new Error("Failed to fetch view items");
    return res.json();
}