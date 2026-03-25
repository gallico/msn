import React, { useState, useEffect } from "react";
import { createView, updateView } from "../services/viewsApi";

const NUMERIC_OPS = ["=", "!=", ">", ">=", "<", "<="];

function emptyGroup() {
    return { type: "group", combinator: "and", negate: false, rules: [] };
}

function emptyCondition(attrDefs) {
    const first = attrDefs.find(d => !d.predefined) ?? attrDefs[0];
    return {
        type: "condition",
        attr: first?.name ?? "",
        op: first?.hasValue ? ">" : "set",
        value: 0,
    };
}

// ── RuleCondition ─────────────────────────────────────────────────────────────
function RuleCondition({ rule, onChange, onRemove, attrDefs }) {
    const def = attrDefs.find(d => d.name === rule.attr);
    const isNumeric = !!def?.hasValue;

    const setAttr = (attr) => {
        const newDef = attrDefs.find(d => d.name === attr);
        onChange({
            ...rule,
            attr,
            op: newDef?.hasValue ? ">" : "set",
            value: 0,
        });
    };

    const setOp = (op) => onChange({ ...rule, op });
    const setValue = (value) => onChange({ ...rule, value: Number(value) });

    return (
        <div className="rule-condition">
            <select value={rule.attr} onChange={e => setAttr(e.target.value)}>
                {attrDefs.some(d => d.predefined) && attrDefs.some(d => !d.predefined) ? (
                    <>
                        <optgroup label="Predefined">
                            {attrDefs.filter(d => d.predefined).map(d => (
                                <option key={d.name} value={d.name}>{d.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Custom">
                            {attrDefs.filter(d => !d.predefined).map(d => (
                                <option key={d.name} value={d.name}>{d.name}</option>
                            ))}
                        </optgroup>
                    </>
                ) : (
                    attrDefs.map(d => (
                        <option key={d.name} value={d.name}>{d.name}</option>
                    ))
                )}
            </select>

            <select value={rule.op} onChange={e => setOp(e.target.value)}>
                {isNumeric
                    ? NUMERIC_OPS.map(op => <option key={op} value={op}>{op}</option>)
                    : <option value="set">is set</option>
                }
            </select>

            {isNumeric && (
                <input
                    className="rule-value-input"
                    type="number"
                    min={0}
                    max={9}
                    value={rule.value ?? 0}
                    onChange={e => setValue(e.target.value)}
                />
            )}

            <button className="rule-remove-btn" onClick={onRemove} title="Remove">×</button>
        </div>
    );
}

// ── RuleGroup ─────────────────────────────────────────────────────────────────
function RuleGroup({ rule, onChange, onRemove, attrDefs, depth = 0 }) {
    const updateRule = (index, updated) => {
        const rules = rule.rules.map((r, i) => i === index ? updated : r);
        onChange({ ...rule, rules });
    };

    const removeRule = (index) => {
        onChange({ ...rule, rules: rule.rules.filter((_, i) => i !== index) });
    };

    const addCondition = () => {
        if (attrDefs.length === 0) return;
        onChange({ ...rule, rules: [...rule.rules, emptyCondition(attrDefs)] });
    };

    const addGroup = () => {
        onChange({ ...rule, rules: [...rule.rules, emptyGroup()] });
    };

    return (
        <div className={`rule-group${depth > 0 ? " rule-group-nested" : ""}`}>
            <div className="rule-group-header">
                <div className="rule-combinator">
                    <button
                        className={`combinator-btn${rule.combinator === "and" ? " active" : ""}`}
                        onClick={() => onChange({ ...rule, combinator: "and" })}
                    >AND</button>
                    <button
                        className={`combinator-btn${rule.combinator === "or" ? " active" : ""}`}
                        onClick={() => onChange({ ...rule, combinator: "or" })}
                    >OR</button>
                </div>
                <label className="rule-negate-label">
                    <input
                        type="checkbox"
                        checked={rule.negate}
                        onChange={e => onChange({ ...rule, negate: e.target.checked })}
                    />
                    NOT
                </label>
                {onRemove && (
                    <button className="rule-remove-btn rule-group-remove" onClick={onRemove} title="Remove group">×</button>
                )}
            </div>

            <div className="rule-group-rules">
                {rule.rules.map((r, i) =>
                    r.type === "condition" ? (
                        <RuleCondition
                            key={i}
                            rule={r}
                            onChange={updated => updateRule(i, updated)}
                            onRemove={() => removeRule(i)}
                            attrDefs={attrDefs}
                        />
                    ) : (
                        <RuleGroup
                            key={i}
                            rule={r}
                            onChange={updated => updateRule(i, updated)}
                            onRemove={() => removeRule(i)}
                            attrDefs={attrDefs}
                            depth={depth + 1}
                        />
                    )
                )}
            </div>

            <div className="rule-group-add">
                <button onClick={addCondition} disabled={attrDefs.length === 0} title={attrDefs.length === 0 ? "No attributes defined yet — add some in Settings" : undefined}>+ Condition</button>
                <button onClick={addGroup}>+ Group</button>
            </div>
            {attrDefs.length === 0 && depth === 0 && (
                <p className="rule-no-attrs-hint">No attributes defined yet. Add attributes in Settings first.</p>
            )}
        </div>
    );
}

// ── ViewBuilder modal ─────────────────────────────────────────────────────────
function ViewBuilder({ editingView, onSave, onClose }) {
    const [name, setName] = useState(editingView?.name ?? "");
    const [rule, setRule] = useState(editingView?.rule ?? emptyGroup());
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [attrDefs, setAttrDefs] = useState([]);

    useEffect(() => {
        fetch("/api/attrs/defs")
            .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
            .then(setAttrDefs)
            .catch(err => console.error("ViewBuilder: failed to load attr defs:", err));
    }, []);

    const handleSave = async () => {
        if (!name.trim()) { setError("Name is required"); return; }
        setSaving(true);
        setError("");
        try {
            const saved = editingView
                ? await updateView(editingView.id, name.trim(), rule)
                : await createView(name.trim(), rule);
            onSave(saved);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="view-builder-modal" onClick={e => e.stopPropagation()}>
                <h3 className="view-builder-title">
                    {editingView ? "Edit View" : "New View"}
                </h3>

                <div className="view-builder-name-row">
                    <label>Name</label>
                    <input
                        className="view-builder-name-input"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="View name…"
                        autoFocus
                    />
                </div>

                <div className="view-builder-rule-area">
                    <RuleGroup
                        rule={rule}
                        onChange={setRule}
                        attrDefs={attrDefs}
                        depth={0}
                    />
                </div>

                {error && <p className="view-builder-error">{error}</p>}

                <div className="view-builder-actions">
                    <button onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ViewBuilder;