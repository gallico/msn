import React, { useState, useEffect } from "react";

async function systemBrowse(path) {
    const res = await fetch(`/api/fs/system-browse?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to browse");
    }
    return res.json();
}

function DirPickerModal({ initialPath, onSelect, onClose }) {
    const [currentPath, setCurrentPath] = useState(initialPath || "/");
    const [dirs, setDirs] = useState([]);
    const [parent, setParent] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = (path) => {
        setLoading(true);
        setError("");
        systemBrowse(path)
            .then((data) => {
                setCurrentPath(data.path);
                setDirs(data.dirs);
                setParent(data.parent);
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        navigate(initialPath || "/");
    }, []);

    return (
        <div className="modal-overlay dir-picker-overlay" onClick={onClose}>
            <div className="dir-picker-modal" onClick={(e) => e.stopPropagation()}>
                <div className="dir-picker-header">
                    <span className="dir-picker-path" title={currentPath}>{currentPath}</span>
                    <button className="settings-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="dir-picker-actions">
                    <button onClick={() => parent && navigate(parent)} disabled={!parent || loading}>
                        ↑ Up
                    </button>
                    <button className="btn-primary" onClick={() => onSelect(currentPath)}>
                        Select this folder
                    </button>
                </div>

                {error && <div className="settings-error" style={{ padding: "0 1rem" }}>{error}</div>}

                <ul className="dir-picker-list">
                    {loading && <li className="dir-picker-empty">Loading…</li>}
                    {!loading && dirs.length === 0 && (
                        <li className="dir-picker-empty">No subdirectories</li>
                    )}
                    {!loading && dirs.map((d) => (
                        <li
                            key={d.fullPath}
                            className="dir-picker-item"
                            onClick={() => navigate(d.fullPath)}
                        >
                            <span className="dir-icon">📁</span>
                            <span>{d.name}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default DirPickerModal;
