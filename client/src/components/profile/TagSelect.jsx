import React, { useMemo, useRef, useState } from "react";
import { Icon } from "../Icons.jsx";

/**
 * Generic searchable multi-select chip input. `options` is the master list
 * ({id, name}[]); `selected` is the caller's chosen items (each needs at
 * least a `name` to render as a chip). Picking an existing option calls
 * `onSelect`, typing a name with no match offers "Add <name>" via
 * `onAddCustom`. The caller owns persistence — this component only surfaces
 * the intent.
 */
function TagSelect({ options, selected, onSelect, onRemove, onAddCustom, allowCustom = true, placeholder, busy, renderChipExtra }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selectedNames = useMemo(() => new Set(selected.map((s) => (s.name || "").toLowerCase())), [selected]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options.filter((o) => !selectedNames.has(o.name.toLowerCase()) && o.name.toLowerCase().includes(q)).slice(0, 8);
  }, [options, query, selectedNames]);

  const exactMatch = matches.some((m) => m.name.toLowerCase() === query.trim().toLowerCase());
  const canAddCustom = allowCustom && query.trim().length > 1 && !exactMatch && !selectedNames.has(query.trim().toLowerCase());
  const noMatches = !allowCustom && query.trim().length > 1 && matches.length === 0;

  const pick = (option) => {
    onSelect(option);
    setQuery("");
    setOpen(false);
  };

  const addCustom = () => {
    onAddCustom(query.trim());
    setQuery("");
    setOpen(false);
  };

  const onDocClick = (e) => {
    if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
  };

  React.useEffect(() => {
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="profile-tagselect">
      {selected.length > 0 && (
        <div className="profile-chip-row">
          {selected.map((item) => (
            <span className="filter-chip active profile-chip" key={item.id}>
              {item.name}
              {renderChipExtra && renderChipExtra(item)}
              <button type="button" aria-label={`Remove ${item.name}`} disabled={busy} onClick={() => onRemove(item)}>
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="profile-tagselect-input" ref={wrapRef}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          disabled={busy}
        />
        {open && (matches.length > 0 || canAddCustom || noMatches) && (
          <ul className="profile-tagselect-list">
            {matches.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => pick(m)}>{m.name}</button>
              </li>
            ))}
            {canAddCustom && (
              <li>
                <button type="button" onClick={addCustom}>
                  <Icon name="plus" size={13} /> Add "{query.trim()}"
                </button>
              </li>
            )}
            {noMatches && <li className="profile-tagselect-empty">No matches</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TagSelect;
