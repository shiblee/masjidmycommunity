import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Reason", get: (r) => r.name?.toLowerCase() || "" },
  status: { label: "Status", get: (r) => (r.isActive ? 1 : 0) },
  usageCount: { label: "Reports Using This", get: (r) => r.usageCount || 0 },
  createdAt: { label: "Created Date", get: (r) => new Date(r.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (r) => new Date(r.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function ReasonFormModal({ reason, onCancel, onSaved }) {
  const isEdit = !!reason;
  const [name, setName] = useState(reason?.name || "");
  const [isActive, setIsActive] = useState(reason ? reason.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Reason name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/report-reasons/${reason.id}`, { name: name.trim(), isActive })
        : await adminApi.post("/report-reasons", { name: name.trim(), isActive });
      onSaved(data.reason, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this reason.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Report Reason" : "Add Report Reason"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="report-reason-name">Reason</label>
            <input id="report-reason-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spam" autoFocus maxLength={255} />
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
          <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Reason"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeactivateModal({ reason, onCancel, onConfirm, busy }) {
  const inUse = (reason.usageCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{reason.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${reason.usageCount} past report${reason.usageCount === 1 ? "" : "s"} already used this reason and will keep it on record, but it will no longer be offered on the Report Post form.`
            : "This reason will no longer be offered on the Report Post form."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ reason, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{reason.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>This can't be undone. Past reports already recorded with this reason keep their record either way.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function ReportReasonPanel() {
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | reason object (edit)
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/report-reasons")
      .then(({ data }) => setReasons(data.reasons))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load report reasons."))
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
    return reasons.filter((r) => {
      const matchesQuery = !q || r.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? r.isActive : !r.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [reasons, query, status]);

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

  const upsertReason = (reason, isEdit) => {
    setReasons((rs) => (isEdit ? rs.map((r) => (r.id === reason.id ? reason : r)) : [...rs, reason]));
    setFormModal(null);
    showToast(isEdit ? "Reason updated." : "Reason added.");
  };

  const activate = async (reason) => {
    setBusyId(reason.id);
    const prev = reason.isActive;
    setReasons((rs) => rs.map((r) => (r.id === reason.id ? { ...r, isActive: true } : r)));
    try {
      await adminApi.patch(`/report-reasons/${reason.id}`, { isActive: true });
      showToast("Reason activated.");
    } catch (err) {
      setReasons((rs) => rs.map((r) => (r.id === reason.id ? { ...r, isActive: prev } : r)));
      showToast(err.response?.data?.message || "Couldn't activate this reason.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const reason = deactivating;
    setBusyId(reason.id);
    try {
      await adminApi.patch(`/report-reasons/${reason.id}`, { isActive: false });
      setReasons((rs) => rs.map((r) => (r.id === reason.id ? { ...r, isActive: false } : r)));
      showToast("Reason deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this reason.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const reason = deleting;
    setBusyId(reason.id);
    try {
      await adminApi.delete(`/report-reasons/${reason.id}`);
      setReasons((rs) => rs.filter((r) => r.id !== reason.id));
      showToast("Reason deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this reason.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Report Post Reasons</h3>
          <div className="amx-panel-sub">Master list of reasons offered when a community member reports a Wall post, masjid, or campaign</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Reason
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by reason…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="trash" />
          <strong>Loading report reasons…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="trash" />
          <strong>No reasons match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Reason" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Reports Using This" sortKey="usageCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td><StatusBadge status={r.isActive ? "active" : "inactive"} /></td>
                  <td>{r.usageCount || 0}</td>
                  <td>{formatDate(r.createdAt)}</td>
                  <td>{formatDate(r.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(r)}>
                        <Icon name="edit" />
                      </button>
                      {r.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === r.id} onClick={() => setDeactivating(r)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === r.id} onClick={() => activate(r)}>
                          Activate
                        </button>
                      )}
                      {!r.usageCount && (
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === r.id} onClick={() => setDeleting(r)}>
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
        <ReasonFormModal
          reason={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertReason}
        />
      )}

      {deactivating && (
        <ConfirmDeactivateModal
          reason={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          reason={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default ReportReasonPanel;
