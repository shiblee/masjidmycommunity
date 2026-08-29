import React, { useEffect, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const TYPES = [
  { key: "all", label: "All Types" },
  { key: "campaign_approved", label: "Campaign Approved" },
  { key: "donation", label: "Donation" },
  { key: "milestone", label: "Fundraising Milestone" },
  { key: "masjid_approved", label: "Masjid Approved" },
  { key: "new_user", label: "New User" },
  { key: "project_update", label: "Project Update" },
  { key: "announcement", label: "System Announcement" },
];
const STATUSES = [
  { key: "all", label: "All Statuses" },
  { key: "hidden", label: "Hidden" },
  { key: "pending_review", label: "Pending Review" },
  { key: "published", label: "Published" },
];

function EditModal({ activity, onCancel, onSave }) {
  const [title, setTitle] = useState(activity.title || "");
  const [body, setBody] = useState(activity.body || "");
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Edit Wall Post</h3>
        <div className="amx-form-group" style={{ marginTop: 16 }}>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="amx-form-group">
          <label>Body</label>
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} onClick={() => onSave({ title, body })}>Save</button>
      </div>
    </div>
  );
}

function CommunityWall() {
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ activities: [], total: 0, pageSize: 20 });
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => {
    adminApi.get("/community", { params: { type, status, page } }).then(({ data }) => setData(data));
  };

  useEffect(() => { load(); }, [type, status, page]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  const act = async (fn, msg) => {
    await fn();
    load();
    showToast(msg);
  };

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Community</span>
          <h1>Community Wall Management</h1>
          <p>Review, publish, and moderate activity that appears on the public My Community Wall</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {data.activities.length === 0 && (
          <div className="amx-empty">
            <Icon name="megaphone" />
            <strong>No activity here</strong>
            <span>Nothing matches this filter right now.</span>
          </div>
        )}

        {data.activities.length > 0 && (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Content</th>
                  <th>User</th>
                  <th>Generated</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.activities.map((a) => (
                  <tr key={a.id}>
                    <td style={{ textTransform: "capitalize" }}>{a.type.replace(/_/g, " ")}{a.isPinned && <Icon name="star" size={13} style={{ marginLeft: 6, verticalAlign: "middle" }} />}</td>
                    <td>
                      <strong>{a.title}</strong>
                      <p className="amx-panel-sub" style={{ marginTop: 2 }}>{a.body}</p>
                    </td>
                    <td>
                      {a.user ? (
                        <>
                          <div>{a.user.fullName} <span className="amx-cell-sub">#{a.user.id}</span></div>
                          <div className="amx-cell-sub">@{a.user.username}</div>
                          <div className="amx-cell-sub">{a.user.email || a.user.mobile || "—"}</div>
                          <StatusBadge status={a.user.status} />
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{formatDateTime(a.createdAt)}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {a.status !== "published" && <button className="amx-icon-action" aria-label="Publish" title="Publish" onClick={() => act(() => adminApi.post(`/community/${a.id}/publish`), "Published.")}><Icon name="check" size={15} /></button>}
                        {a.status === "published" && <button className="amx-icon-action" aria-label="Hide" title="Hide" onClick={() => act(() => adminApi.post(`/community/${a.id}/hide`), "Hidden.")}><Icon name="eyeOff" size={15} /></button>}
                        <button className="amx-icon-action" aria-label={a.isPinned ? "Unpin" : "Pin"} title={a.isPinned ? "Unpin" : "Pin"} onClick={() => act(() => adminApi.post(`/community/${a.id}/${a.isPinned ? "unpin" : "pin"}`), a.isPinned ? "Unpinned." : "Pinned.")}><Icon name="star" size={15} /></button>
                        <button className="amx-icon-action" aria-label="Edit" title="Edit" onClick={() => setEditing(a)}><Icon name="edit" size={15} /></button>
                        <button className="amx-icon-action" aria-label="Delete" title="Delete" onClick={() => act(() => adminApi.delete(`/community/${a.id}`), "Deleted.")}><Icon name="trash" size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={data.total} pageSize={data.pageSize} onChange={setPage} />
      </div>

      {editing && (
        <EditModal
          activity={editing}
          onCancel={() => setEditing(null)}
          onSave={(payload) => act(() => adminApi.patch(`/community/${editing.id}`, payload), "Saved.").then(() => setEditing(null))}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default CommunityWall;
