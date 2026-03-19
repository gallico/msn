export async function checkAuth() {
    const res = await fetch("/api/auth/status");
    return res.json(); // { enabled, authenticated }
}

export async function login(username, password) {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
}

export async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
}
