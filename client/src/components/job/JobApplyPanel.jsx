import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import { getStoredUser } from "../../utils/userAuthStorage.js";
import jobApi from "../../services/jobApi.js";
import MicButton from "../MicButton.jsx";

const STATUS_LABEL = { applied: "Applied", under_review: "Under Review", shortlisted: "Shortlisted", rejected: "Not Selected", hired: "Selected / Hired" };
const COVER_NOTE_MAX = 1000;

// Auto-fetches the applicant's profile (jobController.js's applyToJob pulls
// education/work experience/skills/bio via the same aggregation
// getPublicProfile itself uses) — this panel only needs to collect an
// optional cover note and an optional resume re-upload, then let the user
// review before submitting.
function ApplyModal({ job, onCancel, onSubmitted }) {
  const [coverNote, setCoverNote] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      if (coverNote.trim()) fd.append("coverNote", coverNote.trim());
      if (resumeFile) fd.append("resume", resumeFile);
      const { data } = await jobApi.post(`/${job.id}/apply`, fd);
      onSubmitted(data.application);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your application. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="msj-modal-overlay" onClick={saving ? undefined : onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        {!saving && <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>}
        <h3>Apply for {job.title}</h3>
        <p className="msj-modal-sub">
          Your name, contact details, education, work experience, skills, and bio from your profile will be included automatically. Review and submit below.
        </p>
        <form onSubmit={submit}>
          <div className="auth-field">
            <label>Resume / CV (optional)</label>
            <input type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
            <span className="msj-note" style={{ display: "block", marginTop: 6 }}>
              Leave blank to use the resume already on your profile, if any. Uploading here also updates your standing profile resume.
            </span>
          </div>
          <div className="auth-field">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <label>Note to the job creator (optional)</label>
              <span className="pf-char-counter">{coverNote.length}/{COVER_NOTE_MAX}</span>
            </div>
            <div className="msj-about-wrap">
              <textarea
                rows={4}
                maxLength={COVER_NOTE_MAX}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Anything you'd like to add…"
              />
              <MicButton onTranscript={(text) => setCoverNote(text.slice(0, COVER_NOTE_MAX))} className="msj-about-mic" />
            </div>
          </div>
          {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-gold" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>{saving ? "Submitting…" : "Submit Application"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobApplyPanel({ job, posterId }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [myApplication, setMyApplication] = useState(undefined); // undefined = loading, null = none
  const [applying, setApplying] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  useEffect(() => {
    if (!user) { setMyApplication(null); return; }
    jobApi.get(`/${job.id}/my-application`).then(({ data }) => setMyApplication(data.application)).catch(() => setMyApplication(null));
  }, [job.id, user]);

  const isOwnJob = user && posterId && user.id === posterId;

  const openApply = () => {
    if (!user) { navigate("/auth"); return; }
    setApplying(true);
  };

  return (
    <div className="card msj-profile-card camp-donate-panel">
      <div className="camp-donate-panel-head">
        <span className="camp-donate-eyebrow">This Opening</span>
      </div>
      <h3>{job.title}</h3>

      <div className="camp-donate-substats" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div><strong>{job.jobType}</strong><span>Job Type</span></div>
        <div><strong>{job.location}</strong><span>Location</span></div>
        {job.experienceRequired && <div><strong>{job.experienceRequired}</strong><span>Experience</span></div>}
        {job.salary && <div><strong>{job.salary}</strong><span>Compensation</span></div>}
        {job.applicationDeadline && <div><strong>{formatDate(job.applicationDeadline)}</strong><span>Apply By</span></div>}
      </div>

      {isOwnJob ? (
        <p className="msj-note" style={{ marginTop: 10, textAlign: "center" }}>This is your own job posting.</p>
      ) : justSubmitted || myApplication ? (
        <>
          <button type="button" className="btn btn-gold camp-donate-cta" disabled>
            <Icon name="check" size={16} /> Application {STATUS_LABEL[myApplication?.status || "applied"]}
          </button>
          <p className="msj-note" style={{ marginTop: 10, textAlign: "center" }}>
            You applied to this job{myApplication?.createdAt ? ` on ${formatDate(myApplication.createdAt)}` : ""}.
          </p>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-gold camp-donate-cta" onClick={openApply} disabled={job.status !== "active"}>
            <Icon name="mail" size={16} /> Apply for Job
          </button>
          <p className="msj-note" style={{ marginTop: 10, textAlign: "center" }}>
            {job.status !== "active"
              ? "This job is no longer accepting applications."
              : job.contactMethod
              ? `Prefer to reach out directly? ${job.contactMethod}`
              : "Applying takes less than a minute — your profile fills in the details."}
          </p>
        </>
      )}

      {applying && (
        <ApplyModal
          job={job}
          onCancel={() => setApplying(false)}
          onSubmitted={(application) => {
            setApplying(false);
            setJustSubmitted(true);
            setMyApplication(application);
          }}
        />
      )}
    </div>
  );
}

export default JobApplyPanel;
