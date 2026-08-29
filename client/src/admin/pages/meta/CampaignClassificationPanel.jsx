import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Classification Name", get: (c) => c.name?.toLowerCase() || "" },
  status: { label: "Status", get: (c) => (c.isActive ? 1 : 0) },
  campaignCount: { label: "Campaigns Using This", get: (c) => c.campaignCount || 0 },
  createdAt: { label: "Created Date", get: (c) => new Date(c.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (c) => new Date(c.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function ClassificationFormModal({ classification, onCancel, onSaved }) {
  const isEdit = !!classification;
  const [name, setName] = useState(classification?.name || "");
  const [isActive, setIsActive] = useState(classification ? classification.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Classification name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/campaign-classifications/${classification.id}`, { name: name.trim(), isActive })
        : await adminApi.post("/campaign-classifications", { name: name.trim(), isActive });
      onSaved(data.classification, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this classification.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Fundraising Classification" : "Add Fundraising Classification"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="camp-class-name">Classification Name</label>
            <input id="camp-class-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zakat" autoFocus maxLength={255} />
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Classification"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeactivateModal({ classification, onCancel, onConfirm, busy }) {
  const inUse = (classification.campaignCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{classification.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${classification.campaignCount} campaign${classification.campaignCount === 1 ? "" : "s"} currently use this classification and will keep it, but it will no longer be offered for new campaigns.`
            : "This classification will no longer be available for new campaigns."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function CampaignClassificationPanel() {
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | classification object (edit)
  const [deactivating, setDeactivating] = useState(null); // classification pending deactivation confirm
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/campaign-classifications")
      .then(({ data }) => setClassifications(data.classifications))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load fundraising classifications."))
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
    return classifications.filter((c) => {
      const matchesQuery = !q || c.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? c.isActive : !c.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [classifications, query, status]);

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

  const upsertClassification = (classification, isEdit) => {
    setClassifications((cs) => (isEdit ? cs.map((c) => (c.id === classification.id ? classification : c)) : [...cs, classification]));
    setFormModal(null);
    showToast(isEdit ? "Classification updated." : "Classification added.");
  };

  const activate = async (classification) => {
    setBusyId(classification.id);
    const prev = classification.isActive;
    setClassifications((cs) => cs.map((c) => (c.id === classification.id ? { ...c, isActive: true } : c)));
    try {
      await adminApi.patch(`/campaign-classifications/${classification.id}`, { isActive: true });
      showToast("Classification activated.");
    } catch (err) {
      setClassifications((cs) => cs.map((c) => (c.id === classification.id ? { ...c, isActive: prev } : c)));
      showToast(err.response?.data?.message || "Couldn't activate this classification.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const classification = deactivating;
    setBusyId(classification.id);
    try {
      await adminApi.patch(`/campaign-classifications/${classification.id}`, { isActive: false });
      setClassifications((cs) => cs.map((c) => (c.id === classification.id ? { ...c, isActive: false } : c)));
      showToast("Classification deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this classification.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Islamic Fundraising Classification</h3>
          <div className="amx-panel-sub">Master list of classifications offered when creating a campaign</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Classification
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by classification name…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="donation" />
          <strong>Loading fundraising classifications…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="donation" />
          <strong>No classifications match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Classification Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
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

      {formModal && (
        <ClassificationFormModal
          classification={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertClassification}
        />
      )}

      {deactivating && (
        <ConfirmDeactivateModal
          classification={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default CampaignClassificationPanel;
