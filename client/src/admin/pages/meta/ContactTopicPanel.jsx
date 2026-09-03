import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../components/Icons.jsx";
import { Icon as PublicIcon } from "../../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import SortHeader from "../../components/SortHeader.jsx";
import Pagination from "../../components/Pagination.jsx";
import TranslateFieldsModal from "../../components/TranslateFieldsModal.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDate } from "../../../utils/formatDateTime.js";

const PAGE_SIZE = 100;

// The public Contact Us form renders topic chip icons from the public
// Icons.jsx set (client/src/components/Icons.jsx) — this list is restricted
// to exactly that set so whatever an admin picks here actually exists there.
const ICON_OPTIONS = [
  "compass", "mosque", "shieldCheck", "flag", "globe", "heart", "chartUp", "people", "book", "sun",
  "drop", "monitor", "bulb", "link", "camera", "upload", "trash", "edit", "check", "star",
  "chevronLeft", "chevronRight", "mapPin", "phone", "mail", "building", "wallet", "search", "x", "plus",
  "imageIcon", "play",
];

const SORT_COLUMNS = {
  name: { label: "Topic", get: (t) => t.name?.toLowerCase() || "" },
  status: { label: "Status", get: (t) => (t.isActive ? 1 : 0) },
  contactCount: { label: "Messages Using This", get: (t) => t.contactCount || 0 },
  createdAt: { label: "Created Date", get: (t) => new Date(t.createdAt).getTime() },
  updatedAt: { label: "Updated Date", get: (t) => new Date(t.updatedAt).getTime() },
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function TopicFormModal({ topic, onCancel, onSaved }) {
  const isEdit = !!topic;
  const [name, setName] = useState(topic?.name || "");
  const [icon, setIcon] = useState(topic?.icon || "compass");
  const [isActive, setIsActive] = useState(topic ? topic.isActive : true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Topic name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = isEdit
        ? await adminApi.patch(`/contact-topics/${topic.id}`, { name: name.trim(), icon, isActive })
        : await adminApi.post("/contact-topics", { name: name.trim(), icon, isActive });
      onSaved(data.topic, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this topic.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Topic" : "Add Topic"}</h3>
        <form onSubmit={submit} style={{ marginTop: 16 }}>
          <div className="amx-form-group">
            <label htmlFor="contact-topic-name">Topic Name</label>
            <input id="contact-topic-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Partnership" autoFocus maxLength={255} />
          </div>
          <div className="amx-form-group">
            <label htmlFor="contact-topic-icon">Icon</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--a-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <PublicIcon name={icon} size={18} />
              </span>
              <select id="contact-topic-icon" className="amx-select" style={{ flex: 1 }} value={icon} onChange={(e) => setIcon(e.target.value)}>
                {ICON_OPTIONS.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
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
          <button type="submit" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 12 }} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Topic"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeactivateModal({ topic, onCancel, onConfirm, busy }) {
  const inUse = (topic.contactCount || 0) > 0;
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-neutral-icon"><Icon name="eyeOff" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Deactivate "{topic.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          {inUse
            ? `${topic.contactCount} message${topic.contactCount === 1 ? "" : "s"} already use this topic and will keep it, but it will no longer be offered on the Contact Us form.`
            : "This topic will no longer be offered on the Contact Us form."}
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Deactivate"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ topic, onCancel, onConfirm, busy }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className="amx-modal-danger-icon"><Icon name="trash" size={22} /></div>
        <h3 style={{ textAlign: "center" }}>Delete "{topic.name}"?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>This can't be undone. Existing messages already filed under this topic keep their record either way.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function ContactTopicPanel() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [toast, setToast] = useState(null);
  const [formModal, setFormModal] = useState(null); // null | "new" | topic object (edit)
  const [deactivating, setDeactivating] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [translating, setTranslating] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/contact-topics")
      .then(({ data }) => setTopics(data.topics))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load topics."))
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
    return topics.filter((t) => {
      const matchesQuery = !q || t.name.toLowerCase().includes(q);
      const matchesStatus = status === "all" || (status === "active" ? t.isActive : !t.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [topics, query, status]);

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

  const upsertTopic = (topic, isEdit) => {
    setTopics((ts) => (isEdit ? ts.map((t) => (t.id === topic.id ? topic : t)) : [...ts, topic]));
    setFormModal(null);
    showToast(isEdit ? "Topic updated." : "Topic added.");
  };

  const activate = async (topic) => {
    setBusyId(topic.id);
    const prev = topic.isActive;
    setTopics((ts) => ts.map((t) => (t.id === topic.id ? { ...t, isActive: true } : t)));
    try {
      await adminApi.patch(`/contact-topics/${topic.id}`, { isActive: true });
      showToast("Topic activated.");
    } catch (err) {
      setTopics((ts) => ts.map((t) => (t.id === topic.id ? { ...t, isActive: prev } : t)));
      showToast(err.response?.data?.message || "Couldn't activate this topic.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDeactivate = async () => {
    const topic = deactivating;
    setBusyId(topic.id);
    try {
      await adminApi.patch(`/contact-topics/${topic.id}`, { isActive: false });
      setTopics((ts) => ts.map((t) => (t.id === topic.id ? { ...t, isActive: false } : t)));
      showToast("Topic deactivated.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't deactivate this topic.");
    } finally {
      setBusyId(null);
      setDeactivating(null);
    }
  };

  const confirmDelete = async () => {
    const topic = deleting;
    setBusyId(topic.id);
    try {
      await adminApi.delete(`/contact-topics/${topic.id}`);
      setTopics((ts) => ts.filter((t) => t.id !== topic.id));
      showToast("Topic deleted.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't delete this topic.");
    } finally {
      setBusyId(null);
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Contact Topics</h3>
          <div className="amx-panel-sub">Master list of "What's this about?" topics offered on the Contact Us form</div>
        </div>
        <button className="amx-btn amx-btn-primary" onClick={() => setFormModal("new")}>
          <Icon name="plus" size={15} /> Add Topic
        </button>
      </div>

      <div className="amx-filters">
        <div className="amx-search">
          <Icon name="search" />
          <input type="text" placeholder="Search by topic…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
          <Icon name="mail" />
          <strong>Loading topics…</strong>
        </div>
      ) : filtered.length === 0 ? (
        <div className="amx-empty">
          <Icon name="mail" />
          <strong>No topics match your filters</strong>
          <span>Try a different search term or status filter.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th></th>
                <SortHeader label="Topic" sortKey="name" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Messages Using This" sortKey="contactCount" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Created Date" sortKey="createdAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated Date" sortKey="updatedAt" activeKey={sortKey} direction={sortDir} onSort={toggleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((t) => (
                <tr key={t.id}>
                  <td style={{ width: 40 }}>
                    <span style={{ width: 30, height: 30, borderRadius: 7, background: "var(--a-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <PublicIcon name={t.icon} size={15} />
                    </span>
                  </td>
                  <td><strong>{t.name}</strong></td>
                  <td><StatusBadge status={t.isActive ? "active" : "inactive"} /></td>
                  <td>{t.contactCount || 0}</td>
                  <td>{formatDate(t.createdAt)}</td>
                  <td>{formatDate(t.updatedAt)}</td>
                  <td>
                    <div className="amx-row-actions">
                      <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setFormModal(t)}>
                        <Icon name="edit" />
                      </button>
                      <button className="amx-icon-action" aria-label="Translate" title="Translate" onClick={() => setTranslating(t)}>
                        <Icon name="globe" />
                      </button>
                      {t.isActive ? (
                        <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={busyId === t.id} onClick={() => setDeactivating(t)}>
                          Deactivate
                        </button>
                      ) : (
                        <button className="amx-btn amx-btn-accent amx-btn-sm" disabled={busyId === t.id} onClick={() => activate(t)}>
                          Activate
                        </button>
                      )}
                      {!t.contactCount && (
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" disabled={busyId === t.id} onClick={() => setDeleting(t)}>
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
        <TopicFormModal
          topic={formModal === "new" ? null : formModal}
          onCancel={() => setFormModal(null)}
          onSaved={upsertTopic}
        />
      )}

      {deactivating && (
        <ConfirmDeactivateModal
          topic={deactivating}
          busy={busyId === deactivating.id}
          onCancel={() => setDeactivating(null)}
          onConfirm={confirmDeactivate}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          topic={deleting}
          busy={busyId === deleting.id}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}

      {translating && (
        <TranslateFieldsModal
          title={`Translate "${translating.name}"`}
          category="contactTopic"
          entityKey={`contactTopic.${translating.id}`}
          defaultLabel={translating.name}
          onCancel={() => setTranslating(null)}
          onSaved={() => {
            setTranslating(null);
            showToast("Translations saved.");
          }}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default ContactTopicPanel;
