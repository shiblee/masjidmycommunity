import React, { useEffect, useState } from "react";
import { Icon } from "../Icons.jsx";
import userApi from "../../services/userApi.js";

const EMPLOYMENT_TYPES = [
  { value: "", label: "Select" },
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "self_employed", label: "Self-employed" },
  { value: "volunteer", label: "Volunteer" },
];

const EMPLOYMENT_LABEL = Object.fromEntries(EMPLOYMENT_TYPES.map((t) => [t.value, t.label]));

function monthYear(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function EntryModal({ entry, onCancel, onSaved }) {
  const isEdit = !!entry;
  const [form, setForm] = useState({
    company: entry?.company || "",
    title: entry?.title || "",
    employmentType: entry?.employmentType || "",
    startDate: entry?.startDate || "",
    endDate: entry?.endDate || "",
    isCurrent: entry?.isCurrent || false,
    location: entry?.location || "",
    description: entry?.description || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company.trim() || !form.title.trim() || !form.startDate) {
      setError("Company, title, and start date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, endDate: form.isCurrent ? null : form.endDate || null };
      const { data } = isEdit
        ? await userApi.patch(`/me/work-experience/${entry.id}`, payload)
        : await userApi.post("/me/work-experience", payload);
      onSaved(data.workExperience, isEdit);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="msj-modal-overlay" onClick={onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{isEdit ? "Edit Work Experience" : "Add Work Experience"}</h3>
        <form onSubmit={submit}>
          {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}

          <div className="auth-field">
            <label>Company / Organization</label>
            <input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} autoFocus />
          </div>
          <div className="auth-field">
            <label>Job Title / Position</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="auth-field">
            <label>Employment Type</label>
            <select value={form.employmentType} onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="profile-field-grid">
            <div className="auth-field">
              <label>Start Date</label>
              <input type="month" value={form.startDate?.slice(0, 7) || ""} onChange={(e) => setForm((f) => ({ ...f, startDate: `${e.target.value}-01` }))} />
            </div>
            <div className="auth-field">
              <label>End Date</label>
              <input type="month" disabled={form.isCurrent} value={form.endDate?.slice(0, 7) || ""} onChange={(e) => setForm((f) => ({ ...f, endDate: `${e.target.value}-01` }))} />
            </div>
          </div>

          <label className="profile-checkbox-field">
            <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm((f) => ({ ...f, isCurrent: e.target.checked, endDate: e.target.checked ? "" : f.endDate }))} />
            I currently work here
          </label>

          <div className="auth-field">
            <label>Location</label>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Lucknow, India" />
          </div>
          <div className="auth-field">
            <label>Description / Responsibilities</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </form>
      </div>
    </div>
  );
}

function WorkExperienceCard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "new" | entry
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    userApi.get("/me/work-experience").then(({ data }) => setEntries(data.workExperience)).finally(() => setLoading(false));
  }, []);

  const upsert = (entry, isEdit) => {
    setEntries((es) => {
      const next = isEdit ? es.map((e) => (e.id === entry.id ? entry : e)) : [...es, entry];
      return [...next].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    });
    setModal(null);
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await userApi.delete(`/me/work-experience/${deleting.id}`);
      setEntries((es) => es.filter((e) => e.id !== deleting.id));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>Work Experience</h3>
        <button type="button" className="btn btn-outline-ink" onClick={() => setModal("new")}>
          <Icon name="plus" size={14} /> Add Work Experience
        </button>
      </div>

      {loading ? (
        <p className="msj-note">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="msj-note">No work experience added yet.</p>
      ) : (
        <div className="profile-list">
          {entries.map((e) => (
            <div className="profile-list-item" key={e.id}>
              <div className="profile-list-item-icon"><Icon name="building" size={18} /></div>
              <div className="profile-list-item-body">
                <strong>{e.title}</strong>
                <span>{e.company}{e.employmentType ? ` · ${EMPLOYMENT_LABEL[e.employmentType]}` : ""}</span>
                <span className="profile-list-item-dates">
                  {monthYear(e.startDate)} – {e.isCurrent ? "Present" : monthYear(e.endDate) || "—"}
                  {e.location ? ` · ${e.location}` : ""}
                </span>
                {e.description && <p>{e.description}</p>}
              </div>
              <div className="profile-list-item-actions">
                <button type="button" className="profile-icon-btn" aria-label="Edit" onClick={() => setModal(e)}><Icon name="edit" size={15} /></button>
                <button type="button" className="profile-icon-btn" aria-label="Delete" onClick={() => setDeleting(e)}><Icon name="trash" size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && <EntryModal entry={modal === "new" ? null : modal} onCancel={() => setModal(null)} onSaved={upsert} />}

      {deleting && (
        <div className="msj-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setDeleting(null)} aria-label="Close"><Icon name="x" size={16} /></button>
            <h3 style={{ textAlign: "center" }}>Delete "{deleting.title}"?</h3>
            <p className="msj-modal-sub" style={{ textAlign: "center" }}>This can't be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline-ink" style={{ flex: 1 }} onClick={() => setDeleting(null)} disabled={busy}>Cancel</button>
              <button className="btn btn-gold" style={{ flex: 1 }} onClick={confirmDelete} disabled={busy}>{busy ? "Please wait…" : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkExperienceCard;
