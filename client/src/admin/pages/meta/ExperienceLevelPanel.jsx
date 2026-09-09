import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Experience Level", get: (s) => s.name?.toLowerCase() || "" },
  status: { label: "Status", get: (s) => (s.isActive ? 1 : 0) },
  usageCount: { label: "Jobs Using This", get: (s) => s.usageCount || 0 },
  createdAt: { label: "Created Date", get: (s) => new Date(s.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (s) => new Date(s.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function ExperienceLevelForm({ experienceLevel, onCancel, onSaved }) {
  const isEdit = !!experienceLevel;
  const [name, setName] = useState(experienceLevel?.name || "");
  const [isActive, setIsActive] = useState(experienceLevel ? experienceLevel.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Experience level name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/experience-levels/${experienceLevel.id}`, { name: name.trim(), isActive })
        : await adminApi.post("/experience-levels", { name: name.trim(), isActive });
      onSaved(data.experienceLevel, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this experience level.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Experience Level
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Experience Level" : "Add Experience Level"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="amx-form-group">
          <label htmlFor="experience-level-name">Experience Level Name</label>
          <input id="experience-level-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2-4 years" autoFocus maxLength={255} />
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Experience Level"}
          </button>
          <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function ConfirmDeactivateModal({ experienceLevel, onCancel, onConfirm, busy }) {
  const inUse = (experienceLevel.usageCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{experienceLevel.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${experienceLevel.usageCount} job${experienceLevel.usageCount === 1 ? "" : "s"} already use this experience level and will keep it, but it will no longer be offered when posting a job.`
            : "This experience level will no longer be offered when posting a job."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ experienceLevel, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{experienceLevel.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>This can't be undone. Jobs that already used this experience level keep it either way.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function ExperienceLevelPanel() {
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null);
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/experience-levels")
      .then(({ data }) => setExperienceLevels(data.experienceLevels))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load experience levels."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return experienceLevels.filter((s) => {
      const matchesQuery = !q || s.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? s.isActive : !s.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [experienceLevels, query, status]);

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

  const upsertExperienceLevel = (experienceLevel, isEdit) => {
    setExperienceLevels((ss) => (isEdit ? ss.map((s) => (s.id === experienceLevel.id ? experienceLevel : s)) : [...ss, experienceLevel]));
    setFormModal(null);
    showToast(isEdit ? "Experience level updated." : "Experience level added.");
  };

  const activate = async (experienceLevel) => {
    setBusyId(experienceLevel.id);
    const prev = experienceLevel.isActive;
    setExperienceLevels((ss) => ss.map((s) => (s.id === experienceLevel.id ? { ...s, isActive: true } : s)));
    try {
      await adminApi.patch(`/experience-levels/${experienceLevel.id}`, { isActive: true });
      showToast("Experience level activated.");
    } catch (err) {
      setExperienceLevels((ss) => ss.map((s) => (s.id === experienceLevel.id ? { ...s, isActive: prev } : s)));
      showToast(err.response?.data?.message || "Couldn't activate this experience level.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const experienceLevel = deactivating;
    setBusyId(experienceLevel.id);
    try {
      await adminApi.patch(`/experience-levels/${experienceLevel.id}`, { isActive: false });
      setExperienceLevels((ss) => ss.map((s) => (s.id === experienceLevel.id ? { ...s, isActive: false } : s)));
      showToast("Experience level deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this experience level.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const experienceLevel = deleting;
    setBusyId(experienceLevel.id);
    try {
      await adminApi.delete(`/experience-levels/${experienceLevel.id}`);
      setExperienceLevels((ss) => ss.filter((s) => s.id !== experienceLevel.id));
      showToast("Experience level deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this experience level.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  if (formModal) {
    return <ExperienceLevelForm experienceLevel={formModal === "new" ? null : formModal} onCancel={() => setFormModal(null)} onSaved={upsertExperienceLevel} />;
  }

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Experience Level</h3>
          <div className="amx-panel-sub">Master list of experience levels offered when posting a job</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Experience Level
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by experience level…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="clock" />
          <strong>Loading experience levels…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="clock" />
          <strong>No experience levels match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Experience Level" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Jobs Using This" sortKey="usageCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td><StatusBadge status={s.isActive ? "active" : "inactive"} /></td>
                  <td>{s.usageCount || 0}</td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>{formatDate(s.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(s)}>
                        <Icon name="edit" />
                      </button>
                      {s.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === s.id} onClick={() => setDeactivating(s)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === s.id} onClick={() => activate(s)}>
                          Activate
                        </button>
                      )}
                      {!s.usageCount && (
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === s.id} onClick={() => setDeleting(s)}>
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
          experienceLevel={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          experienceLevel={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default ExperienceLevelPanel;
