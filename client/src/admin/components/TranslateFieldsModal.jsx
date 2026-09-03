import React, { useEffect, useState } from "react";
import Icon from "./Icons.jsx";
import adminApi from "../services/adminApi.js";

// Generic "translate this one admin-created row" modal — reused by any Meta
// panel whose items are shown on the public multi-language site (Contact
// Topics, Type of Concern, ...). Unlike the static site copy translated
// elsewhere, these rows are created/renamed by admins at runtime, so there's
// no fixed t() key to seed ahead of time — instead each row gets its own
// translation key (e.g. "contactTopic.7"), reusing the exact same
// Translation table and upsert endpoint as the main Translations grid.
// English is never edited here — it's just the row's own name field.
function TranslateFieldsModal({ title, category, entityKey, defaultLabel, onCancel, onSaved }) {
  const [languages, setLanguages] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([adminApi.get("/languages"), adminApi.get("/translations", { params: { category } })])
      .then(([langsRes, transRes]) => {
        setLanguages(langsRes.data.languages.filter((l) => l.isActive && l.code !== "en"));
        const row = transRes.data.translations.find((r) => r.key === entityKey);
        setValues(row?.values || {});
      })
      .catch(() => setError("Couldn't load translations."))
      .finally(() => setLoading(false));
  }, [category, entityKey]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Blank fields are left out entirely rather than saved as empty
      // strings, so an untranslated language keeps falling back to the
      // English name instead of showing blank.
      const cleanValues = Object.fromEntries(Object.entries(values).filter(([, v]) => v?.trim()));
      await adminApi.put(`/translations/${encodeURIComponent(entityKey)}`, { category, values: cleanValues });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save translations.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{title}</h3>
        <p className="amx-modal-sub">
          English shows "{defaultLabel}". Add how this should read in other languages — leave one blank to keep showing the English text there.
        </p>
        {loading ? (
          <div className="amx-empty" style={{ padding: 24 }}>
            <strong>Loading…</strong>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 16 }}>
            {languages.map((l) => (
              <div className="amx-form-group" key={l.code}>
                <label htmlFor={`translate-${l.code}`}>{l.nativeName} ({l.name})</label>
                <input
                  id={`translate-${l.code}`}
                  type="text"
                  dir={l.direction}
                  value={values[l.code] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [l.code]: e.target.value }))}
                  placeholder={defaultLabel}
                />
              </div>
            ))}
            {languages.length === 0 && <p className="amx-panel-sub">No other active languages to translate into yet.</p>}
            {error && (
              <div className="amx-field-error">
                <Icon name="info" size={14} />
                {error}
              </div>
            )}
            <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving}>
              {saving ? "Saving…" : "Save Translations"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default TranslateFieldsModal;
