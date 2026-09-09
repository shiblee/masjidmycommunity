import React from "react";
import { Icon } from "../Icons.jsx";
import SkillsFilter from "../../pages/jobs/SkillsFilter.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const WORK_MODES = [
  ["on_site", "jobs.card.onSite", "On-site"],
  ["remote", "jobs.card.remote", "Remote"],
  ["hybrid", "jobs.card.hybrid", "Hybrid"],
];

// Persistent left-hand filter panel — replaces Phase 1's top category strip
// + collapsible filter row with the layout a job-board audience expects
// (filters always visible while browsing, not one tap away). Collapses to a
// toggle-revealed panel on mobile via the `open` prop.
function JobFiltersSidebar({
  open,
  jobCategories, category, onCategoryChange,
  jobTypes, jobType, onJobTypeChange,
  experienceLevels, experienceRequired, onExperienceChange,
  workMode, onWorkModeChange,
  hasSalary, onToggleSalary,
  skills, selectedSkills, onSkillsChange,
  hasAnyFilter, onClearAll,
}) {
  const { t } = useTranslation();

  return (
    <aside className={`job-filters-sidebar${open ? " open" : ""}`}>
      <div className="job-filters-sidebar-head">
        <h3>{t("jobs.sidebar.title", "Filters")}</h3>
        {hasAnyFilter && <button type="button" className="msj-clear-all" onClick={onClearAll}>{t("jobs.filter.clearAll", "Clear All Filters")}</button>}
      </div>

      <div className="job-filter-group">
        <h4>{t("jobs.sidebar.category", "Category")}</h4>
        <div className="job-filter-list">
          <button type="button" className={category === "" ? "active" : ""} onClick={() => onCategoryChange("")}>
            {t("jobs.sidebar.allCategories", "All Categories")}
          </button>
          {jobCategories.map((c) => (
            <button key={c.id} type="button" className={category === c.name ? "active" : ""} onClick={() => onCategoryChange(c.name)}>
              <Icon name={c.icon || "briefcase"} size={14} /> {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="job-filter-group">
        <h4>{t("jobs.sidebar.jobType", "Job Type")}</h4>
        <div className="job-filter-list">
          <button type="button" className={jobType === "" ? "active" : ""} onClick={() => onJobTypeChange("")}>
            {t("jobs.filter.allTypes", "All Types")}
          </button>
          {jobTypes.map((jt) => (
            <button key={jt.id} type="button" className={jobType === jt.name ? "active" : ""} onClick={() => onJobTypeChange(jt.name)}>
              {jt.name}
            </button>
          ))}
        </div>
      </div>

      <div className="job-filter-group">
        <h4>{t("jobs.sidebar.experience", "Experience")}</h4>
        <select className="job-filter-select" value={experienceRequired} onChange={(e) => onExperienceChange(e.target.value)}>
          <option value="">{t("jobs.filter.anyExperience", "Any Experience")}</option>
          {experienceLevels.map((lvl) => <option key={lvl.id} value={lvl.name}>{lvl.name}</option>)}
        </select>
      </div>

      <div className="job-filter-group">
        <h4>{t("jobs.sidebar.workMode", "Work Mode")}</h4>
        <div className="job-filter-list">
          <button type="button" className={workMode === "" ? "active" : ""} onClick={() => onWorkModeChange("")}>
            {t("jobs.filter.anyWorkMode", "Any Work Mode")}
          </button>
          {WORK_MODES.map(([value, key, fallback]) => (
            <button key={value} type="button" className={workMode === value ? "active" : ""} onClick={() => onWorkModeChange(value)}>
              {t(key, fallback)}
            </button>
          ))}
        </div>
      </div>

      <div className="job-filter-group">
        <h4>{t("jobs.sidebar.skills", "Skills")}</h4>
        <SkillsFilter skills={skills} selected={selectedSkills} onChange={onSkillsChange} />
      </div>

      <div className="job-filter-group">
        <label className="job-filter-checkbox">
          <input type="checkbox" checked={hasSalary} onChange={onToggleSalary} />
          {t("jobs.filter.salaryListed", "Salary Listed")}
        </label>
      </div>
    </aside>
  );
}

export default JobFiltersSidebar;
