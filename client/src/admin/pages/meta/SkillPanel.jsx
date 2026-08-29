import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Skill Name", get: (s) => s.name?.toLowerCase() || "" },
  status: { label: "Status", get: (s) => (s.isActive ? 1 : 0) },
  usageCount: { label: "Members Using This", get: (s) => s.usageCount || 0 },
  createdAt: { label: "Created Date", get: (s) => new Date(s.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (s) => new Date(s.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function SkillFormModal({ skill, onCancel, onSaved }) {
  const isEdit = !!skill;
  const [name, setName] = useState(skill?.name || "");
  const [isActive, setIsActive] = useState(skill ? skill.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Skill name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/skills/${skill.id}`, { name: name.trim(), isActive })
        : await adminApi.post("/skills", { name: name.trim(), isActive });
      onSaved(data.skill, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this skill.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Skill" : "Add Skill"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="skill-name">Skill Name</label>
            <input id="skill-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Project Management" autoFocus maxLength={255} />
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Skill"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeactivateModal({ skill, onCancel, onConfirm, busy }) {
  const inUse = (skill.usageCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{skill.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${skill.usageCount} member${skill.usageCount === 1 ? "" : "s"} already added this skill and will keep it, but it will no longer be offered in the profile picker.`
            : "This skill will no longer be offered in the profile picker."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ skill, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{skill.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>This can't be undone. Members who already added this skill keep it either way.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function SkillPanel() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | skill object (edit)
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/skills")
      .then(({ data }) => setSkills(data.skills))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load skills."))
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
    return skills.filter((s) => {
      const matchesQuery = !q || s.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? s.isActive : !s.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [skills, query, status]);

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

  const upsertSkill = (skill, isEdit) => {
    setSkills((ss) => (isEdit ? ss.map((s) => (s.id === skill.id ? skill : s)) : [...ss, skill]));
    setFormModal(null);
    showToast(isEdit ? "Skill updated." : "Skill added.");
  };

  const activate = async (skill) => {
    setBusyId(skill.id);
    const prev = skill.isActive;
    setSkills((ss) => ss.map((s) => (s.id === skill.id ? { ...s, isActive: true } : s)));
    try {
      await adminApi.patch(`/skills/${skill.id}`, { isActive: true });
      showToast("Skill activated.");
    } catch (err) {
      setSkills((ss) => ss.map((s) => (s.id === skill.id ? { ...s, isActive: prev } : s)));
      showToast(err.response?.data?.message || "Couldn't activate this skill.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const skill = deactivating;
    setBusyId(skill.id);
    try {
      await adminApi.patch(`/skills/${skill.id}`, { isActive: false });
      setSkills((ss) => ss.map((s) => (s.id === skill.id ? { ...s, isActive: false } : s)));
      showToast("Skill deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this skill.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const skill = deleting;
    setBusyId(skill.id);
    try {
      await adminApi.delete(`/skills/${skill.id}`);
      setSkills((ss) => ss.filter((s) => s.id !== skill.id));
      showToast("Skill deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this skill.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Skills</h3>
          <div className="amx-panel-sub">Master list of skills offered when members build their profile</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Skill
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by skill name…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="target" />
          <strong>Loading skills…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="target" />
          <strong>No skills match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Skill Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Members Using This" sortKey="usageCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
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

      {formModal && (
        <SkillFormModal
          skill={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertSkill}
        />
      )}

      {deactivating && (
        <ConfirmDeactivateModal
          skill={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          skill={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default SkillPanel;
