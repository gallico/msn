// frontend/src/App.js
import React, { useState, useEffect } from "react";
import Gallery from "./components/Gallery";
import DirectoryBrowser from "./components/DirectoryBrowser";
import SettingsModal from "./components/SettingsModal";
import ZipUpload from "./components/ZipUpload";
import LoginForm from "./components/LoginForm";
import { checkAuth, logout } from "./services/authApi";
import "./index.css";
import "./App.css";

function App() {
    const [dir, setDir] = useState("");
    const [sidebarWidth, setSidebarWidth] = useState(260); // initial width in px
    const [isResizing, setIsResizing] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Auth state: null = unknown, false = need login, true = authenticated
    const [authReady, setAuthReady] = useState(null);

    useEffect(() => {
        checkAuth().then(({ enabled, authenticated }) => {
            setAuthReady(!enabled || authenticated);
        }).catch(() => setAuthReady(true)); // if endpoint fails, don't block the app
    }, []);

    const handleLogout = async () => {
        await logout();
        setAuthReady(false);
    };

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

    const handleSettingsSave = () => {
        setSettingsOpen(false);
        setDir("");
        setRefreshKey((k) => k + 1);
    };

    if (authReady === null) return null; // waiting for auth check
    if (authReady === false) return <LoginForm onLogin={() => setAuthReady(true)} />;

    return (
        <div className="App layout">
            <aside
                className="sidebar"
                style={{ width: `${sidebarWidth}px` }}
            >
                <div className="sidebar-heading">
                    <h2>Folders</h2>
                    <button
                        className="settings-btn"
                        onClick={() => setSettingsOpen(true)}
                        title="Settings"
                    >
                        ⚙
                    </button>
                    <button
                        className="settings-btn"
                        onClick={handleLogout}
                        title="Sign out"
                    >
                        ⏻
                    </button>
                </div>
                <DirectoryBrowser key={refreshKey} selectedDir={dir} onSelectDir={setDir} />
            </aside>

            {/* draggable divider */}
            <div
                className={`resizer${isResizing ? " resizing" : ""}`}
                onMouseDown={startResizing}
            />

            <main className="main-content">
                <div className="main-header">
                    <h1>Gallery</h1>
                    <ZipUpload currentDir={dir} onDone={() => setRefreshKey((k) => k + 1)} />
                </div>
                <div className="current-folder-label">
                    Showing: {dir ? `/${dir}` : "/"}
                </div>
                <Gallery key={refreshKey} dir={dir} />
            </main>

            {settingsOpen && (
                <SettingsModal
                    onClose={() => setSettingsOpen(false)}
                    onSave={handleSettingsSave}
                />
            )}
        </div>
    );
}

export default App;
