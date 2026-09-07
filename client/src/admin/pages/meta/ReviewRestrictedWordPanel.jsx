import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";
import MicButton from "../../../components/MicButton.jsx";

const PAGE_SIZE = 100;
const CATEGORIES = ["Vulgar/Abusive", "Sexual/Explicit", "Hate/Harassment", "Threatening", "Offensive", "Other"];
const LANGUAGES = [
  { value: "en", field: "textEn", label: "English" },
  { value: "hi", field: "textHi", label: "Hindi" },
  { value: "ur", field: "textUr", label: "Urdu" },
  { value: "ar", field: "textAr", label: "Arabic" },
];
const DETECTION_TYPES = [
  { value: "exact", label: "Exact Match", hint: "Literal match only — no spelling-variation tolerance." },
  { value: "phrase", label: "Phrase Match", hint: "For multi-word phrases — exact word sequence." },
  { value: "variation", label: "Variation Match", hint: "Catches common misspellings (fuuuck, sh1t)." },
  { value: "obfuscation", label: "Obfuscation Match", hint: "Also catches spacing/symbol tricks (f u c k, f.u.c.k)." },
  { value: "ai", label: "Contextual/AI Detection", hint: "No literal text — a category the AI layer classifies, not word-matched." },
];
const SEVERITIES = ["low", "medium", "high", "critical"];

function primaryText(w) {
  return w.textEn || w.textHi || w.textUr || w.textAr || w.variants?.[0] || "";
}

function detectionLabel(value) {
  return DETECTION_TYPES.find((d) => d.value === value)?.label || value;
}

