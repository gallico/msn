import React, { useState } from "react";
import { login } from "../services/authApi";

function LoginForm({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError]       = useState("");
    const [busy, setBusy]         = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await login(username, password);
            onLogin();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="login-overlay">
            <form className="login-box" onSubmit={handleSubmit}>
                <h2 className="login-title">Sign in</h2>
                <input
                    className="login-input"
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    autoFocus
                    required
                />
                <input
                    className="login-input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
                {error && <p className="login-error">{error}</p>}
                <button className="login-btn" type="submit" disabled={busy}>
                    {busy ? "Signing in…" : "Sign in"}
                </button>
            </form>
        </div>
    );
}

export default LoginForm;
