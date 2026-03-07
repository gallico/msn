import React, { useState } from "react";
import { createAttrDef } from "../services/attrsApi";

const SEARCH_THRESHOLD = 8;

function AttrSelector({ defs, onDefCreated, selected, onToggle, onSetValue, onDeleteDef }) {
    const [filter, setFilter] = useState("");
    const [addingNew, setAddingNew] = useState(false);
    const [newName, setNewName] = useState("");
    const [newHasValue, setNewHasValue] = useState(false);
    const [error, setError] = useState("");

    const useSearch = defs.length > SEARCH_THRESHOLD;
    const visible = useSearch && filter.trim()
        ? defs.filter((d) => d.name.toLowerCase().includes(filter.toLowerCase()))
        : defs;

    const addDef = async () => {
        if (!newName.trim()) return;
        setError("");
        try {
            const def = await createAttrDef(newName.trim(), newHasValue);
            onDefCreated(def);
            onToggle(def); // auto-select the new attribute
            setNewName("");
            setNewHasValue(false);
            setAddingNew(false);
        } catch (e) {
            setError(e.message);
        }
    };

    return (
        <div className="attr-selector">
            {useSearch && (
                <input
                    type="text"
                    className="attr-search"
                    placeholder="Search attributes…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            )}

            <div className={`attr-selector-list${useSearch ? " scrollable" : ""}`}>
                {visible.map((def) => {
                    const active = def.name in selected;
                    return (
                        <div key={def.name} className="attr-row">
                            <label className="attr-check">
                                <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={() => onToggle(def)}
                                />
                                <span>{def.name}</span>
                            </label>
                            {!!def.hasValue && active && (
                                <input
                                    type="number"
                                    min={0}
                                    max={9}
                                    value={selected[def.name] ?? 5}
                                    onChange={(e) => onSetValue(def.name, e.target.value)}
                                    className="attr-value-input"
                                />
                            )}
                            {onDeleteDef && (
                                <button
                                    className="attr-del-btn"
                                    onClick={() => onDeleteDef(def.name)}
                                    title="Delete attribute definition"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    );
                })}
                {useSearch && filter.trim() && visible.length === 0 && (
                    <div className="attr-no-results">No match for "{filter}"</div>
                )}
            </div>

            {addingNew ? (
                <div className="attr-new-row">
                    <input
                        type="text"
                        placeholder="Name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addDef()}
                        autoFocus
                        className="attr-new-name"
                    />
                    <label className="attr-type-check">
                        <input
                            type="checkbox"
                            checked={newHasValue}
                            onChange={(e) => setNewHasValue(e.target.checked)}
                        />
                        0–9
                    </label>
                    <button onClick={addDef}>Add</button>
                    <button onClick={() => { setAddingNew(false); setNewName(""); }}>✕</button>
                </div>
            ) : (
                <button className="attr-add-btn" onClick={() => setAddingNew(true)}>
                    + New attribute
                </button>
            )}

            {error && <div className="attr-error">{error}</div>}
        </div>
    );
}

export default AttrSelector;
