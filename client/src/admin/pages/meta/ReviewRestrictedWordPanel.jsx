import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;
const CATEGORIES = ["Vulgar/Abusive", "Sexual/Explicit", "Hate/Harassment", "Threatening", "Offensive", "Other"];
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ur", label: "Urdu" },
  { value: "ar", label: "Arabic" },
  { value: "other", label: "Other" },
];

const SORT_COLUMNS = {
  term: { label: "Term / Phrase", get: (w) => w.term?.toLowerCase() || "" },
  category: { label: "Category", get: (w) => w.category || "" },
  language: { label: "Language", get: (w) => w.language || "" },
  status: { label: "Status", get: (w) => (w.isActive ? 1 : 0) },
  createdAt: { label: "Created Date", get: (w) => new Date(w.createdAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function langLabel(code) {
  return LANGUAGES.find((l) => l.value === code)?.label || code;
}

function WordForm({ word, onCancel, onSaved }) {
  const isEdit = !!word;
  const [term, setTerm] = useState(word?.term || "");
  const [category, setCategory] = useState(word?.category || "Other");
  const [language, setLanguage] = useState(word?.language || "en");
  const [isActive, setIsActive] = useState(word ? word.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!term.trim()) { setError("A term or phrase is required."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { term: term.trim(), category, language, isActive };
      const { data } = isEdit
        ? await adminApi.patch(`/review-restricted-words/${word.id}`, payload)
        : await adminApi.post("/review-restricted-words", payload);
      onSaved(data.word, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this term.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Review Restricted Words
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Term" : "Add Restricted Term"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="amx-form-group">
          <label htmlFor="word-term">Term / Phrase</label>
          <input id="word-term" type="text" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. some restricted word" autoFocus maxLength={255} />
        </div>
        <div className="amx-form-group">
          <label htmlFor="word-category">Category</label>
          <select id="word-category" className="amx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="amx-form-group">
          <label htmlFor="word-language">Language</label>
          <select id="word-language" className="amx-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
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
          <button type="submit" className="amx-btn amx-btn-primary" disabled={saving || !term.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Term"}
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const terms = text.split("\n").map((t) => t.trim()).filter(Boolean);
    if (terms.length === 0) { setError("Enter at least one term, one per line."); return; }
    setBusy(true);
    setError("");
    try {
      const { data } = await adminApi.post("/review-restricted-words/bulk-import", { terms, category, language });
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
      <form onSubmit={submit} style={{ maxWidth: 560 }}>
        <div className="amx-form-group">
          <label htmlFor="bulk-terms">Terms (one per line)</label>
          <textarea id="bulk-terms" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={"term one\nterm two\nphrase three"} />
        </div>
        <div className="amx-form-group">
          <label htmlFor="bulk-category">Category (applied to all)</label>
          <select id="bulk-category" className="amx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="amx-form-group">
          <label htmlFor="bulk-language">Language (applied to all)</label>
          <select id="bulk-language" className="amx-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
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
        <h3 style={{ textAlign: "center" }}>Delete this term?</h3>
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
  const [sortKey, setSortKey] = useState("term");
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
      const matchesQuery = !q || w.term.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || w.category === categoryFilter;
      const matchesLanguage = languageFilter === "all" || w.language === languageFilter;
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
    showToast(isEdit ? "Term updated." : "Term added.");
  };

  const toggleActive = async (word) => {
    setBusyId(word.id);
    const next = !word.isActive;
    setWords((ws) => ws.map((w) => (w.id === word.id ? { ...w, isActive: next } : w)));
    try {
      await adminApi.patch(`/review-restricted-words/${word.id}`, { isActive: next });
      showToast(next ? "Term activated." : "Term deactivated.");
    } catch (err) {
      setWords((ws) => ws.map((w) => (w.id === word.id ? { ...w, isActive: !next } : w)));
      showToast(err.response?.data?.message || "Couldn't update this term.");
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
      showToast("Term deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this term.");
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
          <div className="amx-panel-sub">Terms and phrases automatically blocked from masjid reviews — never shown to end users</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" onClick={() => setFormModal("import")}>
            <Icon name="upload" size={15} /> Bulk Import
          </button>
          <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
            <Icon name="plus" size={15} /> Add Term
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
          <strong>No terms match your filters</strong>
          <span>Try a different search term, category, language, or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Term / Phrase" sortKey="term" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Category" sortKey="category" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Language" sortKey="language" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((w) => (
                <tr key={w.id}>
                  <td><strong>{w.term}</strong></td>
                  <td>{w.category}</td>
                  <td>{langLabel(w.language)}</td>
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
