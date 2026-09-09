import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import { getStoredUser } from "../../utils/userAuthStorage.js";
import jobApi from "../../services/jobApi.js";
import userApi from "../../services/userApi.js";
import MicButton from "../MicButton.jsx";
import { useJobFavorite } from "../../hooks/useJobFavorite.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const COVER_NOTE_MAX = 1000;

const COMPLETION_LABEL_KEY = {
  photo: ["jobApply.completion.photo", "Profile photo"],
  personal: ["jobApply.completion.personal", "Personal details"],
  workExperience: ["jobApply.completion.workExperience", "Work experience"],
  education: ["jobApply.completion.education", "Education"],
  hobbies: ["jobApply.completion.hobbies", "Hobbies"],
  skills: ["jobApply.completion.skills", "Skills"],
};

// Compact, non-blocking nudge shown before Submit — applying still works at
// any completion level, this just helps the applicant put their best
// profile forward, per the "show completion status before applying" ask.
function CompletionBar() {
  const { t } = useTranslation();
  const [completion, setCompletion] = useState(null);

  useEffect(() => {
    userApi.get("/me/profile-completion").then(({ data }) => setCompletion(data)).catch(() => {});
  }, []);

  if (!completion || completion.percent >= 100) return null;

  return (
    <div className="job-completion-bar">
      <div className="job-completion-bar-head">
        <span>{t("jobApply.completion.label", "Your profile is")} <strong>{completion.percent}%</strong> {t("jobApply.completion.complete", "complete")}</span>
      </div>
      <div className="job-completion-bar-track">
        <div className="job-completion-bar-fill" style={{ width: `${completion.percent}%` }} />
      </div>
      {completion.missing.length > 0 && (
        <p className="job-completion-bar-hint">
          {t("jobApply.completion.missingPrefix", "Add")} {completion.missing.map((key) => t(...COMPLETION_LABEL_KEY[key])).join(", ")} {t("jobApply.completion.missingSuffix", "to strengthen your application.")}
        </p>
      )}
    </div>
  );
}

