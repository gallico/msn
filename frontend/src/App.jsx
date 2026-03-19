// frontend/src/App.js
import React, { useState, useEffect } from "react";
import Gallery from "./components/Gallery";
import DirectoryBrowser from "./components/DirectoryBrowser";
import SettingsModal from "./components/SettingsModal";
import ZipUpload from "./components/ZipUpload";
import LoginForm from "./components/LoginForm";
import ViewBuilder from "./components/ViewBuilder";
import { checkAuth, logout } from "./services/authApi";
import { fetchViews, deleteView } from "./services/viewsApi";
import "./index.css";
import "./App.css";

function App() {
    const [dir, setDir] = useState("");
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizing, setIsResizing] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Auth state: null = unknown, false = need login, true = authenticated
    const [authReady, setAuthReady] = useState(null);

    // Sidebar tab: "folders" | "views"
    const [sidebarTab, setSidebarTab] = useState("folders");

    // Saved views list
    const [views, setViews] = useState([]);
    const [activeView, setActiveView] = useState(null); // { id, name, rule } | null
    const [editingView, setEditingView] = useState(undefined); // undefined=closed, null=new, obj=editing
    const [viewRefreshKey, setViewRefreshKey] = useState(0);
    useEffect(() => {
        checkAuth().then(({ enabled, authenticated }) => {
            setAuthReady(!enabled || authenticated);
        }).catch(() => setAuthReady(true));
    }, []);

    useEffect(() => {
        if (!authReady) return;
        fetchViews().then(setViews).catch(() => {});
    }, [authReady]);

    const handleLogout = async () => {
        await logout();
        setAuthReady(false);
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const newWidth = Math.min(600, Math.max(150, e.clientX));
            setSidebarWidth(newWidth);
        };
        const handleMouseUp = () => { if (isResizing) setIsResizing(false); };
        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);

    const handleSettingsSave = () => {
        setSettingsOpen(false);
        setDir("");
        setRefreshKey((k) => k + 1);
    };

    const handleSelectDir = (d) => {
        setDir(d);
        setActiveView(null); // switch back to folder mode
    };

    const handleSelectView = (view) => {
        setActiveView(view);
        setDir(""); // clear dir selection
    };

    const handleViewSaved = (saved) => {
        setViews(prev => {
            const exists = prev.find(v => v.id === saved.id);
            return exists
                ? prev.map(v => v.id === saved.id ? saved : v)
                : [...prev, saved];
        });
        setEditingView(undefined);
        setActiveView(saved);
        setViewRefreshKey(k => k + 1);
        setSidebarTab("views");
    };

    const handleDeleteView = async (view, e) => {
        e.stopPropagation();
        if (!confirm(`Delete view "${view.name}"?`)) return;
        await deleteView(view.id);
        setViews(prev => prev.filter(v => v.id !== view.id));
        if (activeView?.id === view.id) setActiveView(null);
    };

    if (authReady === null) return null;
    if (authReady === false) return <LoginForm onLogin={() => setAuthReady(true)} />;

    const isViewMode = !!activeView;

    return (
        <div className="App layout">
            <aside className="sidebar" style={{ width: `${sidebarWidth}px` }}>
                <div className="sidebar-heading">
                    <div className="sidebar-tabs">
                        <button
                            className={`sidebar-tab${sidebarTab === "folders" ? " active" : ""}`}
                            onClick={() => setSidebarTab("folders")}
                        >Folders</button>
                        <button
                            className={`sidebar-tab${sidebarTab === "views" ? " active" : ""}`}
                            onClick={() => setSidebarTab("views")}
                        >Views</button>
                    </div>
                    <div className="sidebar-actions">
                        <button className="settings-btn" onClick={() => setSettingsOpen(true)} title="Settings">⚙</button>
                        <button className="settings-btn" onClick={handleLogout} title="Sign out">⏻</button>
                    </div>
                </div>

                {sidebarTab === "folders" && (
                    <DirectoryBrowser key={refreshKey} selectedDir={dir} onSelectDir={handleSelectDir} />
                )}

                {sidebarTab === "views" && (
                    <div className="view-list">
                        {views.length === 0 && (
                            <p className="view-list-empty">No saved views yet.</p>
                        )}
                        {views.map(view => (
                            <div
                                key={view.id}
                                className={`view-list-item${activeView?.id === view.id ? " active" : ""}`}
                                onClick={() => handleSelectView(view)}
                            >
                                <span className="view-list-name">{view.name}</span>
                                <div className="view-list-btns">
                                    <button
                                        title="Edit"
                                        onClick={e => { e.stopPropagation(); setEditingView(view); }}
                                    >✎</button>
                                    <button
                                        title="Delete"
                                        onClick={e => handleDeleteView(view, e)}
                                    >×</button>
                                </div>
                            </div>
                        ))}
                        <button
                            className="view-new-btn"
                            onClick={() => setEditingView(null)}
                        >+ New View</button>
                    </div>
                )}
            </aside>

            <div
                className={`resizer${isResizing ? " resizing" : ""}`}
                onMouseDown={() => setIsResizing(true)}
            />

            <main className="main-content">
                <div className="main-header">
                    <h1>Gallery</h1>
                    {!isViewMode && (
                        <ZipUpload currentDir={dir} onDone={() => setRefreshKey((k) => k + 1)} />
                    )}
                </div>
                <div className="current-folder-label">
                    {isViewMode
                        ? <>View: <strong>{activeView.name}</strong></>
                        : <>Showing: {dir ? `/${dir}` : "/"}</>
                    }
                </div>
                {isViewMode
                    ? <Gallery key={`view-${activeView.id}-${viewRefreshKey}`} viewId={activeView.id} />
                    : <Gallery key={refreshKey} dir={dir} />
                }
            </main>

            {settingsOpen && (
                <SettingsModal
                    onClose={() => setSettingsOpen(false)}
                    onSave={handleSettingsSave}
                />
            )}

            {editingView !== undefined && (
                <ViewBuilder
                    editingView={editingView}
                    onSave={handleViewSaved}
                    onClose={() => setEditingView(undefined)}
                />
            )}
        </div>
    );
}

export default App;