import React, { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import adminApi from "../services/adminApi.js";

// Friendly display names for the raw `category` values stored on each
// Translation row (and used to filter). New categories work with no code
// change here — sectionLabel() falls back to auto-formatting the raw
// camelCase category (e.g. "raiseConcern" -> "Raise Concern") so a new
// page's content is still readable in the admin table immediately, even
// before someone adds a nicer label for it below.
const SECTION_LABELS = {
  aboutUs: "About Us",
  auth: "Login & Registration",
  concern: "Raise a Concern",
  concernType: "Concern Types",
  contact: "Contact Us",
  contactTopic: "Contact Topics",
  footer: "Footer",
  legalCommon: "Legal (Common)",
  legalTerms: "Terms of Use",
  legalPrivacy: "Privacy Policy",
  legalCookies: "Cookie Policy",
  cookiePrefs: "Cookie Preferences",
  nav: "Navigation",
};

function sectionLabel(category) {
  if (SECTION_LABELS[category]) return SECTION_LABELS[category];
  const spaced = String(category || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function TranslationRow({ row, languages, onSaved }) {
  const [values, setValues] = useState(row.values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const dirty = languages.some((l) => (values[l.code] || "") !== (row.values[l.code] || ""));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.put(`/translations/${encodeURIComponent(row.key)}`, { category: row.category, values });
      onSaved(data.translation);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this translation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td>
        <span className="amx-badge amx-badge-neutral">{sectionLabel(row.category)}</span>
      </td>
      <td>
        <code className="amx-mono-cell">{row.key}</code>
      </td>
      {languages.map((l) => (
        <td key={l.code}>
          <textarea
            className="amx-textarea"
            rows={2}
            dir={l.direction}
            value={values[l.code] || ""}
            onChange={(e) => setValues((v) => ({ ...v, [l.code]: e.target.value }))}
            placeholder={l.code === "en" ? "" : "Not translated"}
          />
        </td>
      ))}
      <td>
        <div className="amx-row-actions" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          <button className="amx-btn amx-btn-primary amx-btn-sm" onClick={save} disabled={saving || !dirty}>
            {saving ? "Saving…" : saved ? "Saved" : "Save"}
          </button>
          {error && <span className="amx-field-error" style={{ fontSize: 11 }}>{error}</span>}
        </div>
      </td>
    </tr>
  );
}

function Translations() {
  const [languages, setLanguages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.get("/languages").then(({ data }) => setLanguages(data.languages.filter((l) => l.isActive))).catch(() => {});
    // legalTerms/legalPrivacy/legalCookies are full page content, owned by
    // the Pages module now — kept out of this grid so editors aren't split
    // across two places for the same content. legalCommon (Print, Copy
    // link, ...) stays here since it's UI chrome, not page content.
    const PAGE_CONTENT_CATEGORIES = ["legalTerms", "legalPrivacy", "legalCookies"];
    adminApi
      .get("/translations/categories")
      .then(({ data }) => setCategories(data.categories.filter((c) => !PAGE_CONTENT_CATEGORIES.includes(c))))
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/translations", { params: category ? { category } : {} })
      .then(({ data }) => setRows(data.translations))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load translations."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [category]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.key.toLowerCase().includes(q) || Object.values(r.values).some((v) => v?.toLowerCase().includes(q)));
  }, [rows, query]);

  const onRowSaved = (translation) => {
    setRows((rs) => rs.map((r) => (r.key === translation.key ? translation : r)));
  };

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>Translations</h1>
          <p>Edit the site's translated text for each active language</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search by key or text…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="amx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All sections</option>
            {categories.map((c) => <option key={c} value={c}>{sectionLabel(c)}</option>)}
          </select>
        </div>

        {error && (
          <div className="amx-form-error" style={{ margin: "0 0 16px" }}>
            <Icon name="info" size={17} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="amx-empty">
            <Icon name="layers" />
            <strong>Loading translations…</strong>
          </div>
        ) : languages.length === 0 ? (
          <div className="amx-empty">
            <Icon name="globe" />
            <strong>No active languages</strong>
            <span>Activate at least one language under Meta → Languages first.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="amx-empty">
            <Icon name="layers" />
            <strong>No translation keys match your filters</strong>
            <span>Try a different search term or category.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Key</th>
                  {languages.map((l) => <th key={l.code}>{l.name}</th>)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <TranslationRow key={row.key} row={row} languages={languages} onSaved={onRowSaved} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default Translations;
