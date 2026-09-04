import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import TranslateFieldsModal from "../../components/TranslateFieldsModal.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Concern Type", get: (c) => c.name?.toLowerCase() || "" },
  status: { label: "Status", get: (c) => (c.isActive ? 1 : 0) },
  concernCount: { label: "Concerns Using This", get: (c) => c.concernCount || 0 },
  createdAt: { label: "Created Date", get: (c) => new Date(c.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (c) => new Date(c.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function TypeForm({ type, onCancel, onSaved }) {
  const isEdit = !!type;
  const [name, setName] = useState(type?.name || "");
  const [isActive, setIsActive] = useState(type ? type.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Concern type name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/concern-types/${type.id}`, { name: name.trim(), isActive })
        : await adminApi.post("/concern-types", { name: name.trim(), isActive });
      onSaved(data.type, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this concern type.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Type of Concern
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Concern Type" : "Add Concern Type"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="amx-form-group">
          <label htmlFor="concern-type-name">Concern Type Name</label>
          <input id="concern-type-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Payment Related" autoFocus maxLength={255} />
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
        </div>
        <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={{ marginBottom: 0 }}>Status</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="amx-panel-sub">{isActive ? "Active" : "Inactive"}</span>
            <Toggle on={isActive} onClick={() => setIsActive((a) => !a)} disabled={saving} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" className="amx-btn amx-btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Concern Type"}
          </button>
          <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function ConfirmDeactivateModal({ type, onCancel, onConfirm, busy }) {
  const inUse = (type.concernCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{type.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${type.concernCount} concern${type.concernCount === 1 ? "" : "s"} already use this type and will keep it, but it will no longer be offered on the Raise a Concern form.`
            : "This type will no longer be offered on the Raise a Concern form."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ type, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{type.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>This can't be undone. Existing concerns already filed under this type keep their record either way.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function ConcernTypePanel() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | type object (edit)
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [translating, setTranslating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/concern-types")
      .then(({ data }) => setTypes(data.types))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load concern types."))
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
    return types.filter((t) => {
      const matchesQuery = !q || t.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? t.isActive : !t.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [types, query, status]);

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

  const upsertType = (type, isEdit) => {
    setTypes((ts) => (isEdit ? ts.map((t) => (t.id === type.id ? type : t)) : [...ts, type]));
    setFormModal(null);
    showToast(isEdit ? "Concern type updated." : "Concern type added.");
  };

  const activate = async (type) => {
    setBusyId(type.id);
    const prev = type.isActive;
    setTypes((ts) => ts.map((t) => (t.id === type.id ? { ...t, isActive: true } : t)));
    try {
      await adminApi.patch(`/concern-types/${type.id}`, { isActive: true });
      showToast("Concern type activated.");
    } catch (err) {
      setTypes((ts) => ts.map((t) => (t.id === type.id ? { ...t, isActive: prev } : t)));
      showToast(err.response?.data?.message || "Couldn't activate this concern type.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const type = deactivating;
    setBusyId(type.id);
    try {
      await adminApi.patch(`/concern-types/${type.id}`, { isActive: false });
      setTypes((ts) => ts.map((t) => (t.id === type.id ? { ...t, isActive: false } : t)));
      showToast("Concern type deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this concern type.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const type = deleting;
    setBusyId(type.id);
    try {
      await adminApi.delete(`/concern-types/${type.id}`);
      setTypes((ts) => ts.filter((t) => t.id !== type.id));
      showToast("Concern type deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this concern type.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  if (formModal) {
    return <TypeForm type={formModal === "new" ? null : formModal} onCancel={() => setFormModal(null)} onSaved={upsertType} />;
  }

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Type of Concern</h3>
          <div className="amx-panel-sub">Master list of concern types offered on the Raise a Concern form</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Concern Type
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by concern type…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="shield" />
          <strong>Loading concern types…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="shield" />
          <strong>No concern types match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Concern Type" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Concerns Using This" sortKey="concernCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong></td>
                  <td><StatusBadge status={t.isActive ? "active" : "inactive"} /></td>
                  <td>{t.concernCount || 0}</td>
                  <td>{formatDate(t.createdAt)}</td>
                  <td>{formatDate(t.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(t)}>
                        <Icon name="edit" />
                      </button>
                      <button className="amx-icon-action" aria-label="Translate" title="Translate" onClick={() => setTranslating(t)}>
                        <Icon name="globe" />
                      </button>
                      {t.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === t.id} onClick={() => setDeactivating(t)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === t.id} onClick={() => activate(t)}>
                          Activate
                        </button>
                      )}
                      {!t.concernCount && (
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === t.id} onClick={() => setDeleting(t)}>
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

      {deactivating && (
        <ConfirmDeactivateModal
          type={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          type={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {translating && (
        <TranslateFieldsModal
          title={`Translate "${translating.name}"`}
          category="concernType"
          entityKey={`concernType.${translating.id}`}
          defaultLabel={translating.name}
          onCancel={() => setTranslating(null)}
          onSaved={() => {
            setTranslating(null);
            showToast("Translations saved.");
          }}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default ConcernTypePanel;
