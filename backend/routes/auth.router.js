const express = require("express");
const router = express.Router();

router.get("/status", (req, res) => {
    const { AUTH_USER, AUTH_PASS } = process.env;
    if (!AUTH_USER || !AUTH_PASS) return res.json({ enabled: false });
    res.json({ enabled: true, authenticated: !!req.session.authenticated });
});

router.post("/login", express.json(), (req, res) => {
    const { AUTH_USER, AUTH_PASS } = process.env;
    if (!AUTH_USER || !AUTH_PASS) return res.json({ ok: true });

    const { username, password } = req.body;
    if (username === AUTH_USER && password === AUTH_PASS) {
        req.session.authenticated = true;
        res.json({ ok: true });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
