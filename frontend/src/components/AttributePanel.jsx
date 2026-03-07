import React, { useState, useEffect } from "react";
import { getAttrDefs, deleteAttrDef, getFileAttrs, saveFileAttrs } from "../services/attrsApi";
import AttrSelector from "./AttrSelector";

function AttributePanel({ filePath }) {
    const [defs, setDefs] = useState([]);
    const [fileAttrs, setFileAttrs] = useState({});
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({});
    const [error, setError] = useState("");

    useEffect(() => {
        getAttrDefs().then(setDefs).catch(() => {});
    }, []);

    useEffect(() => {
        setEditing(false);
        setError("");
        getFileAttrs(filePath).then(setFileAttrs).catch(() => {});
    }, [filePath]);

    const startEdit = () => {
        setDraft({ ...fileAttrs });
        setEditing(true);
        setError("");
    };

    const cancelEdit = () => {
        setEditing(false);
        setDraft({});
        setError("");
    };

    const toggleAttr = (def) => {
        setDraft((prev) => {
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
        setDraft((prev) => ({ ...prev, [name]: num }));
    };

    const save = async () => {
        setError("");
        try {
            const saved = await saveFileAttrs(filePath, draft);
            setFileAttrs(saved);
            setEditing(false);
            setDraft({});
        } catch (e) {
            setError(e.message);
        }
    };

    const removeDef = async (name) => {
        if (!window.confirm(`Delete attribute "${name}" from all files?`)) return;
        try {
            await deleteAttrDef(name);
            setDefs((prev) => prev.filter((d) => d.name !== name));
            setFileAttrs((prev) => { const n = { ...prev }; delete n[name]; return n; });
            setDraft((prev) => { const n = { ...prev }; delete n[name]; return n; });
        } catch (e) {
            setError(e.message);
        }
    };

    if (editing) {
        return (
            <div className="attr-panel attr-panel-edit">
                <AttrSelector
                    defs={defs}
                    onDefCreated={(def) =>
                        setDefs((prev) => [...prev, def].sort((a, b) => a.name.localeCompare(b.name)))
                    }
                    selected={draft}
                    onToggle={toggleAttr}
                    onSetValue={setValue}
                    onDeleteDef={removeDef}
                />
                {error && <div className="attr-error">{error}</div>}
                <div className="attr-edit-actions">
                    <button onClick={cancelEdit}>Cancel</button>
                    <button className="btn-primary" onClick={save}>Save</button>
                </div>
            </div>
        );
    }

    const assignedNames = Object.keys(fileAttrs);
    return (
        <div className="attr-panel attr-panel-view">
            {assignedNames.length === 0 && (
                <span className="attr-empty">No attributes</span>
            )}
            {assignedNames.map((name) => (
                <span key={name} className="attr-chip">
                    {name}
                    {fileAttrs[name] !== null ? `: ${fileAttrs[name]}` : ""}
                </span>
            ))}
            <button className="attr-edit-btn" onClick={startEdit}>
                Edit
            </button>
        </div>
    );
}

export default AttributePanel;
