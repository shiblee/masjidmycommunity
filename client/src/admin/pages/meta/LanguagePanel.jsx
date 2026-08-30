import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Language", get: (l) => l.name?.toLowerCase() || "" },
  direction: { label: "Direction", get: (l) => l.direction || "" },
  status: { label: "Status", get: (l) => (l.isActive ? 1 : 0) },
  createdAt: { label: "Created Date", get: (l) => new Date(l.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (l) => new Date(l.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function LanguageFormModal({ language, onCancel, onSaved }) {
  const isEdit = !!language;
  const [code, setCode] = useState(language?.code || "");
  const [name, setName] = useState(language?.name || "");
  const [nativeName, setNativeName] = useState(language?.nativeName || "");
  const [direction, setDirection] = useState(language?.direction || "ltr");
  const [isActive, setIsActive] = useState(language ? language.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEdit && !code.trim()) return setError("Language code is required, e.g. en or en-US.");
    if (!name.trim()) return setError("Language name is required.");
    if (!nativeName.trim()) return setError("Native name is required.");
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/languages/${language.id}`, { name: name.trim(), nativeName: nativeName.trim(), direction, isActive })
        : await adminApi.post("/languages", { code: code.trim(), name: name.trim(), nativeName: nativeName.trim(), direction, isActive });
      onSaved(data.language, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this language.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Language" : "Add Language"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          {!isEdit && (
            <div className="amx-form-group">
              <label htmlFor="lang-code">Language Code</label>
              <input id="lang-code" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. en, en-US" autoFocus maxLength={10} />
            </div>
          )}
          <div className="amx-form-group">
            <label htmlFor="lang-name">Name</label>
            <input id="lang-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. English" maxLength={100} />
          </div>
          <div className="amx-form-group">
            <label htmlFor="lang-native-name">Native Name</label>
            <input id="lang-native-name" type="text" value={nativeName} onChange={(e) => setNativeName(e.target.value)} placeholder="e.g. English, हिन्दी, اردو" maxLength={100} />
          </div>
          <div className="amx-form-group">
            <label htmlFor="lang-direction">Direction</label>
            <select id="lang-direction" className="amx-select" value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="ltr">Left-to-Right (LTR)</option>
              <option value="rtl">Right-to-Left (RTL)</option>
            </select>
          </div>
          <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label style={{ marginBottom: 0 }}>Status</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="amx-panel-sub">{isActive ? "Active" : "Inactive"}</span>
              <Toggle on={isActive} onClick={() => setIsActive((a) => !a)} disabled={saving || language?.isDefault} />
            </div>
          </div>
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
          <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Language"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ language, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{language.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>This can't be undone. Any translated content already stored for this language stays in the database but stops being served.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function LanguagePanel() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | language object (edit)
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/languages")
      .then(({ data }) => setLanguages(data.languages))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load languages."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return languages.filter((l) => {
      const matchesQuery = !q || l.name.toLowerCase().includes(q) || l.nativeName.toLowerCase().includes(q) || l.code.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? l.isActive : !l.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [languages, query, status]);

  const sorted = useMemo(() => {
    const getValue = SORT_COLUMNS[sortKey].get;
    return [...filtered].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  useEffect(() => setPage(1), [query, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const upsertLanguage = (language, isEdit) => {
    setLanguages((ls) => (isEdit ? ls.map((l) => (l.id === language.id ? language : l)) : [...ls, language]));
    setFormModal(null);
    showToast(isEdit ? "Language updated." : "Language added.");
  };

  const setDefault = async (language) => {
    setBusyId(language.id);
    try {
      const { data } = await adminApi.patch(`/languages/${language.id}`, { isDefault: true });
      setLanguages((ls) => ls.map((l) => (l.id === data.language.id ? data.language : { ...l, isDefault: false })));
      showToast(`${language.name} is now the default language.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't set this as the default language.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    const language = deleting;
    setBusyId(language.id);
    try {
      await adminApi.delete(`/languages/${language.id}`);
      setLanguages((ls) => ls.filter((l) => l.id !== language.id));
      showToast("Language deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this language.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Languages</h3>
          <div className="amx-panel-sub">Languages the site can be viewed in, and which one is the default</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Language
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by name or code…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
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
          <Icon name="layers" />
          <strong>Loading languages…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="layers" />
          <strong>No languages match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Language" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Direction" sortKey="direction" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.name}</strong> <span className="amx-cell-sub">{l.nativeName} · {l.code}</span>
                    {l.isDefault && <StatusBadge status="active" label="Default" />}
                  </td>
                  <td className="amx-cell-sub">{l.direction.toUpperCase()}</td>
                  <td><StatusBadge status={l.isActive ? "active" : "inactive"} /></td>
                  <td>{formatDate(l.createdAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(l)}>
                        <Icon name="edit" />
                      </button>
                      {!l.isDefault && (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === l.id} onClick={() => setDefault(l)}>
                          Set as Default
                        </button>
                      )}
                      {!l.isDefault && (
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === l.id} onClick={() => setDeleting(l)}>
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={sorted.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {formModal && (
        <LanguageFormModal
          language={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertLanguage}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          language={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default LanguagePanel;
