import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Category Name", get: (c) => c.name?.toLowerCase() || "" },
  status: { label: "Status", get: (c) => (c.isActive ? 1 : 0) },
  campaignCount: { label: "Campaigns Using This", get: (c) => c.campaignCount || 0 },
  createdAt: { label: "Created Date", get: (c) => new Date(c.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (c) => new Date(c.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function CategoryForm({ category, onCancel, onSaved }) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name || "");
  const [isActive, setIsActive] = useState(category ? category.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/campaign-categories/${category.id}`, { name: name.trim(), isActive })
        : await adminApi.post("/campaign-categories", { name: name.trim(), isActive });
      onSaved(data.category, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Campaign Category
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Campaign Category" : "Add Campaign Category"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="amx-form-group">
          <label htmlFor="camp-cat-name">Category Name</label>
          <input id="camp-cat-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Construction" autoFocus maxLength={255} />
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Category"}
          </button>
          <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        </div>
      </form>
    </>
  );
}

function ConfirmDeactivateModal({ category, onCancel, onConfirm, busy }) {
  const inUse = (category.campaignCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{category.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${category.campaignCount} campaign${category.campaignCount === 1 ? "" : "s"} currently use this category and will keep it, but it will no longer be offered for new campaigns.`
            : "This category will no longer be available for new campaigns."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function CampaignCategoryPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | category object (edit)
  const [deactivating, setDeactivating] = useState(null); // category pending deactivation confirm
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/campaign-categories")
      .then(({ data }) => setCategories(data.categories))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load campaign categories."))
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
    return categories.filter((c) => {
      const matchesQuery = !q || c.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? c.isActive : !c.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [categories, query, status]);

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

  const upsertCategory = (category, isEdit) => {
    setCategories((cs) => (isEdit ? cs.map((c) => (c.id === category.id ? category : c)) : [...cs, category]));
    setFormModal(null);
    showToast(isEdit ? "Category updated." : "Category added.");
  };

  const activate = async (category) => {
    setBusyId(category.id);
    const prev = category.isActive;
    setCategories((cs) => cs.map((c) => (c.id === category.id ? { ...c, isActive: true } : c)));
    try {
      await adminApi.patch(`/campaign-categories/${category.id}`, { isActive: true });
      showToast("Category activated.");
    } catch (err) {
      setCategories((cs) => cs.map((c) => (c.id === category.id ? { ...c, isActive: prev } : c)));
      showToast(err.response?.data?.message || "Couldn't activate this category.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const category = deactivating;
    setBusyId(category.id);
    try {
      await adminApi.patch(`/campaign-categories/${category.id}`, { isActive: false });
      setCategories((cs) => cs.map((c) => (c.id === category.id ? { ...c, isActive: false } : c)));
      showToast("Category deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this category.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  if (formModal) {
    return <CategoryForm category={formModal === "new" ? null : formModal} onCancel={() => setFormModal(null)} onSaved={upsertCategory} />;
  }

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Campaign Category</h3>
          <div className="amx-panel-sub">Master list of categories offered when creating a campaign</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Campaign Category
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by category name…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="campaign" />
          <strong>Loading campaign categories…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="campaign" />
          <strong>No categories match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Category Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Campaigns Using This" sortKey="campaignCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong></td>
                  <td><StatusBadge status={c.isActive ? "active" : "inactive"} /></td>
                  <td>{c.campaignCount || 0}</td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>{formatDate(c.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(c)}>
                        <Icon name="edit" />
                      </button>
                      {c.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === c.id} onClick={() => setDeactivating(c)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === c.id} onClick={() => activate(c)}>
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
          category={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default CampaignCategoryPanel;
