import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config.js";
import { Icon } from "../components/Icons.jsx";
import { formatDate } from "../utils/formatDateTime.js";
import SkillsFilter from "./jobs/SkillsFilter.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const PAGE_SIZE = 12;

function Jobs() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [jobType, setJobType] = useState("");
  const [experienceRequired, setExperienceRequired] = useState("");
  const [hasSalary, setHasSalary] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState([]);

  const [jobTypes, setJobTypes] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [skills, setSkills] = useState([]);

  const [jobs, setJobs] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/jobs/public/meta/job-types`).then(({ data }) => setJobTypes(data.employmentTypes)).catch(() => {});
    axios.get(`${API_BASE}/jobs/public/meta/experience-levels`).then(({ data }) => setExperienceLevels(data.experienceLevels)).catch(() => {});
    axios.get(`${API_BASE}/jobs/public/meta/skills`).then(({ data }) => setSkills(data.skills)).catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      axios
        .get(`${API_BASE}/jobs/public`, {
          params: {
            q: q || undefined,
            jobType: jobType || undefined,
            experienceRequired: experienceRequired || undefined,
            hasSalary: hasSalary || undefined,
            skills: selectedSkills.length ? selectedSkills.join(",") : undefined,
            page,
            pageSize: PAGE_SIZE,
          },
        })
        .then(({ data }) => {
          setJobs((prev) => (page === 1 ? data.jobs : [...(prev || []), ...data.jobs]));
          setTotal(data.total);
        })
        .catch(() => { if (page === 1) setJobs([]); })
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [q, jobType, experienceRequired, hasSalary, selectedSkills, page]);

  const changeType = (value) => { setJobType(value); setPage(1); };
  const changeExperience = (value) => { setExperienceRequired(value); setPage(1); };
  const toggleSalary = () => { setHasSalary((v) => !v); setPage(1); };
  const changeSkills = (next) => { setSelectedSkills(next); setPage(1); };
  const canLoadMore = jobs && jobs.length < total;

  const activeFilters = [
    jobType && { key: "jobType", label: jobType },
    experienceRequired && { key: "experience", label: experienceRequired },
    hasSalary && { key: "salary", label: t("jobs.filter.salaryListed", "Salary Listed") },
    ...selectedSkills.map((s) => ({ key: `skill:${s}`, label: s, skill: s })),
  ].filter(Boolean);

  const removeFilter = (f) => {
    if (f.key === "jobType") return changeType("");
    if (f.key === "experience") return changeExperience("");
    if (f.key === "salary") return toggleSalary();
    if (f.skill) return changeSkills(selectedSkills.filter((s) => s !== f.skill));
  };

  const clearAll = () => {
    setJobType("");
    setExperienceRequired("");
    setHasSalary(false);
    setSelectedSkills([]);
    setPage(1);
  };

  return (
    <main className="msj-page">
      <section className="cw-hero msj-explore-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">{t("jobs.hero.eyebrow", "Jobs")}</span>
          <h1>{t("jobs.hero.title", "Openings from across the community.")}</h1>
          <p>{t("jobs.hero.subtitle", "Roles posted directly by community members — teaching, administration, and more.")}</p>
        </div>
      </section>

      <section className="py-md msj-explore-content">
        <div className="wrap">
          <div className="campaign-filters" style={{ margin: "0 0 12px" }}>
            <button className={`filter-chip${jobType === "" ? " active" : ""}`} onClick={() => changeType("")}>{t("jobs.filter.allTypes", "All Types")}</button>
            {jobTypes.map((jt) => (
              <button key={jt.id} className={`filter-chip${jobType === jt.name ? " active" : ""}`} onClick={() => changeType(jt.name)}>
                {jt.name}
              </button>
            ))}
          </div>

          <div className="campaign-filters" style={{ margin: "0 0 16px" }}>
            <button className={`filter-chip${experienceRequired === "" ? " active" : ""}`} onClick={() => changeExperience("")}>{t("jobs.filter.anyExperience", "Any Experience")}</button>
            {experienceLevels.map((lvl) => (
              <button key={lvl.id} className={`filter-chip${experienceRequired === lvl.name ? " active" : ""}`} onClick={() => changeExperience(lvl.name)}>
                {lvl.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
            <SkillsFilter skills={skills} selected={selectedSkills} onChange={changeSkills} />
            <button type="button" className={`filter-chip${hasSalary ? " active" : ""}`} onClick={toggleSalary}>
              {t("jobs.filter.salaryListed", "Salary Listed")}
            </button>
            <div className="msj-search" style={{ flex: "0 1 360px", marginLeft: "auto" }}>
              <Icon name="search" size={16} />
              <input type="text" placeholder={t("jobs.search.placeholder", "Search jobs…")} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
          </div>

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

          {!loading && jobs?.length === 0 ? (
            <div className="campaign-empty">
              <p>{q || jobType || experienceRequired || hasSalary || selectedSkills.length ? t("jobs.empty.filtered", "No jobs match your filters right now.") : t("jobs.empty.none", "No open jobs right now — check back soon.")}</p>
            </div>
          ) : (
            <div className="msj-list-grid" style={{ marginTop: 12 }}>
              {jobs?.map((j) => (
                <Link to={`/job/${j.slug}`} className="msj-list-card" key={j.id} style={{ display: "block" }}>
                  <div className="msj-list-body">
                    <div className="msj-list-top">
                      <h3>{j.title}</h3>
                      <span className="acct-status-pill">{j.jobType}</span>
                    </div>
                    <p className="msj-list-meta"><Icon name="mapPin" size={13} /> {j.location}{j.experienceRequired ? ` · ${j.experienceRequired}` : ""}</p>
                    {j.salary && <p className="msj-list-meta">{j.salary}</p>}
                    <p className="msj-list-meta">{t("jobs.card.by", "By")} {j.postedBy} · {t("jobs.card.posted", "Posted")} {formatDate(j.createdAt)}</p>
                  </div>
                </Link>
              ))}
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
