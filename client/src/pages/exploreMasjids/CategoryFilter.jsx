import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons.jsx";

/** Multi-select checkbox dropdown for the masjid category filter — selecting
 * more than one category is an OR (any selected category matches), not AND. */
function CategoryFilter({ categories, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const toggle = (name) => {
    if (selected.includes(name)) onChange(selected.filter((c) => c !== name));
    else onChange([...selected, name]);
  };

  const label = selected.length === 0 ? "All Categories" : selected.length === 1 ? selected[0] : `${selected.length} Categories`;

  return (
    <div className="msj-category-filter" ref={wrapRef}>
      <button type="button" className={`msj-category-filter-trigger ${selected.length ? "active" : ""}`} onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="msj-category-filter-panel">
          <div className="msj-category-filter-head">
            <span>Masjid Categories</span>
            {selected.length > 0 && (
              <button type="button" className="msj-clear-all" onClick={() => onChange([])}>Clear All</button>
            )}
          </div>
          <ul className="msj-category-filter-list">
            {categories.map((c) => (
              <li key={c.id}>
                <label>
                  <input type="checkbox" checked={selected.includes(c.name)} onChange={() => toggle(c.name)} />
                  {c.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default CategoryFilter;