// Auto-fetches the applicant's profile (jobController.js's applyToJob pulls
// education/work experience/skills/bio via the same aggregation
// getPublicProfile itself uses) — this panel only needs to collect an
// optional cover note and an optional resume re-upload, then let the user
// review before submitting.
function ApplyModal({ job, onCancel, onSubmitted }) {
  const { t } = useTranslation();
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
      setError(err.response?.data?.message || t("jobApply.modal.error", "Couldn't submit your application. Please try again."));
      setSaving(false);
    }
  };

  return (
    <div className="msj-modal-overlay" onClick={saving ? undefined : onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        {!saving && <button className="msj-modal-close" onClick={onCancel} aria-label={t("jobApply.modal.close", "Close")}><Icon name="x" size={16} /></button>}
        <h3>{t("jobApply.modal.title", "Apply for")} {job.title}</h3>
        <p className="msj-modal-sub">
          {t("jobApply.modal.subtitle", "Your name, contact details, education, work experience, skills, and bio from your profile will be included automatically. Review and submit below.")}
        </p>
        <form onSubmit={submit}>
          <div className="auth-field">
            <label>{t("jobApply.modal.resumeLabel", "Resume / CV (optional)")}</label>
            <input type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
            <span className="msj-note" style={{ display: "block", marginTop: 6 }}>
              {t("jobApply.modal.resumeNote", "Leave blank to use the resume already on your profile, if any. Uploading here also updates your standing profile resume.")}
            </span>
          </div>
          <div className="auth-field">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <label>{t("jobApply.modal.noteLabel", "Note to the job creator (optional)")}</label>
              <span className="pf-char-counter">{coverNote.length}/{COVER_NOTE_MAX}</span>
            </div>
            <div className="msj-about-wrap">
              <textarea
                rows={4}
                maxLength={COVER_NOTE_MAX}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder={t("jobApply.modal.notePlaceholder", "Anything you'd like to add…")}
              />
              <MicButton onTranscript={(text) => setCoverNote(text.slice(0, COVER_NOTE_MAX))} className="msj-about-mic" />
            </div>
          </div>
          <CompletionBar />
          {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button type="button" className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel} disabled={saving}>{t("jobApply.modal.cancel", "Cancel")}</button>
            <button type="submit" className="btn btn-gold" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>{saving ? t("jobApply.modal.submitting", "Submitting…") : t("jobApply.modal.submit", "Submit Application")}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobApplyPanel({ job, posterId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [myApplication, setMyApplication] = useState(undefined); // undefined = loading, null = none
  const [applying, setApplying] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const { favorited, toggle: toggleFavorite, busy: favoriteBusy } = useJobFavorite(job.id, { favorited: !!job.favorited });

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  useEffect(() => {
    if (!user) { setMyApplication(null); return; }
    jobApi.get(`/${job.id}/my-application`).then(({ data }) => setMyApplication(data.application)).catch(() => setMyApplication(null));
  }, [job.id, user]);

  const statusLabel = {
    applied: t("jobApply.status.applied", "Applied"),
    under_review: t("jobApply.status.underReview", "Under Review"),
    shortlisted: t("jobApply.status.shortlisted", "Shortlisted"),
    rejected: t("jobApply.status.rejected", "Not Selected"),
    hired: t("jobApply.status.hired", "Selected / Hired"),
  };

  const isOwnJob = user && posterId && user.id === posterId;

  const openApply = () => {
    if (!user) { navigate("/auth"); return; }
    setApplying(true);
  };

  const onSaveClick = async () => {
    const result = await toggleFavorite();
    if (result.needsLogin) navigate("/auth");
  };

  return (
    <div className="card msj-profile-card camp-donate-panel">
      <div className="camp-donate-panel-head">
        <span className="camp-donate-eyebrow">{t("jobApply.panel.eyebrow", "This Opening")}</span>
        {!isOwnJob && (
          <button
            type="button"
            className={`job-card-save${favorited ? " active" : ""}`}
            onClick={onSaveClick}
            disabled={favoriteBusy}
            aria-label={favorited ? t("jobs.card.unlike", "Remove from liked jobs") : t("jobs.card.like", "Like job")}
            title={favorited ? t("jobs.card.unlike", "Remove from liked jobs") : t("jobs.card.like", "Like job")}
          >
            <Icon name="heart" size={15} />
          </button>
        )}
      </div>
      <h3>{job.title}</h3>

      <div className="camp-donate-substats" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="job-apply-location-stat"><strong>{job.location}</strong><span>{t("jobApply.panel.location", "Location")}</span></div>
        <div><strong>{job.jobType}</strong><span>{t("jobApply.panel.jobType", "Job Type")}</span></div>
        {job.experienceRequired && <div><strong>{job.experienceRequired}</strong><span>{t("jobApply.panel.experience", "Experience")}</span></div>}
        {job.salary && <div><strong>{job.salary}</strong><span>{t("jobApply.panel.compensation", "Compensation")}</span></div>}
        {job.applicationDeadline && <div><strong>{formatDate(job.applicationDeadline)}</strong><span>{t("jobApply.panel.applyBy", "Apply By")}</span></div>}
      </div>

      {isOwnJob ? (
        <p className="msj-note" style={{ marginTop: 10, textAlign: "center" }}>{t("jobApply.panel.ownJob", "This is your own job posting.")}</p>
      ) : justSubmitted || myApplication ? (
        <>
          <button type="button" className="btn btn-gold camp-donate-cta" disabled>
            <Icon name="check" size={16} /> {t("jobApply.panel.applicationPrefix", "Application")} {statusLabel[myApplication?.status || "applied"]}
          </button>
          <p className="msj-note" style={{ marginTop: 10, textAlign: "center" }}>
            {t("jobApply.panel.appliedText", "You applied to this job")}{myApplication?.createdAt ? ` ${t("jobApply.panel.appliedOn", "on")} ${formatDate(myApplication.createdAt)}` : ""}.
          </p>
        </>
      ) : (
        <>
          <button type="button" className="btn btn-gold camp-donate-cta" onClick={openApply} disabled={job.status !== "active"}>
            <Icon name="mail" size={16} /> {t("jobApply.panel.applyCta", "Apply for Job")}
          </button>
          <p className="msj-note" style={{ marginTop: 10, textAlign: "center" }}>
            {job.status !== "active"
              ? t("jobApply.panel.closedNote", "This job is no longer accepting applications.")
              : job.contactMethod
              ? `${t("jobApply.panel.contactPrefix", "Prefer to reach out directly?")} ${job.contactMethod}`
              : t("jobApply.panel.applyHint", "Applying takes less than a minute — your profile fills in the details.")}
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
