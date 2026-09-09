import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icons.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// Multi-select checkbox dropdown for the Jobs board's Skills filter — mirrors
// exploreMasjids/CategoryFilter.jsx exactly (same reusable shape, {id,name}
// options). Selecting more than one skill is an OR (any selected skill
// matches), not AND.
function SkillsFilter({ skills, selected, onChange }) {
  const { t } = useTranslation();
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
    if (selected.includes(name)) onChange(selected.filter((s) => s !== name));
    else onChange([...selected, name]);
  };

  const label =
    selected.length === 0
      ? t("jobs.skillsFilter.any", "Any Skills")
      : selected.length === 1
      ? selected[0]
      : `${selected.length} ${t("jobs.skillsFilter.countSuffix", "Skills")}`;

  return (
    <div className="msj-category-filter" ref={wrapRef}>
      <button type="button" className={`msj-category-filter-trigger ${selected.length ? "active" : ""}`} onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className="msj-category-filter-panel">
          <div className="msj-category-filter-head">
            <span>{t("jobs.skillsFilter.heading", "Skills / Qualifications")}</span>
            {selected.length > 0 && (
              <button type="button" className="msj-clear-all" onClick={() => onChange([])}>{t("jobs.skillsFilter.clearAll", "Clear All")}</button>
            )}
          </div>
          <ul className="msj-category-filter-list">
            {skills.map((s) => (
              <li key={s.id}>
                <label>
                  <input type="checkbox" checked={selected.includes(s.name)} onChange={() => toggle(s.name)} />
                  {s.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SkillsFilter;
