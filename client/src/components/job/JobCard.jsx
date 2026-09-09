import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";
import { useJobFavorite } from "../../hooks/useJobFavorite.js";

const WORK_MODE_KEY = {
  on_site: ["jobs.card.onSite", "On-site"],
  remote: ["jobs.card.remote", "Remote"],
  hybrid: ["jobs.card.hybrid", "Hybrid"],
};

const MAX_SKILL_CHIPS = 4;

// Reusable job-card, shared by Jobs.jsx's main grid, "Recommended"/"Saved"/
// etc. rails as they land in later phases — one shape, one place that knows
// how to render a job summary, matching the withCard() response shape from
// publicJobController.js.
function JobCard({ job }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { favorited, toggle, busy } = useJobFavorite(job.id, { favorited: !!job.favorited });
  const skills = job.skills || [];
  const visibleSkills = skills.slice(0, MAX_SKILL_CHIPS);
  const extraSkillCount = skills.length - visibleSkills.length;
  const workModeEntry = job.workMode && WORK_MODE_KEY[job.workMode];
  const workModeLabel = workModeEntry ? t(workModeEntry[0], workModeEntry[1]) : null;

  const onSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggle();
    if (result.needsLogin) navigate("/auth");
  };

  return (
    <Link to={`/job/${job.slug}`} className="job-card">
      <div className="job-card-top">
        <span className="job-card-type">{job.jobType}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          {job.category && <span className="job-card-category">{job.category}</span>}
          <button
            type="button"
            className={`job-card-save${favorited ? " active" : ""}`}
            onClick={onSaveClick}
            disabled={busy}
            aria-label={favorited ? t("jobs.card.unsave", "Remove from saved jobs") : t("jobs.card.save", "Save job")}
            title={favorited ? t("jobs.card.unsave", "Remove from saved jobs") : t("jobs.card.save", "Save job")}
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
