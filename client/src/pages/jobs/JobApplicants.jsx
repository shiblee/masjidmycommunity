import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { formatDateTime } from "../../utils/formatDateTime.js";
import jobApi from "../../services/jobApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const STATUS_PILL_CLASS = { applied: "active", under_review: "active", shortlisted: "active", rejected: "cancelled", hired: "active" };
const STATUSES = Object.keys(STATUS_PILL_CLASS);

function buildStatusLabel(t) {
  return {
    applied: t("jobApply.status.applied", "Applied"),
    under_review: t("jobApply.status.underReview", "Under Review"),
    shortlisted: t("jobApply.status.shortlisted", "Shortlisted"),
    rejected: t("jobApplicants.status.rejected", "Rejected"),
    hired: t("jobApply.status.hired", "Selected / Hired"),
  };
}

function ApplicantCard({ application, jobId, onSaved }) {
  const { t } = useTranslation();
  const STATUS_LABEL = buildStatusLabel(t);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(application.status);
  const [remarks, setRemarks] = useState(application.remarks || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const snapshot = application.profileSnapshot || {};
  const dirty = status !== application.status || remarks !== (application.remarks || "");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await jobApi.patch(`/${jobId}/applications/${application.id}`, { status, remarks });
      onSaved(data.application);
    } catch (err) {
      setError(err.response?.data?.message || t("jobApplicants.saveError", "Couldn't save changes."));
    } finally {
      setSaving(false);
    }
  };

  // The resume route is authenticated (private_uploads, not a public URL),
  // so this needs jobApi's own Bearer token — a plain <a>/window.open can't
  // carry that header — fetched as a blob and downloaded client-side,
  // mirroring CampaignReview.jsx's downloadDocument.
  const downloadResume = async () => {
    try {
      const res = await jobApi.get(`/${jobId}/applications/${application.id}/resume`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = application.resumeFileName || "resume";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError(t("jobApplicants.downloadError", "Couldn't download this resume."));
    }
  };

  return (
    <div className="msj-list-card" style={{ marginBottom: 16 }}>
      <div className="msj-list-body">
        <div className="msj-list-top">
          <h3>{application.applicant?.fullName || t("jobApplicants.candidateFallback", "A candidate")}</h3>
          <span className={`acct-status-pill ${STATUS_PILL_CLASS[application.status]}`}>{STATUS_LABEL[application.status]}</span>
        </div>
        <p className="msj-list-meta">
          {application.applicant?.email || "—"}{application.applicant?.mobile ? ` · ${application.applicant.mobile}` : ""}
        </p>
        <p className="msj-list-meta">{t("jobApplicants.appliedOn", "Applied {date}").replace("{date}", formatDateTime(application.createdAt))}</p>

        {application.coverNote && <p style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{application.coverNote}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="auth-link" onClick={() => setExpanded((e) => !e)}>
            {expanded ? t("jobApplicants.hideProfile", "Hide Profile") : t("jobApplicants.viewProfile", "View Profile")}
          </button>
          {application.applicant?.username && (
            <Link to={`/profile/${application.applicant.username}`} className="auth-link" target="_blank" rel="noreferrer">
              {t("jobApplicants.openFullProfile", "Open Full Profile")}
            </Link>
          )}
          {application.hasResume && (
            <button type="button" className="auth-link" onClick={downloadResume}>
              {t("jobApplicants.downloadResume", "Download Resume")}
            </button>
          )}
        </div>

        {expanded && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: "var(--surface-2, #F7F5F0)" }}>
            {snapshot.bio && <p style={{ marginBottom: 10 }}>{snapshot.bio}</p>}
            {snapshot.skills?.length > 0 && (
              <div className="profile-chip-row" style={{ marginBottom: 10 }}>
                {snapshot.skills.map((s) => <span className="filter-chip active profile-chip" key={s.id}>{s.name}</span>)}
              </div>
            )}
            {snapshot.workExperience?.length > 0 && (
              <>
                <strong style={{ display: "block", marginBottom: 4 }}>{t("profile.nav.workExperience.label", "Work Experience")}</strong>
                {snapshot.workExperience.map((w, i) => (
                  <p key={i} className="msj-list-meta">{w.title} — {w.company}{w.employmentType ? ` (${w.employmentType})` : ""}</p>
                ))}
              </>
            )}
            {snapshot.education?.length > 0 && (
              <>
                <strong style={{ display: "block", marginTop: 10, marginBottom: 4 }}>{t("profile.nav.education.label", "Education")}</strong>
                {snapshot.education.map((e, i) => (
                  <p key={i} className="msj-list-meta">{e.degree}{e.fieldOfStudy ? `, ${e.fieldOfStudy}` : ""} — {e.institution}</p>
                ))}
              </>
            )}
            {!snapshot.bio && !snapshot.skills?.length && !snapshot.workExperience?.length && !snapshot.education?.length && (
              <p className="msj-list-meta">{t("jobApplicants.noProfileDetails", "No additional profile details were on file at the time of application.")}</p>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>{t("masjidWizard.contacts.table.status", "Status")}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>{t("jobApplicants.remarksLabel", "Remarks (private, not shown to the applicant)")}</label>
            <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={t("jobApplicants.remarksPlaceholder", "Internal notes…")} style={{ width: "100%" }} />
          </div>
          <button type="button" className="btn btn-gold" disabled={!dirty || saving} onClick={save}>
            {saving ? t("workExperience.saving", "Saving…") : t("workExperience.save", "Save")}
          </button>
        </div>
        {error && <div className="auth-alert" style={{ marginTop: 10 }}><Icon name="info" size={16} />{error}</div>}
      </div>
    </div>
  );
}

function JobApplicants() {
  const { t } = useTranslation();
  const STATUS_LABEL = buildStatusLabel(t);
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    jobApi.get(`/${id}`).then(({ data }) => setJob(data.job)).catch(() => setError(t("jobApplicants.loadJobError", "Couldn't load this job.")));
    jobApi.get(`/${id}/applications`).then(({ data }) => setApplications(data.applications)).catch(() => setError(t("jobApplicants.loadApplicantsError", "Couldn't load applicants.")));
  }, [id]);

  const onSaved = (updated) => {
    setApplications((list) => list.map((a) => (a.id === updated.id ? updated : a)));
  };

  const filtered = applications?.filter((a) => statusFilter === "all" || a.status === statusFilter) || [];

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <Link to="/account/my-jobs" className="auth-link" style={{ color: "inherit" }}>{t("jobApplicants.backToMyJobs", "← Back to My Jobs")}</Link>
            <span className="eyebrow" style={{ marginTop: 10, display: "block" }}>{t("jobApplicants.eyebrow", "Applicants")}</span>
            <h1>{job?.title || t("jobApplicants.fallbackTitle", "Job Applicants")}</h1>
            <p>
              {applications
                ? t(applications.length === 1 ? "jobApplicants.receivedSingular" : "jobApplicants.receivedPlural", applications.length === 1 ? "{count} application received" : "{count} applications received").replace("{count}", applications.length)
                : t("masjidWizard.loading", "Loading…")}
            </p>
          </div>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {applications && applications.length > 0 && (
            <div className="campaign-filters" style={{ margin: "0 0 20px" }}>
              <button className={`filter-chip${statusFilter === "all" ? " active" : ""}`} onClick={() => setStatusFilter("all")}>{t("jobApplicants.allCount", "All ({count})").replace("{count}", applications.length)}</button>
              {STATUSES.map((s) => {
                const count = applications.filter((a) => a.status === s).length;
                if (!count) return null;
                return (
                  <button key={s} className={`filter-chip${statusFilter === s ? " active" : ""}`} onClick={() => setStatusFilter(s)}>
                    {STATUS_LABEL[s]} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {applications && applications.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="people" size={30} />
              <h3>{t("jobApplicants.emptyTitle", "No applicants yet")}</h3>
              <p>{t("jobApplicants.emptyBody", "Once someone applies, they'll show up here.")}</p>
            </div>
          )}

          {filtered.map((a) => (
            <ApplicantCard key={a.id} application={a} jobId={id} onSaved={onSaved} />
          ))}
        </div>
      </section>
    </main>
  );
}

export default JobApplicants;
