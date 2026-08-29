import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

const SORT_COLUMNS = {
  name: { label: "Bank Name", get: (b) => b.name?.toLowerCase() || "" },
  status: { label: "Status", get: (b) => (b.isActive ? 1 : 0) },
  usageCount: { label: "Accounts Using This", get: (b) => b.usageCount || 0 },
  createdAt: { label: "Created Date", get: (b) => new Date(b.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (b) => new Date(b.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function BankFormModal({ bank, onCancel, onSaved }) {
  const isEdit = !!bank;
  const [name, setName] = useState(bank?.name || "");
  const [isActive, setIsActive] = useState(bank ? bank.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Bank name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/banks/${bank.id}`, { name: name.trim(), isActive })
        : await adminApi.post("/banks", { name: name.trim(), isActive });
      onSaved(data.bank, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this bank.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Bank" : "Add Bank"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="bank-name">Bank Name</label>
            <input id="bank-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HDFC Bank" autoFocus maxLength={255} />
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
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Bank"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeactivateModal({ bank, onCancel, onConfirm, busy }) {
  const inUse = (bank.usageCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{bank.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${bank.usageCount} donation account${bank.usageCount === 1 ? "" : "s"} already use this bank and will keep it, but it will no longer be offered for new donation accounts.`
            : "This bank will no longer be available when registering a donation account."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ bank, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{bank.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>This can't be undone. Existing donation accounts already using this bank keep their record either way.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function BankPanel() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | bank object (edit)
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/banks")
      .then(({ data }) => setBanks(data.banks))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load banks."))
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
    return banks.filter((b) => {
      const matchesQuery = !q || b.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? b.isActive : !b.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [banks, query, status]);

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

  const upsertBank = (bank, isEdit) => {
    setBanks((bs) => (isEdit ? bs.map((b) => (b.id === bank.id ? bank : b)) : [...bs, bank]));
    setFormModal(null);
    showToast(isEdit ? "Bank updated." : "Bank added.");
  };

  const activate = async (bank) => {
    setBusyId(bank.id);
    const prev = bank.isActive;
    setBanks((bs) => bs.map((b) => (b.id === bank.id ? { ...b, isActive: true } : b)));
    try {
      await adminApi.patch(`/banks/${bank.id}`, { isActive: true });
      showToast("Bank activated.");
    } catch (err) {
      setBanks((bs) => bs.map((b) => (b.id === bank.id ? { ...b, isActive: prev } : b)));
      showToast(err.response?.data?.message || "Couldn't activate this bank.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const bank = deactivating;
    setBusyId(bank.id);
    try {
      await adminApi.patch(`/banks/${bank.id}`, { isActive: false });
      setBanks((bs) => bs.map((b) => (b.id === bank.id ? { ...b, isActive: false } : b)));
      showToast("Bank deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this bank.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const bank = deleting;
    setBusyId(bank.id);
    try {
      await adminApi.delete(`/banks/${bank.id}`);
      setBanks((bs) => bs.filter((b) => b.id !== bank.id));
      showToast("Bank deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this bank.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Banks</h3>
          <div className="amx-panel-sub">Master list of banks offered when registering a masjid's donation account</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Bank
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by bank name…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="wallet" />
          <strong>Loading banks…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="wallet" />
          <strong>No banks match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <SortHeader label="Bank Name" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Accounts Using This" sortKey="usageCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.name}</strong></td>
                  <td><StatusBadge status={b.isActive ? "active" : "inactive"} /></td>
                  <td>{b.usageCount || 0}</td>
                  <td>{formatDate(b.createdAt)}</td>
                  <td>{formatDate(b.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(b)}>
                        <Icon name="edit" />
                      </button>
                      {b.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === b.id} onClick={() => setDeactivating(b)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === b.id} onClick={() => activate(b)}>
                          Activate
                        </button>
                      )}
                      {!b.usageCount && (
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === b.id} onClick={() => setDeleting(b)}>
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
        <BankFormModal
          bank={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertBank}
        />
      )}

      {deactivating && (
        <ConfirmDeactivateModal
          bank={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          bank={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default BankPanel;
