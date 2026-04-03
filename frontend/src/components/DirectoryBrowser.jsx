// frontend/src/components/DirectoryBrowser.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { browseDir } from "../services/fsApi";
import DuplicatesModal from "./DuplicatesModal";

function DirectoryBrowser({ selectedDir, onSelectDir }) {
    const [currentPath, setCurrentPath] = useState(".");
    const [directories, setDirectories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dupesOpen, setDupesOpen] = useState(false);

    const scrollContainerRef = useRef(null);
    const scrollStack = useRef([]);

    const load = useCallback((path, restoreScroll = false) => {
        setLoading(true);
        browseDir(path)
            .then((data) => {
                setDirectories(data.directories);
                setCurrentPath(data.relPath);
                setLoading(false);
                onSelectDir(data.relPath === "." ? "" : data.relPath);
                requestAnimationFrame(() => {
                    if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = restoreScroll
                            ? (scrollStack.current.pop() ?? 0)
                            : 0;
                    }
                });
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [onSelectDir]);

    useEffect(() => {
        load(".");
    }, []);

    const goUp = () => {
        if (currentPath === "." || !currentPath) return;
        const parts = currentPath.split(/[\\/]/).filter(Boolean);
        parts.pop();
        const newPath = parts.length ? parts.join("/") : ".";
        load(newPath, true);
    };

    const openDir = (dir) => {
        scrollStack.current.push(scrollContainerRef.current?.scrollTop ?? 0);
        load(dir.path);
    };

    return (
        <div className="dir-browser">
            <div className="dir-header">
                <div className="dir-path">
                    Current: {currentPath === "." ? "/" : `/${currentPath}`}
                </div>
                <div className="dir-header-btns">
                    <button onClick={goUp} disabled={currentPath === "."}>↑ Up</button>
                    <button
                        className="dupes-btn"
                        title="Find duplicates in this folder"
                        onClick={() => setDupesOpen(true)}
                    >⊕ Dupes</button>
                </div>
            </div>

            {loading && <div>Loading folders...</div>}

            <ul
                className="dir-list"
                ref={scrollContainerRef} // NEW: attach ref
            >
                {directories.length === 0 && !loading && (
                    <li className="dir-empty">No subfolders</li>
                )}

                {directories.map((dir) => {
                    const isActive = selectedDir === dir.path || selectedDir === `/${dir.path}`;
                    const date = new Date(dir.mtime).toLocaleDateString();

                    return (
                        <li
                            key={dir.path}
                            className={`dir-item ${isActive ? "active" : ""}`}
                            onClick={() => openDir(dir)}
                            title={`${dir.isSymlink ? "Symlink" : "Directory"} • ${date} • ${dir.path}`} // full path on hover
                        >
                          <span className="dir-icon">
                            {dir.isSymlink ? "🔗" : "📁"}
                          </span>
                            <span className="dir-name">{dir.name}</span> {/* NEW: wrapped */}
                            <span className="dir-date">{date}</span>
                        </li>
                    );
                })}
            </ul>

            {dupesOpen && (
                <DuplicatesModal
                    dir={currentPath === "." ? "" : currentPath}
                    onClose={() => setDupesOpen(false)}
                />
            )}
        </div>
    );
}

export default DirectoryBrowser;
