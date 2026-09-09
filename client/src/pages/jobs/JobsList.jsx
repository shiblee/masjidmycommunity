import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import { useJobFavorite } from "../../hooks/useJobFavorite.js";
import { distanceToJob, formatDistance, jobDirectionsUrl } from "../../components/job/jobLocationUtils.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const WORK_MODE_KEY = {
  on_site: ["jobs.card.onSite", "On-site"],
  remote: ["jobs.card.remote", "Remote"],
  hybrid: ["jobs.card.hybrid", "Hybrid"],
};
const MAX_SKILL_CHIPS = 5;
const BEST_MATCH_THRESHOLD = 75;

// Row layout, same reusable classes ExploreMasjidsList.jsx uses (minus the
// thumbnail — jobs have no cover photo) — separate from JobCard.jsx rather
// than a shared flexible component, mirroring how Grid/List already stay
// two distinct components for masjids in this app.
function JobRow({ job, userLocation }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { favorited, toggle, busy } = useJobFavorite(job.id, { favorited: !!job.favorited });
  const skills = job.skills || [];
  const visibleSkills = skills.slice(0, MAX_SKILL_CHIPS);
  const extraSkillCount = skills.length - visibleSkills.length;
  const workModeEntry = job.workMode && WORK_MODE_KEY[job.workMode];
  const workModeLabel = workModeEntry ? t(workModeEntry[0], workModeEntry[1]) : null;
  const distance = job.distanceKm ?? distanceToJob(userLocation, job);
  const directionsUrl = jobDirectionsUrl(job);
  const hasMatch = typeof job.matchScore === "number";
  const isBestMatch = hasMatch && job.matchScore >= BEST_MATCH_THRESHOLD;

  const onSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggle();
    if (result.needsLogin) navigate("/auth");
  };

  return (
    <Link to={`/job/${job.slug}`} className="msj-explore-row msj-explore-row-clickable job-row">
      <div className="msj-explore-row-body">
        <div className="msj-explore-row-top">
          <h3>{job.title}</h3>
          <span className="job-card-type">{job.jobType}</span>
          {job.category && <span className="msj-category-badge">{job.category}</span>}
          {isBestMatch && <span className="job-card-best-match job-row-best-match"><Icon name="sparkle" size={11} /> {t("jobs.card.bestMatch", "Best Match")}</span>}
          {hasMatch && !isBestMatch && <span className="job-card-match-chip">{t("jobs.card.matchPercent", "{percent}% match").replace("{percent}", job.matchScore)}</span>}
        </div>
        <p className="msj-list-loc">
          <Icon name="mapPin" size={14} /> {job.location}
          {workModeLabel && <span className="job-card-workmode" style={{ marginInlineStart: 8 }}>{workModeLabel}</span>}
          {job.experienceRequired ? ` · ${job.experienceRequired}` : ""}
        </p>
        {job.salary && <p className="job-card-salary" style={{ marginTop: 6 }}>{job.salary}</p>}
        {visibleSkills.length > 0 && (
          <div className="job-card-skills" style={{ marginTop: 10 }}>
            {visibleSkills.map((skill) => <span className="job-card-skill-chip" key={skill}>{skill}</span>)}
            {extraSkillCount > 0 && <span className="job-card-skill-chip more">+{extraSkillCount}</span>}
          </div>
        )}
        <div className="msj-explore-row-meta">
          <span className="msj-list-meta">{t("jobs.card.posted", "Posted")} {formatDate(job.createdAt)}</span>
          {job.applicationDeadline && <span className="msj-list-meta job-card-deadline">{t("jobs.card.closes", "Closes")} {formatDate(job.applicationDeadline)}</span>}
          {distance != null && <span className="msj-distance-badge"><Icon name="mapPin" size={11} /> {formatDistance(distance)}</span>}
        </div>
      </div>
      <div className="msj-explore-row-actions-col">
        <button
          type="button"
          className={`job-card-save${favorited ? " active" : ""}`}
          onClick={onSaveClick}
          disabled={busy}
          aria-label={favorited ? t("jobs.card.unlike", "Remove from liked jobs") : t("jobs.card.like", "Like job")}
          title={favorited ? t("jobs.card.unlike", "Remove from liked jobs") : t("jobs.card.like", "Like job")}
        >
          <Icon name="heart" size={15} />
        </button>
        {directionsUrl && (
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="job-card-directions-link">
            <Icon name="compass" size={12} /> {t("jobs.card.getDirections", "Get Directions")}
          </a>
        )}
      </div>
    </Link>
  );
}

function JobsList({ jobs, userLocation }) {
  return (
    <div className="msj-explore-row-list">
      {jobs.map((j) => <JobRow job={j} userLocation={userLocation} key={j.id} />)}
    </div>
  );
}

export default JobsList;
