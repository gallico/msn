import React, { useState, useEffect, useCallback } from "react";
import { scanDir, fetchDuplicates, fetchSimilar } from "../services/fingerprintApi";

const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

function mediaUrl(filePath) {
    return "/media/" + filePath.split("/").map(encodeURIComponent).join("/");
}

function thumbUrl(filePath) {
    const lastSlash = filePath.lastIndexOf("/");
    const dir = lastSlash >= 0 ? filePath.slice(0, lastSlash) : "";
    const name = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;
    const dotIdx = name.lastIndexOf(".");
    const nameNoExt = dotIdx >= 0 ? name.slice(0, dotIdx) : name;
    const thumbPath = dir ? `${dir}/thumb_${nameNoExt}.png` : `thumb_${nameNoExt}.png`;
    return "/media/" + thumbPath.split("/").map(encodeURIComponent).join("/");
}

function isImage(filePath) {
    const ext = filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
    return IMAGE_EXTS.has(ext);
}

function FileCard({ filePath }) {
    const img = isImage(filePath);
    const name = filePath.slice(filePath.lastIndexOf("/") + 1);
    const dir = filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "";
    const [thumbFailed, setThumbFailed] = useState(false);

    return (
        <a
            className="dup-card"
            href={mediaUrl(filePath)}
            target="_blank"
            rel="noreferrer"
            title={filePath}
        >
            {img ? (
                <img
                    className="dup-thumb"
                    src={thumbFailed ? mediaUrl(filePath) : thumbUrl(filePath)}
                    alt={name}
                    onError={() => setThumbFailed(true)}
                />
            ) : (
                <div className="dup-thumb dup-video-placeholder">🎬</div>
            )}
            <span className="dup-card-name">{name}</span>
            {dir && <span className="dup-card-dir">{dir}</span>}
        </a>
    );
}

function GroupList({ groups, emptyMsg }) {
    if (groups.length === 0) return <p className="dup-empty">{emptyMsg}</p>;
    return (
        <div className="dup-groups">
            {groups.map((group, i) => (
                <div key={i} className="dup-group">
                    <div className="dup-group-label">Group {i + 1} — {group.length} files</div>
                    <div className="dup-group-files">
                        {group.map(fp => <FileCard key={fp} filePath={fp} />)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function DuplicatesModal({ dir, onClose }) {
    const [tab, setTab] = useState("exact"); // "exact" | "similar"
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [duplicates, setDuplicates] = useState(null);
    const [similar, setSimilar] = useState(null);
    const [threshold, setThreshold] = useState(10);
    const [loadingResults, setLoadingResults] = useState(false);

    const displayDir = dir || "/";

    const loadResults = useCallback(async (thresh = threshold) => {
        setLoadingResults(true);
        try {
            const [dups, sim] = await Promise.all([
                fetchDuplicates(dir),
                fetchSimilar(dir, thresh),
            ]);
            setDuplicates(dups.groups);
            setSimilar(sim.groups);
        } catch {
            // results not yet available — that's fine
        } finally {
            setLoadingResults(false);
        }
    }, [dir, threshold]);

    useEffect(() => {
        loadResults();
    }, []);

    const handleScan = async () => {
        setScanning(true);
        setScanError(null);
        try {
            const result = await scanDir(dir);
            setScanResult(result);
            await loadResults();
        } catch (err) {
            setScanError(err.message);
        } finally {
            setScanning(false);
        }
    };

    const handleThresholdChange = (val) => {
        setThreshold(val);
        loadResults(val);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="dup-modal" onClick={e => e.stopPropagation()}>
                <div className="dup-modal-header">
                    <span className="dup-modal-title">Duplicates — {displayDir}</span>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="dup-modal-toolbar">
                    <button
                        className="btn-primary"
                        onClick={handleScan}
                        disabled={scanning}
                    >
                        {scanning ? "Scanning…" : "Scan folder"}
                    </button>
                    {scanResult && !scanning && (
                        <span className="dup-scan-result">
                            {scanResult.total} files — {scanResult.processed} new,&nbsp;
                            {scanResult.skipped} unchanged
                            {scanResult.errors > 0 && `, ${scanResult.errors} errors`}
                        </span>
                    )}
                    {scanError && <span className="dup-scan-error">{scanError}</span>}
                </div>

                <div className="dup-tabs">
                    <button
                        className={`dup-tab${tab === "exact" ? " active" : ""}`}
                        onClick={() => setTab("exact")}
                    >
                        Exact duplicates{duplicates ? ` (${duplicates.length})` : ""}
                    </button>
                    <button
                        className={`dup-tab${tab === "similar" ? " active" : ""}`}
                        onClick={() => setTab("similar")}
                    >
                        Similar images{similar ? ` (${similar.length})` : ""}
                    </button>
                    {tab === "similar" && (
                        <label className="dup-threshold">
                            Threshold:
                            <input
                                type="range"
                                min={1}
                                max={20}
                                value={threshold}
                                onChange={e => handleThresholdChange(Number(e.target.value))}
                            />
                            {threshold}
                        </label>
                    )}
                </div>

                <div className="dup-modal-body">
                    {loadingResults ? (
                        <p className="dup-empty">Loading…</p>
                    ) : tab === "exact" ? (
                        <GroupList
                            groups={duplicates ?? []}
                            emptyMsg={duplicates === null
                                ? "Scan the folder first to find duplicates."
                                : "No exact duplicates found in this folder."}
                        />
                    ) : (
                        <GroupList
                            groups={similar ?? []}
                            emptyMsg={similar === null
                                ? "Scan the folder first to find similar images."
                                : "No similar images found at this threshold."}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

export default DuplicatesModal;
