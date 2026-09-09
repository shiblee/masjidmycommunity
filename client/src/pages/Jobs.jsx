import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config.js";
import { Icon } from "../components/Icons.jsx";
import SkillsFilter from "./jobs/SkillsFilter.jsx";
import JobCard from "../components/job/JobCard.jsx";
import JobCardSkeleton from "../components/job/JobCardSkeleton.jsx";
import JobRail from "../components/job/JobRail.jsx";
import JobAiAssistant from "../components/job/JobAiAssistant.jsx";
import publicJobApi from "../services/publicJobApi.js";
import jobApi from "../services/jobApi.js";
import { getStoredUser } from "../utils/userAuthStorage.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const PAGE_SIZE = 12;
const SKELETON_COUNT = 6;

const WORK_MODES = [
  ["on_site", "jobs.card.onSite", "On-site"],
  ["remote", "jobs.card.remote", "Remote"],
  ["hybrid", "jobs.card.hybrid", "Hybrid"],
];

function Jobs() {
  const { t, language } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [category, setCategory] = useState("");
  const [jobType, setJobType] = useState("");
  const [experienceRequired, setExperienceRequired] = useState("");
  const [workMode, setWorkMode] = useState("");
  const [hasSalary, setHasSalary] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [skipLocation, setSkipLocation] = useState(false);

  const [jobCategories, setJobCategories] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [skills, setSkills] = useState([]);

  const [jobs, setJobs] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [savedJobs, setSavedJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [bySkills, setBySkills] = useState([]);
  const [closingSoon, setClosingSoon] = useState([]);
  const isLoggedIn = !!getStoredUser();

  useEffect(() => {
    axios.get(`${API_BASE}/jobs/public/meta/categories`).then(({ data }) => setJobCategories(data.jobCategories)).catch(() => {});
    axios.get(`${API_BASE}/jobs/public/meta/job-types`).then(({ data }) => setJobTypes(data.employmentTypes)).catch(() => {});
    axios.get(`${API_BASE}/jobs/public/meta/experience-levels`).then(({ data }) => setExperienceLevels(data.experienceLevels)).catch(() => {});
    axios.get(`${API_BASE}/jobs/public/meta/skills`).then(({ data }) => setSkills(data.skills)).catch(() => {});
    publicJobApi.get("/", { params: { sort: "deadline", pageSize: 8 } }).then(({ data }) => setClosingSoon(data.jobs)).catch(() => {});

    if (isLoggedIn) {
      publicJobApi.get("/liked/mine", { params: { pageSize: 10 } }).then(({ data }) => setSavedJobs(data.jobs)).catch(() => {});
      jobApi.get("/mine/applications").then(({ data }) => setMyApplications(data.applications.slice(0, 10))).catch(() => {});
      publicJobApi.get("/recommended", { params: { limit: 10 } }).then(({ data }) => setRecommended(data.jobs)).catch(() => {});
      publicJobApi.get("/by-skills", { params: { limit: 10 } }).then(({ data }) => setBySkills(data.jobs)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      axios
        .get(`${API_BASE}/jobs/public`, {
          params: {
            nlQuery: q || undefined,
            lang: language || undefined,
            category: category || undefined,
            jobType: jobType || undefined,
            experienceRequired: experienceRequired || undefined,
            workMode: workMode || undefined,
            hasSalary: hasSalary || undefined,
            skills: selectedSkills.length ? selectedSkills.join(",") : undefined,
            skipLocation: skipLocation || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
        })
        .then(({ data }) => {
          setJobs((prev) => (page === 1 ? data.jobs : [...(prev || []), ...data.jobs]));
          setTotal(data.total);
          setAppliedFilters(data.appliedFilters || null);
        })
        .catch(() => { if (page === 1) setJobs([]); })
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [q, category, jobType, experienceRequired, workMode, hasSalary, selectedSkills, skipLocation, page]);

  const runSearch = (e) => {
    e?.preventDefault();
    setQ(searchInput);
    setSkipLocation(false);
    setPage(1);
  };

  const broadenWithoutLocation = () => {
    setSkipLocation(true);
    setPage(1);
  };

  const changeCategory = (value) => { setCategory((c) => (c === value ? "" : value)); setPage(1); };
  const changeType = (value) => { setJobType(value); setPage(1); };
  const changeExperience = (value) => { setExperienceRequired(value); setPage(1); };
  const changeWorkMode = (value) => { setWorkMode((w) => (w === value ? "" : value)); setPage(1); };
  const toggleSalary = () => { setHasSalary((v) => !v); setPage(1); };
  const changeSkills = (next) => { setSelectedSkills(next); setPage(1); };
  const canLoadMore = jobs && jobs.length < total;
  const hasAnyFilter = q || category || jobType || experienceRequired || workMode || hasSalary || selectedSkills.length > 0;

  const workModeLabel = (mode) => {
    const entry = WORK_MODES.find(([value]) => value === mode);
    return entry ? t(entry[1], entry[2]) : mode;
  };

  const activeFilters = [
    category && { key: "category", label: category },
    jobType && { key: "jobType", label: jobType },
    experienceRequired && { key: "experience", label: experienceRequired },
    workMode && { key: "workMode", label: workModeLabel(workMode) },
    hasSalary && { key: "salary", label: t("jobs.filter.salaryListed", "Salary Listed") },
    ...selectedSkills.map((s) => ({ key: `skill:${s}`, label: s, skill: s })),
  ].filter(Boolean);

  const removeFilter = (f) => {
    if (f.key === "category") return changeCategory(category);
    if (f.key === "jobType") return changeType("");
    if (f.key === "experience") return changeExperience("");
    if (f.key === "workMode") return changeWorkMode(workMode);
    if (f.key === "salary") return toggleSalary();
    if (f.skill) return changeSkills(selectedSkills.filter((s) => s !== f.skill));
  };

  const clearAll = () => {
    setSearchInput("");
    setQ("");
    setCategory("");
    setJobType("");
    setExperienceRequired("");
    setWorkMode("");
    setHasSalary(false);
    setSelectedSkills([]);
    setAppliedFilters(null);
    setSkipLocation(false);
    setPage(1);
  };

  // Deterministic, honest reflection of what the natural-language search
  // understood — no extra AI call, just the structured filters the last
  // response already returned, so the user can see (and correct) the
  // interpretation rather than a silent black box.
  const understoodBits = appliedFilters
    ? [
        appliedFilters.keywords?.length && appliedFilters.keywords.join(" "),
        appliedFilters.jobType,
        appliedFilters.experienceLevel,
        appliedFilters.workMode && workModeLabel(appliedFilters.workMode),
        appliedFilters.location && `${t("jobs.ai.near", "near")} ${appliedFilters.location}`,
        appliedFilters.skills?.length && appliedFilters.skills.join(", "),
      ].filter(Boolean)
    : [];

  return (
    <main className="msj-page">
      <section className="cw-hero msj-explore-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">{t("jobs.hero.eyebrow", "Jobs")}</span>
          <h1>{t("jobs.hero.title", "Openings from across the community.")}</h1>
          <p>{t("jobs.hero.subtitle", "Roles posted directly by community members — teaching, administration, and more.")}</p>

          <form className="job-hero-search" onSubmit={runSearch}>
            <Icon name="search" size={17} />
            <input
              type="text"
              placeholder={t("jobs.hero.searchPlaceholder", "Search jobs, skills, companies, or locations…")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit">{t("jobs.hero.searchButton", "Search")}</button>
          </form>
        </div>
      </section>

      <section className="py-md msj-explore-content">
        <div className="wrap">
          <JobAiAssistant />

          <JobRail
            icon="sparkle"
            title={t("jobs.rails.recommended.title", "Recommended for You")}
            subtitle={t("jobs.rails.recommended.subtitle", "Based on your skills, experience, and location")}
            count={recommended.length}
          >
            {recommended.map((j) => <JobCard job={j} key={j.id} />)}
          </JobRail>

          <JobRail
            icon="target"
            title={t("jobs.rails.bySkills.title", "Based on Your Skills")}
            subtitle={t("jobs.rails.bySkills.subtitle", "Jobs that share at least one skill with your profile")}
            count={bySkills.length}
          >
            {bySkills.map((j) => <JobCard job={j} key={j.id} />)}
          </JobRail>

          <JobRail
            icon="heart"
            title={t("jobs.rails.saved.title", "Saved Jobs")}
            subtitle={t("jobs.rails.saved.subtitle", "Jobs you've bookmarked to come back to")}
            count={savedJobs.length}
          >
            {savedJobs.map((j) => <JobCard job={j} key={j.id} />)}
          </JobRail>

          <JobRail
            icon="mail"
            title={t("jobs.rails.applications.title", "My Applications")}
            subtitle={t("jobs.rails.applications.subtitle", "Where your recent applications stand")}
            count={myApplications.length}
          >
            {myApplications.map((a) => (
              <Link to={`/job/${a.job.slug}`} className="job-rail-app-item" key={a.id}>
                <h4>{a.job.title}</h4>
                <p><Icon name="mapPin" size={12} /> {a.job.location}</p>
                <span className={`acct-status-pill ${a.status === "hired" ? "active" : a.status === "rejected" ? "rejected" : a.status === "shortlisted" ? "approved" : "submitted"}`}>
                  {t(`jobApply.status.${a.status === "under_review" ? "underReview" : a.status}`, a.status)}
                </span>
              </Link>
            ))}
          </JobRail>

          <JobRail
            icon="clock"
            title={t("jobs.rails.closingSoon.title", "Closing Soon")}
            subtitle={t("jobs.rails.closingSoon.subtitle", "Roles with an application deadline coming up")}
            count={closingSoon.length}
          >
            {closingSoon.map((j) => <JobCard job={j} key={j.id} />)}
          </JobRail>

          {jobCategories.length > 0 && (
            <div className="job-category-strip">
              {jobCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`job-category-pill${category === c.name ? " active" : ""}`}
                  onClick={() => changeCategory(c.name)}
                >
                  <span className="job-category-pill-icon"><Icon name={c.icon || "briefcase"} size={13} /></span>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="job-filters-bar">
            <button
              type="button"
              className={`job-filters-toggle${filtersOpen ? " active" : ""}`}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <Icon name="chevronDown" size={14} /> {t("jobs.filter.filtersToggle", "Filters")}
              {activeFilters.length > 0 && ` (${activeFilters.length})`}
            </button>

            <div className={`job-filters-row${filtersOpen ? " open" : ""}`}>
              <div className="campaign-filters" style={{ margin: 0 }}>
                <button className={`filter-chip${jobType === "" ? " active" : ""}`} onClick={() => changeType("")}>{t("jobs.filter.allTypes", "All Types")}</button>
                {jobTypes.map((jt) => (
                  <button key={jt.id} className={`filter-chip${jobType === jt.name ? " active" : ""}`} onClick={() => changeType(jt.name)}>
                    {jt.name}
                  </button>
                ))}
              </div>

              <select className="msj-select" value={experienceRequired} onChange={(e) => changeExperience(e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 100, padding: "9px 16px", fontSize: 14, background: "#fff" }}>
                <option value="">{t("jobs.filter.anyExperience", "Any Experience")}</option>
                {experienceLevels.map((lvl) => <option key={lvl.id} value={lvl.name}>{lvl.name}</option>)}
              </select>

              <select className="msj-select" value={workMode} onChange={(e) => changeWorkMode(e.target.value)} style={{ border: "1px solid var(--line)", borderRadius: 100, padding: "9px 16px", fontSize: 14, background: "#fff" }}>
                <option value="">{t("jobs.filter.anyWorkMode", "Any Work Mode")}</option>
                {WORK_MODES.map(([value, key, fallback]) => <option key={value} value={value}>{t(key, fallback)}</option>)}
              </select>

              <SkillsFilter skills={skills} selected={selectedSkills} onChange={changeSkills} />
              <button type="button" className={`filter-chip${hasSalary ? " active" : ""}`} onClick={toggleSalary}>
                {t("jobs.filter.salaryListed", "Salary Listed")}
              </button>
            </div>
          </div>

          {understoodBits.length > 0 && (
            <div className="job-ai-understood">
              <Icon name="sparkle" size={13} />
              <span>{t("jobs.ai.understood", "Showing results for")}: {understoodBits.join(", ")}</span>
            </div>
          )}

          {activeFilters.length > 0 && (
            <div className="msj-active-filters">
              {activeFilters.map((f) => (
                <span className="msj-active-filter-chip" key={f.key}>
                  {f.label}
                  <button type="button" onClick={() => removeFilter(f)}><Icon name="x" size={11} /></button>
                </span>
              ))}
              <button type="button" className="msj-clear-all" onClick={clearAll}>{t("jobs.filter.clearAll", "Clear All Filters")}</button>
            </div>
          )}

          <div className="filter-count">
            {loading && page === 1
              ? t("jobs.filter.loadingJobs", "Loading jobs…")
              : `${t("jobs.filter.showing", "Showing")} ${jobs?.length || 0} ${t("jobs.filter.of", "of")} ${total} ${t("jobs.filter.jobsCount", "jobs")}`}
          </div>

          {loading && page === 1 ? (
            <div className="msj-list-grid" style={{ marginTop: 12 }}>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : jobs?.length === 0 ? (
            <div className="msj-empty-state">
              <Icon name="briefcase" size={30} />
              <h3>{hasAnyFilter ? t("jobs.empty.filteredTitle", "No jobs match your filters") : t("jobs.empty.noneTitle", "No open jobs right now")}</h3>
              <p>{hasAnyFilter ? t("jobs.empty.filteredBody", "Try removing a filter or broadening your search.") : t("jobs.empty.noneBody", "Check back soon — new roles are posted by the community often.")}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                {appliedFilters?.location && !skipLocation && (
                  <button type="button" className="btn btn-outline-ink" onClick={broadenWithoutLocation}>
                    {t("jobs.empty.tryWithoutLocation", "Search without location")}
                  </button>
                )}
                {hasAnyFilter && <button type="button" className="btn btn-outline-ink" onClick={clearAll}>{t("jobs.filter.clearAll", "Clear All Filters")}</button>}
              </div>
            </div>
          ) : (
            <div className="msj-list-grid" style={{ marginTop: 12 }}>
              {jobs?.map((j) => <JobCard job={j} key={j.id} />)}
            </div>
          )}

          {canLoadMore && (
            <div style={{ textAlign: "center", marginTop: "36px" }}>
              <button className="btn btn-outline-ink" disabled={loading} onClick={() => setPage((p) => p + 1)}>
                {loading ? t("jobs.loadingEllipsis", "Loading…") : t("jobs.loadMore", "Load More Jobs")}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Jobs;
