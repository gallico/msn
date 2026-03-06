// frontend/src/App.js
import React, { useState, useEffect } from "react";
import Gallery from "./components/Gallery";
import DirectoryBrowser from "./components/DirectoryBrowser";
import "./index.css";
import "./App.css";

function App() {
    const [dir, setDir] = useState("");
    const [sidebarWidth, setSidebarWidth] = useState(260); // initial width in px
    const [isResizing, setIsResizing] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const minWidth = 150;
            const maxWidth = 600;
            const newWidth = Math.min(
                maxWidth,
                Math.max(minWidth, e.clientX) // distance from left edge
            );
            setSidebarWidth(newWidth);
        };

        const handleMouseUp = () => {
            if (isResizing) setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    const startResizing = () => {
        setIsResizing(true);
    };

    return (
        <div className="App layout">
            <aside
                className="sidebar"
                style={{ width: `${sidebarWidth}px` }}
            >
                <h2>Folders</h2>
                <DirectoryBrowser selectedDir={dir} onSelectDir={setDir} />
            </aside>

            {/* draggable divider */}
            <div
                className={`resizer${isResizing ? " resizing" : ""}`}
                onMouseDown={startResizing}
            />

            <main className="main-content">
                <h1>Gallery</h1>
                <div className="current-folder-label">
                    Showing: {dir ? `/${dir}` : "/"}
                </div>
                <Gallery dir={dir} />
            </main>
        </div>
    );
}

export default App;
