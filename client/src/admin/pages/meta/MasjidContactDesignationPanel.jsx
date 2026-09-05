import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Designation", get: (d) => d.name?.toLowerCase() || "" },
  status: { label: "Status", get: (d) => (d.isActive ? 1 : 0) },
  isRequired: { label: "Mandatory", get: (d) => (d.isRequired ? 1 : 0) },
  usageCount: { label: "People Added", get: (d) => d.usageCount || 0 },
  createdAt: { label: "Created Date", get: (d) => new Date(d.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (d) => new Date(d.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function DesignationForm({ designation, onCancel, onSaved }) {
  const isEdit = !!designation;
  const [name, setName] = useState(designation?.name || "");
  const [isActive, setIsActive] = useState(designation ? designation.isActive : true);
  const [isRequired, setIsRequired] = useState(designation ? designation.isRequired : false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Designation name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/masjid-contact-designations/${designation.id}`, { name: name.trim(), isActive, isRequired })
        : await adminApi.post("/masjid-contact-designations", { name: name.trim(), isActive, isRequired });
      onSaved(data.designation, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this designation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Masjid Contact Designation
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Designation" : "Add Designation"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="amx-form-group">
          <label htmlFor="desig-name">Designation Name</label>
          <input id="desig-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Treasurer" autoFocus maxLength={255} />
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
        <div className="amx-form-group" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label style={{ marginBottom: 0 }}>Mandatory for masjid verification</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="amx-panel-sub">{isRequired ? "Required" : "Optional"}</span>
            <Toggle on={isRequired} onClick={() => setIsRequired((r) => !r)} disabled={saving} />
          </div>
        </div>
        <p className="amx-panel-sub" style={{ marginTop: -4, marginBottom: 16 }}>
          A masjid can't be submitted for verification until every mandatory designation has a verified person.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" className="amx-btn amx-btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Designation"}
          </button>
          <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function ConfirmDeactivateModal({ designation, onCancel, onConfirm, busy }) {
  const inUse = (designation.usageCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{designation.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${designation.usageCount} ${designation.usageCount === 1 ? "person" : "people"} currently added under this designation will keep it, but it will no longer be offered when adding a new contact person.`
            : "This designation will no longer be available when adding a new contact person."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function MasjidContactDesignationPanel() {
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | designation object (edit)
  const [deactivating, setDeactivating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/masjid-contact-designations")
      .then(({ data }) => setDesignations(data.designations))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load masjid contact designations."))
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
    return designations.filter((d) => {
      const matchesQuery = !q || d.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? d.isActive : !d.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [designations, query, status]);

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

  const upsertDesignation = (designation, isEdit) => {
    setDesignations((ds) => (isEdit ? ds.map((d) => (d.id === designation.id ? designation : d)) : [...ds, designation]));
    setFormModal(null);
    showToast(isEdit ? "Designation updated." : "Designation added.");
  };

  const activate = async (designation) => {
    setBusyId(designation.id);
    const prev = designation.isActive;
    setDesignations((ds) => ds.map((d) => (d.id === designation.id ? { ...d, isActive: true } : d)));
    try {
      await adminApi.patch(`/masjid-contact-designations/${designation.id}`, { isActive: true });
      showToast("Designation activated.");
    } catch (err) {
      setDesignations((ds) => ds.map((d) => (d.id === designation.id ? { ...d, isActive: prev } : d)));
      showToast(err.response?.data?.message || "Couldn't activate this designation.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const designation = deactivating;
    setBusyId(designation.id);
    try {
      await adminApi.patch(`/masjid-contact-designations/${designation.id}`, { isActive: false });
      setDesignations((ds) => ds.map((d) => (d.id === designation.id ? { ...d, isActive: false } : d)));
      showToast("Designation deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this designation.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  if (formModal) {
    return <DesignationForm designation={formModal === "new" ? null : formModal} onCancel={() => setFormModal(null)} onSaved={upsertDesignation} />;
  }

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Masjid Contact Designation</h3>
          <div className="amx-panel-sub">Office-bearer roles offered when adding a masjid's contact people — Imam, Mutawalli, and Secretary are mandatory for verification</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Designation
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by designation name…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="verify" />
          <strong>Loading designations…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="verify" />
          <strong>No designations match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Designation" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Mandatory" sortKey="isRequired" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="People Added" sortKey="usageCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td><StatusBadge status={d.isActive ? "active" : "inactive"} /></td>
                  <td>{d.isRequired ? <StatusBadge status="approved" label="Mandatory" /> : "Optional"}</td>
                  <td>{d.usageCount || 0}</td>
                  <td>{formatDate(d.createdAt)}</td>
                  <td>{formatDate(d.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(d)}>
                        <Icon name="edit" />
                      </button>
                      {d.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === d.id} onClick={() => setDeactivating(d)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === d.id} onClick={() => activate(d)}>
                          Activate
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
          designation={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default MasjidContactDesignationPanel;
