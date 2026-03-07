import React, { useState, useEffect } from "react";
import { getAttrDefs, bulkAssignAttrs } from "../services/attrsApi";
import AttrSelector from "./AttrSelector";

function BulkAttrModal({ paths, onClose, onDone }) {
    const [defs, setDefs] = useState([]);
    const [selected, setSelected] = useState({});
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getAttrDefs().then(setDefs).catch(() => {});
    }, []);

    const toggle = (def) => {
        setSelected((prev) => {
            const next = { ...prev };
            if (def.name in next) {
                delete next[def.name];
            } else {
                next[def.name] = def.hasValue ? 5 : null;
            }
            return next;
        });
    };

    const setValue = (name, raw) => {
        const num = Math.max(0, Math.min(9, parseInt(raw, 10) || 0));
        setSelected((prev) => ({ ...prev, [name]: num }));
    };

    const apply = async () => {
        if (Object.keys(selected).length === 0) return;
        setSaving(true);
        setError("");
        try {
            await bulkAssignAttrs(paths, selected);
            onDone();
        } catch (e) {
            setError(e.message);
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>Assign attributes — {paths.length} item{paths.length !== 1 ? "s" : ""}</h2>
                    <button className="settings-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="settings-body">
                    {defs.length === 0 && (
                        <p style={{ color: "#888", fontSize: "0.9rem" }}>
                            No attribute definitions yet. Create some by opening a media item and clicking Edit.
                        </p>
                    )}
                    <AttrSelector
                        defs={defs}
                        onDefCreated={(def) =>
                            setDefs((prev) => [...prev, def].sort((a, b) => a.name.localeCompare(b.name)))
                        }
                        selected={selected}
                        onToggle={toggle}
                        onSetValue={setValue}
                    />
                    {error && <div className="settings-error">{error}</div>}
                </div>

                <div className="settings-footer">
                    <button onClick={onClose} disabled={saving}>Cancel</button>
                    <button
                        className="btn-primary"
                        onClick={apply}
                        disabled={saving || Object.keys(selected).length === 0}
                    >
                        {saving ? "Saving…" : "Apply to all"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BulkAttrModal;
