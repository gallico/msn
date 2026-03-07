import React, { useState, useEffect } from "react";
import { getSettings, saveSettings } from "../services/settingsApi";
import DirPickerModal from "./DirPickerModal";

function SettingsModal({ onClose, onSave }) {
    const [baseFolder, setBaseFolder] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        getSettings()
            .then((s) => setBaseFolder(s.baseFolder))
            .catch(() => setError("Failed to load settings"));
    }, []);

    const handleSave = async () => {
        setError("");
        setSaving(true);
        try {
            await saveSettings({ baseFolder });
            onSave();
        } catch (e) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>Settings</h2>
                    <button className="settings-close-btn" onClick={onClose}>✕</button>
                </div>
                <div className="settings-body">
                    <label>
                        <span>Base media folder</span>
                        <div className="settings-path-row">
                            <input
                                type="text"
                                value={baseFolder}
                                onChange={(e) => setBaseFolder(e.target.value)}
                                placeholder="/path/to/media"
                                spellCheck={false}
                            />
                            <button type="button" onClick={() => setPickerOpen(true)}>Browse…</button>
                        </div>
                    </label>
                    {error && <div className="settings-error">{error}</div>}
                </div>

                {pickerOpen && (
                    <DirPickerModal
                        initialPath={baseFolder || "/"}
                        onSelect={(path) => { setBaseFolder(path); setPickerOpen(false); }}
                        onClose={() => setPickerOpen(false)}
                    />
                )}
                <div className="settings-footer">
                    <button onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
