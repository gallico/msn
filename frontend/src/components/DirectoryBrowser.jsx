// frontend/src/components/DirectoryBrowser.js
import React, { useEffect, useState, useRef, useCallback } from "react";
import { browseDir } from "../services/fsApi";

function DirectoryBrowser({ selectedDir, onSelectDir }) {
    const [currentPath, setCurrentPath] = useState(".");
    const [directories, setDirectories] = useState([]);
    const [loading, setLoading] = useState(false);

    // NEW: Refs to save/restore scroll
    const scrollContainerRef = useRef(null);
    const savedScrollTopRef = useRef(0);

    const load = useCallback((path) => {
        // NEW: Save scroll position BEFORE loading new data
        if (scrollContainerRef.current) {
            const scrollHeight = scrollContainerRef.current.scrollHeight;
            const scrollTop = scrollContainerRef.current.scrollTop;
            savedScrollTopRef.current = scrollHeight - scrollTop; // distance from bottom
        }

        setLoading(true);
        browseDir(path)
            .then((data) => {
                setDirectories(data.directories);
                setCurrentPath(data.relPath);
                setLoading(false);
                onSelectDir(data.relPath === "." ? "" : data.relPath);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, [onSelectDir]);

    // NEW: Restore scroll position AFTER directories update
    useEffect(() => {
        if (scrollContainerRef.current && !loading) {
            // Small delay to ensure DOM updated
            requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                    const newScrollHeight = scrollContainerRef.current.scrollHeight;
                    scrollContainerRef.current.scrollTop = newScrollHeight - savedScrollTopRef.current;
                }
            });
        }
    }, [directories, loading]);

    useEffect(() => {
        load(".");
    }, []);

    const goUp = () => {
        if (currentPath === "." || !currentPath) return;
        const parts = currentPath.split(/[\\/]/).filter(Boolean);
        parts.pop();
        const newPath = parts.length ? parts.join("/") : ".";
        load(newPath);
    };

    const openDir = (dir) => {
        load(dir.path);
    };

    return (
        <div className="dir-browser">
            <div className="dir-header">
                <div className="dir-path">
                    Current: {currentPath === "." ? "/" : `/${currentPath}`}
                </div>
                <button onClick={goUp} disabled={currentPath === "."}>
                    ↑ Up
                </button>
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
        </div>
    );
}

export default DirectoryBrowser;
