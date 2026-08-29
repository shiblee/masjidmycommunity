import React, { useEffect, useState } from "react";
import { Icon } from "../Icons.jsx";
import userApi from "../../services/userApi.js";

const LEVELS = [
  { value: "", label: "Select" },
  { value: "secondary", label: "Secondary" },
  { value: "senior_secondary", label: "Senior Secondary" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "doctorate", label: "Doctorate" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

function EntryModal({ entry, onCancel, onSaved }) {
  const isEdit = !!entry;
  const [form, setForm] = useState({
    level: entry?.level || "",
    degree: entry?.degree || "",
    institution: entry?.institution || "",
    fieldOfStudy: entry?.fieldOfStudy || "",
    startYear: entry?.startYear || "",
    endYear: entry?.endYear || "",
    location: entry?.location || "",
    description: entry?.description || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.degree.trim() || !form.institution.trim()) {
      setError("Degree/qualification and institution are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        startYear: form.startYear ? Number(form.startYear) : null,
        endYear: form.endYear ? Number(form.endYear) : null,
      };
      const { data } = isEdit
        ? await userApi.patch(`/me/education/${entry.id}`, payload)
        : await userApi.post("/me/education", payload);
      onSaved(data.education, isEdit);
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
        <h3>{isEdit ? "Edit Education" : "Add Education"}</h3>
        <form onSubmit={submit}>
          {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}

          <div className="auth-field">
            <label>Education Level</label>
            <select value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div className="auth-field">
            <label>Degree / Qualification</label>
            <input value={form.degree} onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))} placeholder="e.g. Bachelor of Technology" autoFocus />
          </div>
          <div className="auth-field">
            <label>Institution / University</label>
            <input value={form.institution} onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))} />
          </div>
          <div className="auth-field">
            <label>Field of Study</label>
            <input value={form.fieldOfStudy} onChange={(e) => setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} placeholder="e.g. Computer Science" />
          </div>

          <div className="profile-field-grid">
            <div className="auth-field">
              <label>Start Year</label>
              <input type="number" min="1950" max="2100" value={form.startYear} onChange={(e) => setForm((f) => ({ ...f, startYear: e.target.value }))} />
            </div>
            <div className="auth-field">
              <label>End Year</label>
              <input type="number" min="1950" max="2100" value={form.endYear} onChange={(e) => setForm((f) => ({ ...f, endYear: e.target.value }))} />
            </div>
          </div>

          <div className="auth-field">
            <label>Location</label>
            <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="auth-field">
            <label>Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>

          <button type="submit" className="btn btn-gold" style={{ width: "100%" }} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </form>
      </div>
    </div>
  );
}

function EducationCard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    userApi.get("/me/education").then(({ data }) => setEntries(data.education)).finally(() => setLoading(false));
  }, []);

  const sortEntries = (list) =>
    [...list].sort((a, b) => (b.endYear || b.startYear || 0) - (a.endYear || a.startYear || 0));

  const upsert = (entry, isEdit) => {
    setEntries((es) => sortEntries(isEdit ? es.map((e) => (e.id === entry.id ? entry : e)) : [...es, entry]));
    setModal(null);
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await userApi.delete(`/me/education/${deleting.id}`);
      setEntries((es) => es.filter((e) => e.id !== deleting.id));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>Education</h3>
        <button type="button" className="btn btn-outline-ink" onClick={() => setModal("new")}>
          <Icon name="plus" size={14} /> Add Education
        </button>
      </div>

      {loading ? (
        <p className="msj-note">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="msj-note">No education added yet.</p>
      ) : (
        <div className="profile-list">
          {entries.map((e) => (
            <div className="profile-list-item" key={e.id}>
              <div className="profile-list-item-icon"><Icon name="book" size={18} /></div>
              <div className="profile-list-item-body">
                <strong>{e.degree}{e.fieldOfStudy ? ` · ${e.fieldOfStudy}` : ""}</strong>
                <span>{e.institution}{e.level ? ` · ${LEVEL_LABEL[e.level]}` : ""}</span>
                <span className="profile-list-item-dates">
                  {e.startYear || "—"} – {e.endYear || "—"}
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
            <h3 style={{ textAlign: "center" }}>Delete "{deleting.degree}"?</h3>
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

export default EducationCard;
