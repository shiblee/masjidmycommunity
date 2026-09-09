import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { formatDate } from "../utils/formatDateTime.js";
import LatestJobsRail from "../components/job/LatestJobsRail.jsx";
import JobApplyPanel from "../components/job/JobApplyPanel.jsx";
import JobPostSection from "../components/job/JobPostSection.jsx";
import ShareMenu from "../components/ShareMenu.jsx";
import publicJobApi from "../services/publicJobApi.js";
import { trackJobView } from "../utils/trackJobView.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";

function JobProfile() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef(null);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    publicJobApi
      .get(`/${slug}`)
      .then(({ data }) => {
        setData(data);
        trackJobView(data.job.id);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg msj-empty-state">
          <Icon name="building" size={30} />
          <h3>{t("jobProfile.notFound.title", "This job isn't available")}</h3>
          <p>{t("jobProfile.notFound.body", "It may have closed, or the link may be incorrect.")}</p>
          <Link to="/jobs" className="btn btn-gold">{t("jobProfile.notFound.cta", "Browse Jobs")}</Link>
        </div>
      </main>
    );
  }

  if (!data) return <main className="msj-page"><div className="wrap py-lg"><p>{t("jobProfile.loading", "Loading…")}</p></div></main>;

  const { job, poster } = data;

  return (
    <main className="msj-page">
      <section className="cw-hero msj-explore-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">{job.jobType}</span>
          <h1>{job.title}</h1>
          <p>
            <Icon name="mapPin" size={14} /> {job.location} · {t("jobProfile.postedBy", "Posted by")} {poster?.fullName || t("jobProfile.anonymousPoster", "a community member")} · {formatDate(job.createdAt)}
            {job.viewCount > 0 && ` · ${job.viewCount} ${job.viewCount === 1 ? t("jobProfile.view", "view") : t("jobProfile.views", "views")}`}
          </p>

          <div className="msj-hub-actions-row">
            <button type="button" ref={shareBtnRef} className="msj-hub-action-btn" onClick={() => setShareOpen((v) => !v)}>
              <Icon name="link" size={16} /> {t("jobProfile.share", "Share")}
            </button>
            <ShareMenu
              open={shareOpen}
              onClose={() => setShareOpen(false)}
              anchorRef={shareBtnRef}
              url={`${window.location.origin}/job/${job.slug}`}
              title={job.title}
              text={`${job.title} — ${job.location}`}
            />
          </div>
        </div>
      </section>

      <section className="py-md camp-hub-content">
        <div className="wrap camp-hub-grid">
          <LatestJobsRail currentSlug={slug} excludeId={job.id} />

          <div>
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="eyebrow">{t("jobProfile.section.description", "Job Description")}</span>
              <h2>{job.title}</h2>
            </div>
            <p className="msj-profile-about" style={{ whiteSpace: "pre-line" }}>{job.description}</p>

            {job.skills?.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: 32, marginBottom: 8 }}>
                  <span className="eyebrow">{t("jobProfile.section.skills", "Skills & Qualifications")}</span>
                </div>
                <div className="profile-chip-row">
                  {job.skills.map((skill) => <span className="filter-chip active profile-chip" key={skill}>{skill}</span>)}
                </div>
              </>
            )}

            {job.experienceRequired && (
              <p className="msj-note" style={{ marginTop: 12 }}><strong>{t("jobProfile.experienceLabel", "Experience required:")}</strong> {job.experienceRequired}</p>
            )}
            {job.applicationDeadline && (
              <p className="msj-note" style={{ marginTop: 6 }}><strong>{t("jobProfile.deadlineLabel", "Application deadline:")}</strong> {formatDate(job.applicationDeadline)}</p>
            )}

            <JobPostSection jobId={job.id} />
          </div>

          <aside className="msj-profile-side camp-profile-side">
            <JobApplyPanel job={job} posterId={poster?.id} />
          </aside>
        </div>
      </section>
    </main>
  );
}

export default JobProfile;
