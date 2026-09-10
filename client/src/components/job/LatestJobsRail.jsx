import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import publicJobApi from "../../services/publicJobApi.js";
import { Icon } from "../Icons.jsx";
import MicButton from "../MicButton.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import { useJobFavorite } from "../../hooks/useJobFavorite.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const RAIL_SIZE = 20;
const MAX_SKILL_CHIPS = 2;
const BEST_MATCH_THRESHOLD = 75;

const WORK_MODE_KEY = {
  on_site: ["jobs.card.onSite", "On-site"],
  remote: ["jobs.card.remote", "Remote"],
  hybrid: ["jobs.card.hybrid", "Hybrid"],
};

// One rail entry — same signal set as JobCard.jsx (AI match/Best Match,
// category, work mode, skills, save) just laid out for a ~250px column
// instead of a full-width grid card.
function RailJobCard({ job }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { favorited, toggle, busy } = useJobFavorite(job.id, { favorited: !!job.favorited });
  const skills = job.skills || [];
  const visibleSkills = skills.slice(0, MAX_SKILL_CHIPS);
  const extraSkillCount = skills.length - visibleSkills.length;
  const workModeEntry = job.workMode && WORK_MODE_KEY[job.workMode];
  const workModeLabel = workModeEntry ? t(workModeEntry[0], workModeEntry[1]) : null;
  const hasMatch = typeof job.matchScore === "number";
  const isBestMatch = hasMatch && job.matchScore >= BEST_MATCH_THRESHOLD;

  const onSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggle();
    if (result.needsLogin) navigate("/auth");
  };

  return (
    <Link to={`/job/${job.slug}`} className="camp-rail-card job-rail-card">
      <div className="camp-rail-card-body">
        <div className="job-rail-card-top">
          {isBestMatch ? (
            <span className="job-rail-match-chip best"><Icon name="sparkle" size={10} /> {t("jobs.card.bestMatch", "Best Match")}</span>
          ) : hasMatch ? (
            <span className="job-rail-match-chip"><Icon name="sparkle" size={10} /> {t("jobs.card.matchPercent", "{percent}% match").replace("{percent}", job.matchScore)}</span>
          ) : (
            <span className="job-card-type">{job.jobType}</span>
          )}
          {job.category && <span className="job-card-category">{job.category}</span>}
          <button
            type="button"
            className={`job-card-save${favorited ? " active" : ""}`}
            onClick={onSaveClick}
            disabled={busy}
            aria-label={favorited ? t("jobs.card.unlike", "Remove from liked jobs") : t("jobs.card.like", "Like job")}
            title={favorited ? t("jobs.card.unlike", "Remove from liked jobs") : t("jobs.card.like", "Like job")}
          >
            <Icon name="heart" size={12} />
          </button>
        </div>

        <div className="camp-rail-card-loc">{job.postedBy} · {job.location}</div>
        <div className="camp-rail-card-title">{job.title}</div>

        {(workModeLabel || visibleSkills.length > 0) && (
          <div className="job-rail-card-chips">
            {workModeLabel && <span className="job-card-workmode">{workModeLabel}</span>}
            {visibleSkills.map((skill) => <span className="job-card-skill-chip" key={skill}>{skill}</span>)}
            {extraSkillCount > 0 && <span className="job-card-skill-chip more">+{extraSkillCount}</span>}
          </div>
        )}

        <div className="camp-rail-card-meta">
          <span>{job.jobType}</span>
          <span>{formatDate(job.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

// Left column of the job detail page — every other open job, mirroring
// RunningCampaignsRail.jsx's exact pattern (search, sticky, excludes the
// current item, plain client-side route change on click). Uses publicJobApi
// (not raw axios) so a logged-in viewer's AI match score and saved state
// come through here too, same as the main Jobs board.
function LatestJobsRail({ currentSlug, excludeId }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      publicJobApi
        .get("/", { params: { q: q || undefined, excludeId, pageSize: RAIL_SIZE } })
        .then(({ data }) => setJobs(data.jobs))
        .catch(() => setJobs([]));
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [q, excludeId]);

  return (
    <aside className="camp-rail">
      <div className="camp-rail-head">
        <span className="eyebrow">{t("jobProfile.rail.eyebrow", "Latest Jobs")}</span>
      </div>
      <div className="msj-search camp-rail-search">
        <Icon name="search" size={14} />
        <input type="text" placeholder={t("jobProfile.rail.searchPlaceholder", "Search jobs…")} value={q} onChange={(e) => setQ(e.target.value)} />
        <MicButton onTranscript={(text) => setQ(text)} />
      </div>

      <div className="camp-rail-list">
        {jobs === null && <p className="msj-note">{t("jobProfile.rail.loading", "Loading…")}</p>}
        {jobs && jobs.length === 0 && <p className="msj-note">{t("jobProfile.rail.empty", "No other jobs right now.")}</p>}
        {jobs?.map((j) => <RailJobCard job={j} key={j.id} />)}
      </div>
    </aside>
  );
}

export default LatestJobsRail;
