export async function scanDir(dir) {
    const res = await fetch("/api/fingerprint/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dir }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function fetchDuplicates(dir) {
    const res = await fetch(`/api/fingerprint/duplicates?dir=${encodeURIComponent(dir)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function fetchSimilar(dir, threshold = 10) {
    const res = await fetch(`/api/fingerprint/similar?dir=${encodeURIComponent(dir)}&threshold=${threshold}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
