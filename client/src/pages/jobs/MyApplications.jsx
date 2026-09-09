import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import jobApi from "../../services/jobApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const STATUS_PILL_CLASS = { applied: "submitted", under_review: "under_review", shortlisted: "approved", rejected: "rejected", hired: "active" };

// Every job the current user has applied to, across every poster — mirrors
// MyJobs.jsx's own list-card shape (statuses, meta line, link back to the
// listing) but rolled up from the applicant's side via GET /jobs/mine/applications.
function MyApplications() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    jobApi
      .get("/mine/applications")
      .then(({ data }) => setApplications(data.applications))
      .catch(() => setError(t("myApplications.loadError", "Couldn't load your applications.")));
  }, [t]);

  const statusLabel = {
    applied: t("jobApply.status.applied", "Applied"),
    under_review: t("jobApply.status.underReview", "Under Review"),
    shortlisted: t("jobApply.status.shortlisted", "Shortlisted"),
    rejected: t("jobApply.status.rejected", "Not Selected"),
    hired: t("jobApply.status.hired", "Selected / Hired"),
  };

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">{t("myApplications.hero.eyebrow", "Your Applications")}</span>
            <h1>{t("myApplications.hero.title", "My Applications")}</h1>
            <p>{t("myApplications.hero.sub", "Every job you've applied to, and where each one stands.")}</p>
          </div>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {applications && applications.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="mail" size={30} />
              <h3>{t("myApplications.empty.title", "You haven't applied to any jobs yet")}</h3>
              <p>{t("myApplications.empty.body", "Browse open roles from across the community and apply in a minute.")}</p>
              <Link to="/jobs" className="btn btn-gold">{t("jobs.hero.eyebrow", "Jobs")} <span className="btn-arrow">→</span></Link>
            </div>
          )}

          <div className="msj-list-grid">
            {applications?.map((a) => (
              <div className="msj-list-card" key={a.id}>
                <div className="msj-list-body">
                  <div className="msj-list-top">
                    <h3>{a.job.title}</h3>
                    <span className={`acct-status-pill ${STATUS_PILL_CLASS[a.status]}`}>{statusLabel[a.status]}</span>
                  </div>
                  <p className="msj-list-meta">
                    <Icon name="mapPin" size={13} /> {a.job.location} · {a.job.jobType}
                  </p>
                  <p className="msj-list-meta">
                    {t("myApplications.appliedOn", "Applied {date}").replace("{date}", formatDate(a.createdAt))}
                  </p>
                  <div className="msj-list-actions">
                    <Link to={`/job/${a.job.slug}`}>{t("myJobs.viewPublicPage", "View Public Page")}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default MyApplications;
