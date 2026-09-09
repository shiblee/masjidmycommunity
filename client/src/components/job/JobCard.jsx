import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";
import { useJobFavorite } from "../../hooks/useJobFavorite.js";
import { distanceToJob, formatDistance, jobDirectionsUrl } from "./jobLocationUtils.js";

const WORK_MODE_KEY = {
  on_site: ["jobs.card.onSite", "On-site"],
  remote: ["jobs.card.remote", "Remote"],
  hybrid: ["jobs.card.hybrid", "Hybrid"],
};

const MAX_SKILL_CHIPS = 4;
const BEST_MATCH_THRESHOLD = 75;

// Reusable job-card, shared by Jobs.jsx's main grid, "Recommended"/"Saved"/
// etc. rails as they land in later phases — one shape, one place that knows
// how to render a job summary, matching the withCard() response shape from
// publicJobController.js.
function JobCard({ job, userLocation }) {
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

  const onSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggle();
    if (result.needsLogin) navigate("/auth");
  };

  const hasMatch = typeof job.matchScore === "number";
  const isBestMatch = hasMatch && job.matchScore >= BEST_MATCH_THRESHOLD;

  return (
    <Link to={`/job/${job.slug}`} className="job-card">
      {isBestMatch && (
        <span className="job-card-best-match"><Icon name="sparkle" size={12} /> {t("jobs.card.bestMatch", "Best Match")}</span>
      )}
      <div className="job-card-top">
        <span className="job-card-type">{job.jobType}</span>
        {hasMatch && !isBestMatch && (
          <span className="job-card-match-chip">{t("jobs.card.matchPercent", "{percent}% match").replace("{percent}", job.matchScore)}</span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {job.category && <span className="job-card-category">{job.category}</span>}
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
        </div>
      </div>

      <h3 className="job-card-title">{job.title}</h3>
      <p className="job-card-poster">{t("jobs.card.by", "By")} {job.postedBy}</p>

      <p className="job-card-meta">
        <Icon name="mapPin" size={13} /> {job.location}
        {workModeLabel && <span className="job-card-workmode">{workModeLabel}</span>}
      </p>
      {(distance != null || directionsUrl) && (
        <p className="job-card-meta job-card-distance-row">
          {distance != null && <span>{formatDistance(distance)}</span>}
          {directionsUrl && (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="job-card-directions-link">
              <Icon name="compass" size={12} /> {t("jobs.card.getDirections", "Get Directions")}
            </a>
          )}
        </p>
      )}
      {job.experienceRequired && <p className="job-card-meta">{job.experienceRequired}</p>}
      {job.salary && <p className="job-card-salary">{job.salary}</p>}

      {visibleSkills.length > 0 && (
        <div className="job-card-skills">
          {visibleSkills.map((skill) => <span className="job-card-skill-chip" key={skill}>{skill}</span>)}
          {extraSkillCount > 0 && <span className="job-card-skill-chip more">+{extraSkillCount}</span>}
        </div>
      )}

      <div className="job-card-footer">
        <span>{t("jobs.card.posted", "Posted")} {formatDate(job.createdAt)}</span>
        {job.applicationDeadline && (
          <span className="job-card-deadline">{t("jobs.card.closes", "Closes")} {formatDate(job.applicationDeadline)}</span>
        )}
        {job.applicantCount > 0 && (
          <span>
            {job.applicantCount}{" "}
            {job.applicantCount === 1 ? t("jobs.card.applicant", "applicant") : t("jobs.card.applicants", "applicants")}
          </span>
        )}
      </div>
    </Link>
  );
}

export default JobCard;
