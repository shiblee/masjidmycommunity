import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate } from "../../utils/formatDateTime.js";

// Admin can post a job with no real user behind it — attributed to the
// platform account (same pattern as adminCampaignController.js's own
// create()), recorded as "Created by Admin" in the job's history rather
// than inventing a userId-less row. Uses the exact same fields/validation
// as the owner-side Add Job form (server/src/controllers/jobController.js's
// validateFields, shared by adminJobController.js), just with a
// quick-create here — the full field set is available immediately after
// on the Job Review page.
function AddJobModal({ onCancel, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError("Job title is required."); return; }
    if (!description.trim()) { setError("Job description is required."); return; }
    if (!location.trim()) { setError("Location is required."); return; }
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.post("/jobs", { title: title.trim(), description: description.trim(), location: location.trim() });
      onCreated(data.job);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't create this job.");
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={() => (saving ? null : onCancel())}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close" disabled={saving}>
          <Icon name="x" size={16} />
        </button>
        <h3>Add Job</h3>
        <p className="amx-modal-sub">Creates a job posted by the platform account. You'll land on its detail page next to fill in the rest (type, experience, skills, deadline…).</p>
        <form onSubmit={submit}>
          <div className="amx-form-group">
            <label htmlFor="new-job-title">Job Title</label>
            <input id="new-job-title" type="text" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekend Qur'an Teacher" maxLength={150} />
          </div>
          <div className="amx-form-group">
            <label htmlFor="new-job-location">Location</label>
            <input id="new-job-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Lucknow, India or Remote" maxLength={150} />
          </div>
          <div className="amx-form-group">
            <label htmlFor="new-job-description">Job Description</label>
            <textarea id="new-job-description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the role and responsibilities" />
          </div>
          {error && (
            <div className="amx-field-error">
              <Icon name="info" size={14} />
              {error}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button type="button" className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="amx-btn amx-btn-primary" style={{ flex: 1 }} disabled={saving}>{saving ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TABS = [
  { key: "all", label: "All Jobs" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
  { key: "expired", label: "Expired" },
  { key: "deleted", label: "Deleted" },
];

function Jobs() {
  const navigate = useNavigate();
  const [addingJob, setAddingJob] = useState(false);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [data, setData] = useState({ jobs: [], total: 0, pageSize: 20, counts: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/jobs", { params: { status: tab, q: q || undefined, page, sortBy, sortDir } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, q, page, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };
  const sortIndicator = (key) => (sortBy === key ? (sortDir === "asc" ? " ↑" : " ↓") : "");

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Community</span>
          <h1>Jobs</h1>
          <p>{data.total} job{data.total === 1 ? "" : "s"} posted across the platform</p>
        </div>
        <button type="button" className="amx-btn amx-btn-primary" onClick={() => setAddingJob(true)}>
          <Icon name="plus" size={15} /> Add Job
        </button>
      </div>

      {addingJob && (
        <AddJobModal
          onCancel={() => setAddingJob(false)}
          onCreated={(job) => navigate(`/admin/jobs/${job.id}`)}
        />
      )}

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => { setTab(t.key); setPage(1); }}>
              {t.label}{t.key !== "all" && data.counts?.[t.key] !== undefined ? ` (${data.counts[t.key]})` : ""}
            </button>
          ))}
        </div>

        <div className="amx-topbar-search" style={{ maxWidth: 360, marginBottom: 20 }}>
          <Icon name="search" />
          <input type="text" placeholder="Search title or location…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>

        {!loading && data.jobs.length === 0 && (
          <div className="amx-empty">
            <Icon name="building" />
            <strong>No jobs here</strong>
            <span>Nothing matches this filter right now.</span>
          </div>
        )}

        {data.jobs.length > 0 && (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("title")}>Job Title{sortIndicator("title")}</th>
                  <th>Posted By</th>
                  <th>Job Type</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("location")}>Location{sortIndicator("location")}</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("createdAt")}>Posted{sortIndicator("createdAt")}</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("applicationDeadline")}>Deadline{sortIndicator("applicationDeadline")}</th>
                  <th style={{ cursor: "pointer" }} onClick={() => toggleSort("status")}>Status{sortIndicator("status")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <strong>{j.title}</strong>
                      <div className="amx-cell-sub">ID {j.id}</div>
                    </td>
                    <td className="amx-cell-sub">{j.poster?.fullName || "—"}</td>
                    <td>{j.jobType}</td>
                    <td className="amx-cell-sub">{j.location}</td>
                    <td>{formatDate(j.createdAt)}</td>
                    <td className="amx-cell-sub">{j.applicationDeadline ? formatDate(j.applicationDeadline) : "—"}</td>
                    <td><StatusBadge status={j.status} /></td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/admin/jobs/${j.id}`} className="amx-btn amx-btn-sm amx-btn-outline">Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={data.total} pageSize={data.pageSize} onChange={setPage} />
      </div>
    </>
  );
}

export default Jobs;
