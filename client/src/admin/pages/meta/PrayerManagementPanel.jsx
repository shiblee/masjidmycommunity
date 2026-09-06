import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Prayer", get: (p) => p.name?.toLowerCase() || "" },
  category: { label: "Category", get: (p) => p.category?.toLowerCase() || "" },
  status: { label: "Status", get: (p) => (p.isActive ? 1 : 0) },
  createdAt: { label: "Created Date", get: (p) => new Date(p.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (p) => new Date(p.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function PrayerForm({ prayer, onCancel, onSaved }) {
  const isEdit = !!prayer;
  const [name, setName] = useState(prayer?.name || "");
  const [category, setCategory] = useState(prayer?.category || "");
  const [isActive, setIsActive] = useState(prayer ? prayer.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Prayer name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { name: name.trim(), category: category.trim(), isActive };
      const { data } = isEdit
        ? await adminApi.patch(`/prayers/${prayer.id}`, payload)
        : await adminApi.post("/prayers", payload);
      onSaved(data.prayer, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this prayer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Prayer Management
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Prayer" : "Add Prayer"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="amx-form-group">
          <label htmlFor="prayer-name">Prayer Name</label>
          <input id="prayer-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jumu'ah" autoFocus maxLength={255} />
        </div>
        <div className="amx-form-group">
          <label htmlFor="prayer-category">Category (optional)</label>
          <input id="prayer-category" type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Fard, Sunnah, Jumu'ah" maxLength={255} />
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
        <p className="amx-panel-sub" style={{ marginTop: -4, marginBottom: 16 }}>
          Only active prayers appear in a masjid's Prayer Time Management screen.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button type="submit" className="amx-btn amx-btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Prayer"}
          </button>
          <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function PrayerManagementPanel() {
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | prayer object (edit)
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/prayers")
      .then(({ data }) => setPrayers(data.prayers))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load prayers."))
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
    return prayers.filter((p) => {
      const matchesQuery = !q || p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? p.isActive : !p.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [prayers, query, status]);

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

  const upsertPrayer = (prayer, isEdit) => {
    setPrayers((ps) => (isEdit ? ps.map((p) => (p.id === prayer.id ? prayer : p)) : [...ps, prayer]));
    setFormModal(null);
    showToast(isEdit ? "Prayer updated." : "Prayer added.");
  };

  const toggleActive = async (prayer) => {
    setBusyId(prayer.id);
    const next = !prayer.isActive;
    setPrayers((ps) => ps.map((p) => (p.id === prayer.id ? { ...p, isActive: next } : p)));
    try {
      await adminApi.patch(`/prayers/${prayer.id}`, { isActive: next });
      showToast(next ? "Prayer activated." : "Prayer deactivated.");
    } catch (err) {
      setPrayers((ps) => ps.map((p) => (p.id === prayer.id ? { ...p, isActive: !next } : p)));
      showToast(err.response?.data?.message || "Couldn't update this prayer.");
    } finally {
      setBusyId(null);
    }
  };

  if (formModal) {
    return <PrayerForm prayer={formModal === "new" ? null : formModal} onCancel={() => setFormModal(null)} onSaved={upsertPrayer} />;
  }

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Prayer Management</h3>
          <div className="amx-panel-sub">Prayers offered on every masjid's Prayer Time Management screen — only active ones appear there.</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Prayer
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by prayer name or category…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <strong>Loading prayers…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="clock" />
          <strong>No prayers match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Prayer" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Category" sortKey="category" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.category || "—"}</td>
                  <td><StatusBadge status={p.isActive ? "active" : "inactive"} /></td>
                  <td>{formatDate(p.createdAt)}</td>
                  <td>{formatDate(p.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(p)}>
                        <Icon name="edit" />
                      </button>
                      {p.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === p.id} onClick={() => toggleActive(p)}>Deactivate</button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === p.id} onClick={() => toggleActive(p)}>Activate</button>
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

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default PrayerManagementPanel;
