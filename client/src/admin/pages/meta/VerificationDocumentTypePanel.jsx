import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const CATEGORY_LABEL = { representative: "Representative", masjid: "Masjid", property: "Property" };

const SORT_COLUMNS = {
  name: { label: "Document Type", get: (d) => d.name?.toLowerCase() || "" },
  category: { label: "Category", get: (d) => d.category || "" },
  status: { label: "Status", get: (d) => (d.isActive ? 1 : 0) },
  isRequired: { label: "Mandatory", get: (d) => (d.isRequired ? 1 : 0) },
  usageCount: { label: "Documents Submitted", get: (d) => d.usageCount || 0 },
  createdAt: { label: "Created Date", get: (d) => new Date(d.createdAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function DocumentTypeForm({ type, onCancel, onSaved }) {
  const isEdit = !!type;
  const [name, setName] = useState(type?.name || "");
  const [category, setCategory] = useState(type?.category || "masjid");
  const [description, setDescription] = useState(type?.description || "");
  const [isActive, setIsActive] = useState(type ? type.isActive : true);
  const [isRequired, setIsRequired] = useState(type ? type.isRequired : false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Document type name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), category, description: description.trim(), isActive, isRequired };
      const { data } = isEdit
        ? await adminApi.patch(`/verification-document-types/${type.id}`, payload)
        : await adminApi.post("/verification-document-types", payload);
      onSaved(data.type, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this document type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Verification Document Type
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Document Type" : "Add Document Type"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="amx-form-group">
          <label htmlFor="doctype-name">Document Type Name</label>
          <input id="doctype-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Property/Land Ownership Document" autoFocus maxLength={255} />
        </div>
        <div className="amx-form-group">
          <label htmlFor="doctype-category">Category</label>
          <select id="doctype-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="representative">Representative — identity document</option>
            <option value="masjid">Masjid — registration/authorization document</option>
            <option value="property">Property — land/ownership document</option>
          </select>
        </div>
        <div className="amx-form-group">
          <label htmlFor="doctype-desc">Description (optional)</label>
          <input id="doctype-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown to the masjid when uploading" maxLength={255} />
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
        <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={{ marginBottom: 0 }}>Mandatory for Green Tick</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="amx-panel-sub">{isRequired ? "Required" : "Optional"}</span>
            <Toggle on={isRequired} onClick={() => setIsRequired((r) => !r)} disabled={saving} />
          </div>
        </div>
        <p className="amx-panel-sub" style={{ marginTop: -4, marginBottom: 16 }}>
          A Green Tick application can't be submitted until every mandatory document type (in its category) has at least one uploaded document.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" className="amx-btn amx-btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Document Type"}
          </button>
          <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function ConfirmDeactivateModal({ type, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{type.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          It will no longer be offered when a masjid uploads Green Tick documents. Already-submitted documents of this type are unaffected.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function VerificationDocumentTypePanel() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/verification-document-types")
      .then(({ data }) => setTypes(data.types))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load document types."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return types.filter((t) => {
      const matchesQuery = !q || t.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? t.isActive : !t.isActive);
      const matchesCategory = category === "all" || t.category === category;
      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [types, query, status, category]);

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

  useEffect(() => setPage(1), [query, status, category, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const upsertType = (type, isEdit) => {
    setTypes((ts) => (isEdit ? ts.map((t) => (t.id === type.id ? type : t)) : [...ts, type]));
    setFormModal(null);
    showToast(isEdit ? "Document type updated." : "Document type added.");
  };

  const activate = async (type) => {
    setBusyId(type.id);
    setTypes((ts) => ts.map((t) => (t.id === type.id ? { ...t, isActive: true } : t)));
    try {
      await adminApi.patch(`/verification-document-types/${type.id}`, { isActive: true });
      showToast("Document type activated.");
    } catch (err) {
      setTypes((ts) => ts.map((t) => (t.id === type.id ? { ...t, isActive: false } : t)));
      showToast(err.response?.data?.message || "Couldn't activate this document type.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const type = deactivating;
    setBusyId(type.id);
    try {
      await adminApi.patch(`/verification-document-types/${type.id}`, { isActive: false });
      setTypes((ts) => ts.map((t) => (t.id === type.id ? { ...t, isActive: false } : t)));
      showToast("Document type deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this document type.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  if (formModal) {
    return <DocumentTypeForm type={formModal === "new" ? null : formModal} onCancel={() => setFormModal(null)} onSaved={upsertType} />;
  }

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Verification Document Type</h3>
          <div className="amx-panel-sub">Documents a masjid can be asked for during Green Tick verification — representative identity, masjid, and property documents.</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Document Type
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by document type name…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="amx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          <option value="representative">Representative</option>
          <option value="masjid">Masjid</option>
          <option value="property">Property</option>
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
        <div className="amx-empty"><Icon name="fileText" /><strong>Loading document types…</strong></div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="fileText" />
          <strong>No document types match your filters</strong>
          <span>Try a different search term, category, or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Document Type" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Category" sortKey="category" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Mandatory" sortKey="isRequired" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Documents Submitted" sortKey="usageCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name}</strong>
                    {t.description && <div className="amx-cell-sub">{t.description}</div>}
                  </td>
                  <td>{CATEGORY_LABEL[t.category] || t.category}</td>
                  <td><StatusBadge status={t.isActive ? "active" : "inactive"} /></td>
                  <td>{t.isRequired ? <StatusBadge status="approved" label="Mandatory" /> : "Optional"}</td>
                  <td>{t.usageCount || 0}</td>
                  <td>{formatDate(t.createdAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(t)}>
                        <Icon name="edit" />
                      </button>
                      {t.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === t.id} onClick={() => setDeactivating(t)}>Deactivate</button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === t.id} onClick={() => activate(t)}>Activate</button>
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

      {deactivating && (
        <ConfirmDeactivateModal type={deactivating} busy={busyId === deactivating.id} onCancel={() => setDeactivating(null)} onConfirm={confirmDeactivate} />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default VerificationDocumentTypePanel;
