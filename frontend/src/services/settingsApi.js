export async function getSettings() {
    const res = await fetch("/api/settings");
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
}

export async function saveSettings(settings) {
    const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save settings");
    }
    return res.json();
}
