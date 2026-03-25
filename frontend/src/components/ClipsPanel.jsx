import React, { useState, useEffect } from "react";
import { getClips, createClip, deleteClip } from "../services/clipsApi";

function formatMs(ms) {
    if (ms === null || ms === undefined) return "—";
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

function ClipsPanel({ videoPath, videoRef, activeClipId, onClipActive }) {
    const [clips, setClips] = useState([]);
    const [defining, setDefining] = useState(false);
    const [newName, setNewName] = useState("");
    const [startMs, setStartMs] = useState(null);
    const [endMs, setEndMs] = useState(null);
    const [currentMs, setCurrentMs] = useState(0);
    const [error, setError] = useState("");

    useEffect(() => {
        setClips([]);
        getClips(videoPath).then(setClips).catch(() => {});
    }, [videoPath]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const update = () => setCurrentMs(Math.floor(video.currentTime * 1000));
        video.addEventListener("timeupdate", update);
        return () => video.removeEventListener("timeupdate", update);
    }, [videoPath]);

    const cancelDefine = () => {
        setDefining(false);
        setNewName("");
        setStartMs(null);
        setEndMs(null);
        setError("");
    };

    const saveClip = async () => {
        if (!newName.trim()) return;
        setError("");
        try {
            const clip = await createClip(videoPath, newName.trim(), startMs, endMs);
            setClips(prev => [...prev, clip]);
            cancelDefine();
        } catch (e) {
            setError(e.message);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this clip and its attributes?")) return;
        try {
            await deleteClip(id);
            setClips(prev => prev.filter(c => c.id !== id));
            if (activeClipId === id) onClipActive(null);
        } catch {}
    };

    return (
        <div className="clips-panel">
            <div className="clips-panel-header">
                <span className="clips-panel-title">Clips</span>
                {!defining ? (
                    <button className="clips-define-btn" onClick={() => setDefining(true)}>+ Define</button>
                ) : (
                    <button className="clips-define-btn" onClick={cancelDefine}>Cancel</button>
                )}
            </div>

            {defining && (
                <div className="clip-define-form">
                    <div className="clip-define-row">
                        <span className="clip-current-time">{formatMs(currentMs)}</span>
                        <button
                            className={`mark-btn${startMs !== null ? " marked" : ""}`}
                            onClick={() => setStartMs(currentMs)}
                            title="Set start to current position"
                        >
                            {startMs !== null ? `▶ ${formatMs(startMs)}` : "▶ Start"}
                        </button>
                        <button
                            className={`mark-btn${endMs !== null ? " marked" : ""}`}
                            onClick={() => setEndMs(currentMs)}
                            title="Set end to current position"
                        >
                            {endMs !== null ? `⏹ ${formatMs(endMs)}` : "⏹ End"}
                        </button>
                    </div>
                    <div className="clip-define-row">
                        <input
                            className="clip-name-input"
                            placeholder="Clip name…"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && saveClip()}
                            autoFocus
                        />
                        <button
                            className="btn-primary clip-save-btn"
                            onClick={saveClip}
                            disabled={!newName.trim()}
                        >
                            Save
                        </button>
                    </div>
                    {error && <div className="attr-error">{error}</div>}
                </div>
            )}

            <div className="clip-list">
                {clips.map(clip => (
                    <div
                        key={clip.id}
                        className={`clip-item${activeClipId === clip.id ? " active" : ""}`}
                        onClick={() => onClipActive(clip)}
                        title={clip.name}
                    >
                        <span className="clip-item-name">{clip.name}</span>
                        <span className="clip-item-range">
                            {formatMs(clip.startMs)}–{formatMs(clip.endMs)}
                        </span>
                        <button
                            className="clip-del-btn"
                            onClick={e => handleDelete(e, clip.id)}
                            title="Delete clip"
                        >✕</button>
                    </div>
                ))}
                {clips.length === 0 && !defining && (
                    <span className="clips-empty">No clips defined</span>
                )}
            </div>
        </div>
    );
}

export default ClipsPanel;