import React from "react";
import { NavLink, Navigate, useParams } from "react-router-dom";
import MasjidCategoryPanel from "./meta/MasjidCategoryPanel.jsx";
import CampaignCategoryPanel from "./meta/CampaignCategoryPanel.jsx";
import CampaignClassificationPanel from "./meta/CampaignClassificationPanel.jsx";
import ConcernTypePanel from "./meta/ConcernTypePanel.jsx";
import BankPanel from "./meta/BankPanel.jsx";
import DeletionReasonPanel from "./meta/DeletionReasonPanel.jsx";
import ReportReasonPanel from "./meta/ReportReasonPanel.jsx";
import SkillPanel from "./meta/SkillPanel.jsx";
import HobbyPanel from "./meta/HobbyPanel.jsx";
import Icon from "../components/Icons.jsx";

// Registry of master-data entities managed under the Meta module. Adding a
// future entity (Masjid Type, ...) is just one more entry here plus its own
// panel component — nothing else in this file changes.
const META_ENTITIES = [
  { key: "masjid-category", label: "Masjid Category", icon: "mosque", Component: MasjidCategoryPanel },
  { key: "campaign-category", label: "Campaign Category", icon: "campaign", Component: CampaignCategoryPanel },
  { key: "campaign-classification", label: "Fundraising Classification", icon: "donation", Component: CampaignClassificationPanel },
  { key: "concern-type", label: "Type of Concern", icon: "shield", Component: ConcernTypePanel },
  { key: "bank", label: "Banks", icon: "wallet", Component: BankPanel },
  { key: "deletion-reason", label: "Masjid Deletion Reasons", icon: "trash", Component: DeletionReasonPanel },
  { key: "report-reason", label: "Report Post Reasons", icon: "flag", Component: ReportReasonPanel },
  { key: "skill", label: "Skills", icon: "target", Component: SkillPanel },
  { key: "hobby", label: "Hobbies", icon: "layers", Component: HobbyPanel },
];

function Meta() {
  const { entityKey } = useParams();
  const entity = META_ENTITIES.find((e) => e.key === entityKey);

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
              {e.label}
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
