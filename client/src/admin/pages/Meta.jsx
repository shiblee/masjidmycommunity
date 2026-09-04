import React, { useEffect, useState } from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import adminApi from "../services/adminApi.js";
import MasjidCategoryPanel from "./meta/MasjidCategoryPanel.jsx";
import CampaignCategoryPanel from "./meta/CampaignCategoryPanel.jsx";
import CampaignClassificationPanel from "./meta/CampaignClassificationPanel.jsx";
import ConcernTypePanel from "./meta/ConcernTypePanel.jsx";
import ContactTopicPanel from "./meta/ContactTopicPanel.jsx";
import BankPanel from "./meta/BankPanel.jsx";
import DeletionReasonPanel from "./meta/DeletionReasonPanel.jsx";
import ReportReasonPanel from "./meta/ReportReasonPanel.jsx";
import SkillPanel from "./meta/SkillPanel.jsx";
import HobbyPanel from "./meta/HobbyPanel.jsx";
import LanguagePanel from "./meta/LanguagePanel.jsx";
import MaritalStatusPanel from "./meta/MaritalStatusPanel.jsx";
import EducationLevelPanel from "./meta/EducationLevelPanel.jsx";
import DegreePanel from "./meta/DegreePanel.jsx";
import InstitutionPanel from "./meta/InstitutionPanel.jsx";
import FieldOfStudyPanel from "./meta/FieldOfStudyPanel.jsx";
import CompanyPanel from "./meta/CompanyPanel.jsx";
import EmploymentTypePanel from "./meta/EmploymentTypePanel.jsx";
import MetaChangeLogPanel from "./meta/MetaChangeLogPanel.jsx";
import { META_ENTITY_LABELS } from "./meta/entityLabels.js";
import Icon from "../components/Icons.jsx";

// Registry of master-data entities managed under the Meta module. Adding a
// future entity (Masjid Type, ...) is just one more entry here plus its own
// panel component (and a matching label in entityLabels.js) — nothing else
// in this file changes. `path`/`countKey` drive the sidebar's live count
// badge; entries without them (the Change Log) skip that fetch.
const META_ENTITIES = [
  { key: "masjid-category", label: META_ENTITY_LABELS["masjid-category"], icon: "mosque", Component: MasjidCategoryPanel, path: "masjid-categories", countKey: "categories" },
  { key: "campaign-category", label: META_ENTITY_LABELS["campaign-category"], icon: "campaign", Component: CampaignCategoryPanel, path: "campaign-categories", countKey: "categories" },
  { key: "campaign-classification", label: META_ENTITY_LABELS["campaign-classification"], icon: "donation", Component: CampaignClassificationPanel, path: "campaign-classifications", countKey: "classifications" },
  { key: "concern-type", label: META_ENTITY_LABELS["concern-type"], icon: "shield", Component: ConcernTypePanel, path: "concern-types", countKey: "types" },
  { key: "contact-topic", label: META_ENTITY_LABELS["contact-topic"], icon: "mail", Component: ContactTopicPanel, path: "contact-topics", countKey: "topics" },
  { key: "bank", label: META_ENTITY_LABELS.bank, icon: "wallet", Component: BankPanel, path: "banks", countKey: "banks" },
  { key: "deletion-reason", label: META_ENTITY_LABELS["deletion-reason"], icon: "trash", Component: DeletionReasonPanel, path: "deletion-reasons", countKey: "reasons" },
  { key: "report-reason", label: META_ENTITY_LABELS["report-reason"], icon: "flag", Component: ReportReasonPanel, path: "report-reasons", countKey: "reasons" },
  { key: "skill", label: META_ENTITY_LABELS.skill, icon: "target", Component: SkillPanel, path: "skills", countKey: "skills" },
  { key: "hobby", label: META_ENTITY_LABELS.hobby, icon: "layers", Component: HobbyPanel, path: "hobbies", countKey: "hobbies" },
  { key: "language", label: META_ENTITY_LABELS.language, icon: "globe", Component: LanguagePanel, path: "languages", countKey: "languages" },
  { key: "marital-status", label: META_ENTITY_LABELS["marital-status"], icon: "heart", Component: MaritalStatusPanel, path: "marital-statuses", countKey: "statuses" },
  { key: "education-level", label: META_ENTITY_LABELS["education-level"], icon: "book", Component: EducationLevelPanel, path: "education-levels", countKey: "educationLevels" },
  { key: "degree", label: META_ENTITY_LABELS.degree, icon: "fileText", Component: DegreePanel, path: "degrees", countKey: "degrees" },
  { key: "institution", label: META_ENTITY_LABELS.institution, icon: "building", Component: InstitutionPanel, path: "institutions", countKey: "institutions" },
  { key: "field-of-study", label: META_ENTITY_LABELS["field-of-study"], icon: "star", Component: FieldOfStudyPanel, path: "fields-of-study", countKey: "fieldsOfStudy" },
  { key: "company", label: META_ENTITY_LABELS.company, icon: "briefcase", Component: CompanyPanel, path: "companies", countKey: "companies" },
  { key: "employment-type", label: META_ENTITY_LABELS["employment-type"], icon: "clock", Component: EmploymentTypePanel, path: "employment-types", countKey: "employmentTypes" },
  { key: "change-log", label: "Change Log", icon: "activity", Component: MetaChangeLogPanel },
];

function Meta() {
  const { entityKey } = useParams();
  const entity = META_ENTITIES.find((e) => e.key === entityKey);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      META_ENTITIES.filter((e) => e.path).map((e) =>
        adminApi.get(`/${e.path}`).then(({ data }) => [e.key, (data[e.countKey] || []).length]).catch(() => [e.key, null])
      )
    ).then((pairs) => {
      if (cancelled) return;
      setCounts(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
    // Re-fetched on every tab switch (not just on first mount) so a count
    // that changed while working inside a panel is reflected on return.
  }, [entityKey]);

  if (!entity) return <Navigate to={`/admin/meta/${META_ENTITIES[0].key}`} replace />;

  const Panel = entity.Component;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>Meta</h1>
          <p>Manage the master data used across masjid and campaign registration</p>
        </div>
      </div>

      <div className="amx-settings-layout">
        <nav className="amx-settings-nav">
          {META_ENTITIES.map((e) => (
            <NavLink key={e.key} to={`/admin/meta/${e.key}`} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon name={e.icon} />
              <span className="amx-nav-label">{e.label}</span>
              {counts[e.key] != null && <span className="amx-nav-count">{counts[e.key]}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="amx-card amx-panel">
          <Panel />
        </div>
      </div>
    </>
  );
}

export default Meta;
