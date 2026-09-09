import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import jobApi from "../../services/jobApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// Reuses the acct-status-pill classes already styled for other statuses
// elsewhere in the app, rather than adding new CSS for these two.
const STATUS_PILL_CLASS = { active: "active", closed: "inactive", expired: "cancelled", deleted: "cancelled" };
const WORK_MODE_KEY = {
  on_site: ["jobs.card.onSite", "On-site"],
  remote: ["jobs.card.remote", "Remote"],
  hybrid: ["jobs.card.hybrid", "Hybrid"],
};
const MAX_SKILL_CHIPS = 4;

function MyJobs() {
  const { t } = useTranslation();
  const STATUS_LABEL = {
    active: t("communityWall.status.active", "Active"),
    closed: t("communityWall.status.closed", "Closed"),
    expired: t("communityWall.status.expired", "Expired"),
    deleted: t("communityWall.status.deleted", "Deleted"),
  };
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState("all");

  const load = () => {
    jobApi
      .get("/mine")
      .then(({ data }) => setJobs(data.jobs))
      .catch(() => setError(t("communityWall.jobs.loadError", "Couldn't load your jobs.")));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (job) => {
    setBusyId(job.id);
    try {
      await jobApi.post(`/${job.id}/${job.status === "active" ? "close" : "reopen"}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || t("myJobs.updateError", "Couldn't update this job."));
    } finally {
      setBusyId(null);
    }
  };

  const counts = useMemo(() => {
    const c = { all: jobs?.length || 0, active: 0, closed: 0, expired: 0, deleted: 0 };
    jobs?.forEach((j) => { if (c[j.status] != null) c[j.status] += 1; });
    return c;
  }, [jobs]);

  const totals = useMemo(() => {
    if (!jobs) return { applicants: 0, views: 0 };
    return jobs.reduce((acc, j) => ({ applicants: acc.applicants + (j.applicationCount || 0), views: acc.views + (j.viewCount || 0) }), { applicants: 0, views: 0 });
  }, [jobs]);

  const visible = tab === "all" ? jobs : jobs?.filter((j) => j.status === tab);

  const TABS = [
    { key: "all", label: t("myJobs.tabs.all", "All") },
    { key: "active", label: t("communityWall.status.active", "Active") },
    { key: "closed", label: t("communityWall.status.closed", "Closed") },
    { key: "expired", label: t("communityWall.status.expired", "Expired") },
  ];

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">{t("myJobs.hero.eyebrow", "Your Jobs")}</span>
            <h1>{t("communityWall.jobs.myJobsHeading", "My Jobs")}</h1>
            <p>{t("myJobs.hero.sub", "Post openings and track applications for your community.")}</p>
          </div>
          <Link to="/account/my-jobs/new" className="btn btn-gold" style={{ marginLeft: "auto" }}>
            <Icon name="plus" size={16} /> {t("communityWall.jobs.addJob", "Add a Job")}
          </Link>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {jobs && jobs.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="building" size={30} />
              <h3>{t("myJobs.empty.title", "You haven't posted a job yet")}</h3>
              <p>{t("myJobs.empty.body", "Share an opening with the community — it goes live immediately, no waiting on approval.")}</p>
              <Link to="/account/my-jobs/new" className="btn btn-gold">{t("communityWall.jobs.addJob", "Add a Job")} <span className="btn-arrow">→</span></Link>
            </div>
          )}

          {jobs && jobs.length > 0 && (
            <>
              <div className="msj-stats-strip">
                <div className="msj-stat-box">
                  <strong>{counts.all}</strong>
                  <span>{t("myJobs.stats.totalJobs", "Total Jobs")}</span>
                </div>
                <div className="msj-stat-box">
                  <strong>{counts.active}</strong>
                  <span>{t("communityWall.status.active", "Active")}</span>
                </div>
                <div className="msj-stat-box">
                  <strong>{totals.applicants}</strong>
                  <span>{t("myJobs.stats.totalApplicants", "Total Applicants")}</span>
                </div>
                <div className="msj-stat-box">
                  <strong>{totals.views}</strong>
                  <span>{t("myJobs.stats.totalViews", "Total Views")}</span>
                </div>
              </div>

              <div className="campaign-filters" style={{ margin: "0 0 20px" }}>
                {TABS.map((tb) => (
                  <button key={tb.key} className={`filter-chip${tab === tb.key ? " active" : ""}`} onClick={() => setTab(tb.key)}>
                    {tb.label}{tb.key !== "all" ? ` (${counts[tb.key] || 0})` : ""}
                  </button>
                ))}
              </div>
            </>
          )}

          {jobs && jobs.length > 0 && visible.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="briefcase" size={30} />
              <h3>{t("myJobs.emptyTab.title", "No jobs in this status")}</h3>
              <p>{t("myJobs.emptyTab.body", "Switch tabs to see your other jobs.")}</p>
            </div>
          )}

          <div className="msj-list-grid">
            {visible?.map((j) => {
              const workModeEntry = j.workMode && WORK_MODE_KEY[j.workMode];
              const workModeLabel = workModeEntry ? t(workModeEntry[0], workModeEntry[1]) : null;
              const skills = j.skills || [];
              const visibleSkills = skills.slice(0, MAX_SKILL_CHIPS);
              const extraSkillCount = skills.length - visibleSkills.length;

              return (
                <div className="job-card" key={j.id}>
                  <div className="job-card-top">
                    <span className="job-card-type">{j.jobType}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                      {j.category && <span className="job-card-category">{j.category}</span>}
                      <span className={`acct-status-pill ${STATUS_PILL_CLASS[j.status]}`}>{STATUS_LABEL[j.status]}</span>
                    </div>
                  </div>

                  <h3 className="job-card-title">{j.title}</h3>

                  <p className="job-card-meta">
                    <Icon name="mapPin" size={13} /> {j.location}
                    {workModeLabel && <span className="job-card-workmode">{workModeLabel}</span>}
                    {j.experienceRequired ? ` · ${j.experienceRequired}` : ""}
                  </p>
                  {j.salary && <p className="job-card-salary">{j.salary}</p>}

                  {visibleSkills.length > 0 && (
                    <div className="job-card-skills">
                      {visibleSkills.map((skill) => <span className="job-card-skill-chip" key={skill}>{skill}</span>)}
                      {extraSkillCount > 0 && <span className="job-card-skill-chip more">+{extraSkillCount}</span>}
                    </div>
                  )}

                  <div className="job-card-footer">
                    <span>{t("myJobs.posted", "Posted {date}").replace("{date}", formatDate(j.createdAt))}</span>
                    {j.applicationDeadline && (
                      <span className="job-card-deadline">{t("jobs.card.closes", "Closes")} {formatDate(j.applicationDeadline)}</span>
                    )}
                    {j.viewCount > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Icon name="eye" size={12} /> {j.viewCount}
                      </span>
                    )}
                  </div>

                  <Link to={`/account/my-jobs/${j.id}/applications`} className="myjobs-applicants-stat">
                    <Icon name="people" size={14} />
                    {t(j.applicationCount === 1 ? "myJobs.applicationSingular" : "myJobs.applicationPlural", j.applicationCount === 1 ? "{count} application" : "{count} applications").replace("{count}", j.applicationCount)}
                    <span className="btn-arrow">→</span>
                  </Link>

                  <div className="msj-list-actions">
                    {["active", "closed"].includes(j.status) && <Link to={`/account/my-jobs/${j.id}`}>{t("donationAccount.edit", "Edit")}</Link>}
                    <Link to={`/job/${j.slug}`}>{t("myJobs.viewPublicPage", "View Public Page")}</Link>
                    {["active", "closed"].includes(j.status) && (
                      <button type="button" className="auth-link" onClick={() => toggleStatus(j)} disabled={busyId === j.id}>
                        {j.status === "active" ? t("jobApply.modal.close", "Close") : t("myJobs.reopen", "Reopen")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default MyJobs;
