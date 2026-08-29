import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Hobby Name", get: (h) => h.name?.toLowerCase() || "" },
  status: { label: "Status", get: (h) => (h.isActive ? 1 : 0) },
  usageCount: { label: "Members Using This", get: (h) => h.usageCount || 0 },
  createdAt: { label: "Created Date", get: (h) => new Date(h.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (h) => new Date(h.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function HobbyFormModal({ hobby, onCancel, onSaved }) {
  const isEdit = !!hobby;
  const [name, setName] = useState(hobby?.name || "");
  const [isActive, setIsActive] = useState(hobby ? hobby.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Hobby name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/hobbies/${hobby.id}`, { name: name.trim(), isActive })
        : await adminApi.post("/hobbies", { name: name.trim(), isActive });
      onSaved(data.hobby, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this hobby.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Hobby" : "Add Hobby"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="hobby-name">Hobby Name</label>
            <input id="hobby-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Photography" autoFocus maxLength={255} />
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Hobby"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeactivateModal({ hobby, onCancel, onConfirm, busy }) {
  const inUse = (hobby.usageCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{hobby.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${hobby.usageCount} member${hobby.usageCount === 1 ? "" : "s"} already added this hobby and will keep it, but it will no longer be offered in the profile picker.`
            : "This hobby will no longer be offered in the profile picker."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ hobby, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{hobby.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>This can't be undone. Members who already added this hobby keep it either way.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function HobbyPanel() {
  const [hobbies, setHobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | hobby object (edit)
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/hobbies")
      .then(({ data }) => setHobbies(data.hobbies))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load hobbies."))
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
    return hobbies.filter((h) => {
      const matchesQuery = !q || h.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? h.isActive : !h.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [hobbies, query, status]);

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

  const upsertHobby = (hobby, isEdit) => {
    setHobbies((hs) => (isEdit ? hs.map((h) => (h.id === hobby.id ? hobby : h)) : [...hs, hobby]));
    setFormModal(null);
    showToast(isEdit ? "Hobby updated." : "Hobby added.");
  };

  const activate = async (hobby) => {
    setBusyId(hobby.id);
    const prev = hobby.isActive;
    setHobbies((hs) => hs.map((h) => (h.id === hobby.id ? { ...h, isActive: true } : h)));
    try {
      await adminApi.patch(`/hobbies/${hobby.id}`, { isActive: true });
      showToast("Hobby activated.");
    } catch (err) {
      setHobbies((hs) => hs.map((h) => (h.id === hobby.id ? { ...h, isActive: prev } : h)));
      showToast(err.response?.data?.message || "Couldn't activate this hobby.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const hobby = deactivating;
    setBusyId(hobby.id);
    try {
      await adminApi.patch(`/hobbies/${hobby.id}`, { isActive: false });
      setHobbies((hs) => hs.map((h) => (h.id === hobby.id ? { ...h, isActive: false } : h)));
      showToast("Hobby deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this hobby.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const hobby = deleting;
    setBusyId(hobby.id);
    try {
      await adminApi.delete(`/hobbies/${hobby.id}`);
      setHobbies((hs) => hs.filter((h) => h.id !== hobby.id));
      showToast("Hobby deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this hobby.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Hobbies</h3>
          <div className="amx-panel-sub">Master list of hobbies offered when members build their profile</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Hobby
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by hobby name…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <strong>Loading hobbies…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="layers" />
          <strong>No hobbies match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Hobby Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Members Using This" sortKey="usageCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((h) => (
                <tr key={h.id}>
                  <td><strong>{h.name}</strong></td>
                  <td><StatusBadge status={h.isActive ? "active" : "inactive"} /></td>
                  <td>{h.usageCount || 0}</td>
                  <td>{formatDate(h.createdAt)}</td>
                  <td>{formatDate(h.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(h)}>
                        <Icon name="edit" />
                      </button>
                      {h.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === h.id} onClick={() => setDeactivating(h)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === h.id} onClick={() => activate(h)}>
                          Activate
                        </button>
                      )}
                      {!h.usageCount && (
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === h.id} onClick={() => setDeleting(h)}>
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
        <HobbyFormModal
          hobby={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertHobby}
        />
      )}

      {deactivating && (
        <ConfirmDeactivateModal
          hobby={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          hobby={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default HobbyPanel;