const SORT_COLUMNS = {
  content: { label: "Restricted Term / Phrase", get: (w) => primaryText(w).toLowerCase() },
  category: { label: "Category", get: (w) => w.category || "" },
  detectionType: { label: "Detection Type", get: (w) => w.detectionType || "" },
  severity: { label: "Severity", get: (w) => w.severity || "" },
  status: { label: "Status", get: (w) => (w.isActive ? 1 : 0) },
  createdAt: { label: "Created Date", get: (w) => new Date(w.createdAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function LanguageTags({ word }) {
  const present = LANGUAGES.filter((l) => word[l.field]?.trim());
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {present.map((l) => (
        <span key={l.value} className="amx-badge amx-badge-neutral" title={word[l.field]}>{l.value.toUpperCase()}</span>
      ))}
      {(word.variants?.length || 0) > 0 && (
        <span className="amx-badge amx-badge-neutral" title={word.variants.join(", ")}>+{word.variants.length} variant{word.variants.length === 1 ? "" : "s"}</span>
      )}
      {present.length === 0 && !(word.variants?.length) && <span className="amx-panel-sub">—</span>}
    </div>
  );
}

function VariantsInput({ variants, onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v || variants.includes(v)) { setDraft(""); return; }
    onChange([...variants, v]);
    setDraft("");
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="e.g. a romanized spelling, then press Enter"
        />
        <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={add}>Add</button>
      </div>
      {variants.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {variants.map((v) => (
            <span key={v} className="amx-badge amx-badge-neutral" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {v}
              <button type="button" onClick={() => onChange(variants.filter((x) => x !== v))} aria-label={`Remove ${v}`} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0, color: "inherit" }}>
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function WordForm({ word, onCancel, onSaved }) {
  const isEdit = !!word;
  const [category, setCategory] = useState(word?.category || "Other");
  const [textEn, setTextEn] = useState(word?.textEn || "");
  const [textHi, setTextHi] = useState(word?.textHi || "");
  const [textUr, setTextUr] = useState(word?.textUr || "");
  const [textAr, setTextAr] = useState(word?.textAr || "");
  const [variants, setVariants] = useState(word?.variants || []);
  const [detectionType, setDetectionType] = useState(word?.detectionType || "obfuscation");
  const [severity, setSeverity] = useState(word?.severity || "high");
  const [isActive, setIsActive] = useState(word ? word.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const hasContent = textEn.trim() || textHi.trim() || textUr.trim() || textAr.trim() || variants.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (detectionType !== "ai" && !hasContent) {
      setError("Enter at least one language, or a variant/transliteration.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { category, textEn, textHi, textUr, textAr, variants, detectionType, severity, isActive };
      const { data } = isEdit
        ? await adminApi.patch(`/review-restricted-words/${word.id}`, payload)
        : await adminApi.post("/review-restricted-words", payload);
      onSaved(data.word, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Review Restricted Words
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Restricted Word / Phrase" : "Add Restricted Word / Phrase"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 560 }}>
        <div className="amx-form-group">
          <label htmlFor="word-category">Category</label>
          <select id="word-category" className="amx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="amx-form-group">
          <label>Languages (fill in whichever apply to this entry)</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label htmlFor="word-en" className="amx-panel-sub">English</label>
              <input id="word-en" type="text" value={textEn} onChange={(e) => setTextEn(e.target.value)} placeholder="English term or phrase" maxLength={500} />
            </div>
            <div>
              <label htmlFor="word-hi" className="amx-panel-sub">Hindi (हिंदी)</label>
              <input id="word-hi" type="text" value={textHi} onChange={(e) => setTextHi(e.target.value)} placeholder="Native script" maxLength={500} />
            </div>
            <div>
              <label htmlFor="word-ur" className="amx-panel-sub">Urdu (اردو)</label>
              <input id="word-ur" type="text" value={textUr} onChange={(e) => setTextUr(e.target.value)} placeholder="Native script" maxLength={500} dir="rtl" />
            </div>
            <div>
              <label htmlFor="word-ar" className="amx-panel-sub">Arabic (العربية)</label>
              <input id="word-ar" type="text" value={textAr} onChange={(e) => setTextAr(e.target.value)} placeholder="Native script" maxLength={500} dir="rtl" />
            </div>
          </div>
        </div>

        <div className="amx-form-group">
          <label>Variants / Transliterations</label>
          <div className="amx-panel-sub" style={{ marginBottom: 8 }}>
            Extra spellings, common misspellings, or a Roman/English-keyboard typing of the Hindi/Urdu/Arabic
            form above (e.g. typing an Urdu word using English letters). There's no automatic phonetic
            conversion — add the exact spellings you want caught.
          </div>
          <VariantsInput variants={variants} onChange={setVariants} />
        </div>

        <div className="amx-form-group">
          <label htmlFor="word-detection">Detection Type</label>
          <select id="word-detection" className="amx-select" value={detectionType} onChange={(e) => setDetectionType(e.target.value)}>
            {DETECTION_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <div className="amx-panel-sub" style={{ marginTop: 6 }}>
            {DETECTION_TYPES.find((d) => d.value === detectionType)?.hint}
          </div>
        </div>

        <div className="amx-form-group">
          <label htmlFor="word-severity">Severity</label>
          <select id="word-severity" className="amx-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        {error && (
          <div className="amx-field-error">
            <Icon name="info" size={14} />
            {error}
          </div>
        )}
        <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={{ marginBottom: 0 }}>Status</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="amx-panel-sub">{isActive ? "Active" : "Inactive"}</span>
            <Toggle on={isActive} onClick={() => setIsActive((a) => !a)} disabled={saving} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" className="amx-btn amx-btn-primary" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Entry"}
          </button>
          <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function BulkImportForm({ onCancel, onDone }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Other");
  const [language, setLanguage] = useState("en");
  const [detectionType, setDetectionType] = useState("obfuscation");
  const [severity, setSeverity] = useState("high");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const terms = text.split("\n").map((t) => t.trim()).filter(Boolean);
    if (terms.length === 0) { setError("Enter at least one term, one per line."); return; }
    setBusy(true);
    setError("");
    try {
      const { data } = await adminApi.post("/review-restricted-words/bulk-import", { terms, category, language, detectionType, severity });
      onDone(data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't import these terms.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Review Restricted Words
      </button>
      <h3 style={{ marginBottom: 20 }}>Bulk Import Terms</h3>
      <div className="amx-panel-sub" style={{ marginBottom: 12, maxWidth: 560 }}>
        Each line becomes its own entry in the one language selected below. For an entry with several
        languages together, add it individually instead.
      </div>
      <form onSubmit={submit} style={{ maxWidth: 560 }}>
        <div className="amx-form-group">
          <label htmlFor="bulk-terms">Terms (one per line)</label>
          <div className="amx-textarea-mic-wrap">
            <textarea id="bulk-terms" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={"term one\nterm two\nphrase three"} />
            <MicButton onTranscript={(t) => setText(t)} />
          </div>
        </div>
        <div className="amx-form-group">
          <label htmlFor="bulk-language">Language (applied to all)</label>
          <select id="bulk-language" className="amx-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="amx-form-group">
          <label htmlFor="bulk-category">Category (applied to all)</label>
          <select id="bulk-category" className="amx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="amx-form-group">
          <label htmlFor="bulk-detection">Detection Type (applied to all)</label>
          <select id="bulk-detection" className="amx-select" value={detectionType} onChange={(e) => setDetectionType(e.target.value)}>
            {DETECTION_TYPES.filter((d) => d.value !== "ai").map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div className="amx-form-group">
          <label htmlFor="bulk-severity">Severity (applied to all)</label>
          <select id="bulk-severity" className="amx-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        {error && (
          <div className="amx-field-error">
            <Icon name="info" size={14} />
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" className="amx-btn amx-btn-primary" disabled={busy}>{busy ? "Importing…" : "Import Terms"}</button>
          <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function ConfirmDeleteModal({ word, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete this entry?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          This permanently removes it from the restricted-word library. This can't be undone.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function ReviewRestrictedWordPanel() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("content");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | "import" | word object (edit)
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/review-restricted-words")
      .then(({ data }) => setWords(data.words))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load restricted words."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) => {
      const haystack = [w.textEn, w.textHi, w.textUr, w.textAr, ...(w.variants || [])].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesCategory = categoryFilter === "all" || w.category === categoryFilter;
      const langField = LANGUAGES.find((l) => l.value === languageFilter)?.field;
      const matchesLanguage = languageFilter === "all" || (langField && w[langField]?.trim());
      const matchesStatus = status === "all" || (status === "active" ? w.isActive : !w.isActive);
      return matchesQuery && matchesCategory && matchesLanguage && matchesStatus;
    });
  }, [words, query, categoryFilter, languageFilter, status]);

  const sorted = useMemo(() => {
    const getValue = SORT_COLUMNS[sortKey].get;
    return [...filtered].sort((a, b) => {
      const av = getValue(a), bv = getValue(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  useEffect(() => setPage(1), [query, categoryFilter, languageFilter, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const upsertWord = (word, isEdit) => {
    setWords((ws) => (isEdit ? ws.map((w) => (w.id === word.id ? word : w)) : [...ws, word]));
    setFormModal(null);
    showToast(isEdit ? "Entry updated." : "Entry added.");
  };

  const toggleActive = async (word) => {
    setBusyId(word.id);
    const next = !word.isActive;
    setWords((ws) => ws.map((w) => (w.id === word.id ? { ...w, isActive: next } : w)));
    try {
      await adminApi.patch(`/review-restricted-words/${word.id}`, { isActive: next });
      showToast(next ? "Entry activated." : "Entry deactivated.");
    } catch (err) {
      setWords((ws) => ws.map((w) => (w.id === word.id ? { ...w, isActive: !next } : w)));
      showToast(err.response?.data?.message || "Couldn't update this entry.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const word = deleting;
    setBusyId(word.id);
    try {
      await adminApi.delete(`/review-restricted-words/${word.id}`);
      setWords((ws) => ws.filter((w) => w.id !== word.id));
      showToast("Entry deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this entry.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  if (formModal === "import") {
    return <BulkImportForm onCancel={() => setFormModal(null)} onDone={(result) => { setFormModal(null); load(); showToast(`Imported ${result.imported} of ${result.requested} terms.`); }} />;
  }
  if (formModal) {
    return <WordForm word={formModal === "new" ? null : formModal} onCancel={() => setFormModal(null)} onSaved={upsertWord} />;
  }

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Review Restricted Words</h3>
          <div className="amx-panel-sub">
            Multilingual moderation library — governs Masjid Name/Tagline/About, Reviews, and Community content. Never shown to end users.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" onClick={() => setFormModal("import")}>
            <Icon name="upload" size={15} /> Bulk Import
          </button>
          <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
            <Icon name="plus" size={15} /> Add Entry
          </button>
        </div>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search terms…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="amx-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="amx-select" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
          <option value="all">All languages</option>
          {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select className="amx-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
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
          <Icon name="shield" />
          <strong>Loading restricted words…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="shield" />
          <strong>No entries match your filters</strong>
          <span>Try a different search term, category, language, or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Restricted Term / Phrase" sortKey="content" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th>Languages</th>
                <SortHeader label="Category" sortKey="category" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Detection Type" sortKey="detectionType" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Severity" sortKey="severity" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((w) => (
                <tr key={w.id}>
                  <td><strong>{primaryText(w) || "(variants only)"}</strong></td>
                  <td><LanguageTags word={w} /></td>
                  <td>{w.category}</td>
                  <td>{detectionLabel(w.detectionType)}</td>
                  <td style={{ textTransform: "capitalize" }}>{w.severity}</td>
                  <td><StatusBadge status={w.isActive ? "active" : "inactive"} /></td>
                  <td>{formatDate(w.createdAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(w)}>
                        <Icon name="edit" />
                      </button>
                      {w.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === w.id} onClick={() => toggleActive(w)}>Deactivate</button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === w.id} onClick={() => toggleActive(w)}>Activate</button>
                      )}
                      <button className="amx-icon-action" aria-label="Delete" title="Delete" onClick={() => setDeleting(w)}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {deleting && (
        <ConfirmDeleteModal word={deleting} busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default ReviewRestrictedWordPanel;
