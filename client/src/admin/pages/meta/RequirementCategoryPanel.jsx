import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const ICON_OPTIONS = ["building", "heart", "edit", "megaphone", "book", "briefcase", "wallet", "target", "layers", "star", "globe", "users"];

const SORT_COLUMNS = {
  name: { label: "Requirement Category", get: (s) => s.name?.toLowerCase() || "" },
  status: { label: "Status", get: (s) => (s.isActive ? 1 : 0) },
  subcategoryCount: { label: "Subcategories", get: (s) => s.subcategoryCount || 0 },
  usageCount: { label: "Requirements Using This", get: (s) => s.usageCount || 0 },
  createdAt: { label: "Created Date", get: (s) => new Date(s.createdAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function CategoryForm({ category, onCancel, onSaved }) {
  const isEdit = !!category;
  const [name, setName] = useState(category?.name || "");
  const [icon, setIcon] = useState(category?.icon || "building");
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
        ? await adminApi.patch(`/requirement-categories/${category.id}`, { name: name.trim(), icon, isActive })
        : await adminApi.post("/requirement-categories", { name: name.trim(), icon, isActive });
      onSaved(data.requirementCategory, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onCancel}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Requirement Category
      </button>
      <h3 style={{ marginBottom: 20 }}>{isEdit ? "Edit Category" : "Add Category"}</h3>
      <form onSubmit={submit} style={{ maxWidth: 480 }}>
        <div className="amx-form-group">
          <label htmlFor="req-category-name">Category Name</label>
          <input id="req-category-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home Service" autoFocus maxLength={255} />
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
        </div>
        <div className="amx-form-group">
          <label htmlFor="req-category-icon">Icon</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="amx-icon-action" style={{ pointerEvents: "none" }}><Icon name={icon || "building"} size={18} /></span>
            <select id="req-category-icon" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ flex: 1 }}>
              {ICON_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
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

function SubcategoryForm({ categoryId, subcategory, onCancel, onSaved }) {
  const isEdit = !!subcategory;
  const [name, setName] = useState(subcategory?.name || "");
  const [isActive, setIsActive] = useState(subcategory ? subcategory.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Subcategory name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/requirement-categories/subcategories/${subcategory.id}`, { name: name.trim(), isActive })
        : await adminApi.post(`/requirement-categories/${categoryId}/subcategories`, { name: name.trim(), isActive });
      onSaved(data.requirementSubcategory, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this subcategory.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="amx-form-group" style={{ maxWidth: 480, margin: "16px 0" }}>
      <label htmlFor="req-subcategory-name">{isEdit ? "Edit Subcategory" : "Subcategory Name"}</label>
      <input id="req-subcategory-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Carpenter" autoFocus maxLength={255} />
      {error && (
        <div className="amx-field-error">
          <Icon name="info" size={14} />
          {error}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0" }}>
        <span className="amx-panel-sub">{isActive ? "Active" : "Inactive"}</span>
        <Toggle on={isActive} onClick={() => setIsActive((a) => !a)} disabled={saving} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="amx-btn amx-btn-primary" disabled={saving || !name.trim()}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Subcategory"}
        </button>
        <button type="button" className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
      </div>
    </form>
  );
}

function ConfirmDeactivateModal({ item, kind, onCancel, onConfirm, busy }) {
  const inUse = (item.usageCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{item.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${item.usageCount} requirement${item.usageCount === 1 ? "" : "s"} already use this ${kind} and will keep it, but it will no longer be offered when submitting a requirement.`
            : `This ${kind} will no longer be offered when submitting a requirement.`}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ item, kind, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{item.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {kind === "category" ? "This can't be undone. Delete its subcategories first if it has any." : "This can't be undone. Requirements that already used this subcategory keep it either way."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

// Manages one category's subcategories -- reached from the category table's
// "Manage Subcategories" action, not its own Meta entity, so it always shows
// its parent category for context and a way back.
function SubcategoryManager({ category, onBack, onCountChange }) {
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [formOpen, setFormOpen] = useState(null); // null | "new" | subcategory
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get(`/requirement-categories/${category.id}/subcategories`)
      .then(({ data }) => setSubcategories(data.requirementSubcategories))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load subcategories."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [category.id]);

  const upsert = (subcategory, isEdit) => {
    setSubcategories((ss) => {
      const next = isEdit ? ss.map((s) => (s.id === subcategory.id ? subcategory : s)) : [...ss, subcategory];
      onCountChange(category.id, next.length);
      return next;
    });
    setFormOpen(null);
    showToast(isEdit ? "Subcategory updated." : "Subcategory added.");
  };

  const activate = async (subcategory) => {
    setBusyId(subcategory.id);
    const prev = subcategory.isActive;
    setSubcategories((ss) => ss.map((s) => (s.id === subcategory.id ? { ...s, isActive: true } : s)));
    try {
      await adminApi.patch(`/requirement-categories/subcategories/${subcategory.id}`, { isActive: true });
      showToast("Subcategory activated.");
    } catch (err) {
      setSubcategories((ss) => ss.map((s) => (s.id === subcategory.id ? { ...s, isActive: prev } : s)));
      showToast(err.response?.data?.message || "Couldn't activate this subcategory.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const subcategory = deactivating;
    setBusyId(subcategory.id);
    try {
      await adminApi.patch(`/requirement-categories/subcategories/${subcategory.id}`, { isActive: false });
      setSubcategories((ss) => ss.map((s) => (s.id === subcategory.id ? { ...s, isActive: false } : s)));
      showToast("Subcategory deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this subcategory.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const subcategory = deleting;
    setBusyId(subcategory.id);
    try {
      await adminApi.delete(`/requirement-categories/subcategories/${subcategory.id}`);
      setSubcategories((ss) => {
        const next = ss.filter((s) => s.id !== subcategory.id);
        onCountChange(category.id, next.length);
        return next;
      });
      showToast("Subcategory deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this subcategory.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <button className="amx-back-link" onClick={onBack}>
        <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Requirement Category
      </button>

      <div className="amx-panel-head">
        <div>
          <h3>{category.name} — Subcategories</h3>
          <div className="amx-panel-sub">Master list of subcategories offered under "{category.name}"</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormOpen("new")}>
          <Icon name="plus" size={15} /> Add Subcategory
        </button>
      </div>

      {formOpen && (
        <SubcategoryForm
          categoryId={category.id}
          subcategory={formOpen === "new" ? null : formOpen}
          onCancel={() => setFormOpen(null)}
          onSaved={upsert}
        />
      )}

      {error && (
        <div className="amx-form-error" style={{ margin: "0 0 16px" }}>
          <Icon name="info" size={17} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="amx-empty">
          <Icon name="clock" />
          <strong>Loading subcategories…</strong>
        </div>
      ) : subcategories.length === 0 ? (
        <div className="amx-empty">
          <Icon name="layers" />
          <strong>No subcategories yet</strong>
          <span>Add the first one above.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>Subcategory</th>
                <th>Status</th>
                <th>Requirements Using This</th>
                <th>Created Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {subcategories.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td><StatusBadge status={s.isActive ? "active" : "inactive"} /></td>
                  <td>{s.usageCount || 0}</td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormOpen(s)}>
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

      {deactivating && (
        <ConfirmDeactivateModal item={deactivating} kind="subcategory" busy={busyId === deactivating.id} onCancel={() => setDeactivating(null)} onConfirm={confirmDeactivate} />
      )}
      {deleting && (
        <ConfirmDeleteModal item={deleting} kind="subcategory" busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

function RequirementCategoryPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null);
  const [managing, setManaging] = useState(null); // category currently being managed for subcategories
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/requirement-categories")
      .then(({ data }) => setCategories(data.requirementCategories))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load requirement categories."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
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

  const onSubcategoryCountChange = (categoryId, count) => {
    setCategories((cs) => cs.map((c) => (c.id === categoryId ? { ...c, subcategoryCount: count } : c)));
  };

  const activate = async (category) => {
    setBusyId(category.id);
    const prev = category.isActive;
    setCategories((cs) => cs.map((c) => (c.id === category.id ? { ...c, isActive: true } : c)));
    try {
      await adminApi.patch(`/requirement-categories/${category.id}`, { isActive: true });
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
      await adminApi.patch(`/requirement-categories/${category.id}`, { isActive: false });
      setCategories((cs) => cs.map((c) => (c.id === category.id ? { ...c, isActive: false } : c)));
      showToast("Category deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this category.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const category = deleting;
    setBusyId(category.id);
    try {
      await adminApi.delete(`/requirement-categories/${category.id}`);
      setCategories((cs) => cs.filter((c) => c.id !== category.id));
      showToast("Category deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this category.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  if (managing) {
    return <SubcategoryManager category={managing} onBack={() => setManaging(null)} onCountChange={onSubcategoryCountChange} />;
  }

  if (formModal) {
    return <CategoryForm category={formModal === "new" ? null : formModal} onCancel={() => setFormModal(null)} onSaved={upsertCategory} />;
  }

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Requirement Category</h3>
          <div className="amx-panel-sub">Master list of categories and subcategories shown on the Add a Requirement form</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Category
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by category…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <strong>Loading requirement categories…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="building" />
          <strong>No requirement categories match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Requirement Category" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Subcategories" sortKey="subcategoryCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Requirements Using This" sortKey="usageCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Icon name={c.icon || "building"} size={16} />
                      <strong>{c.name}</strong>
                    </span>
                  </td>
                  <td><StatusBadge status={c.isActive ? "active" : "inactive"} /></td>
                  <td>{c.subcategoryCount || 0}</td>
                  <td>{c.usageCount || 0}</td>
                  <td>{formatDate(c.createdAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => setManaging(c)}>
                        Manage Subcategories
                      </button>
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
                      {!c.usageCount && !c.subcategoryCount && (
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === c.id} onClick={() => setDeleting(c)}>
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
        <ConfirmDeactivateModal item={deactivating} kind="category" busy={busyId === deactivating.id} onCancel={() => setDeactivating(null)} onConfirm={confirmDeactivate} />
      )}
      {deleting && (
        <ConfirmDeleteModal item={deleting} kind="category" busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default RequirementCategoryPanel;
