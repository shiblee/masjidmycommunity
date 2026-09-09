import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

export { default as MediaCountBadge } from "../../components/MediaCountBadge.jsx";
export { ActiveCampaignBadge, excerpt } from "../exploreMasjids/exploreMasjidsShared.jsx";

// A plain function (not a component) so it works both inside React
// (Grid/List, called with the `t` from their own useTranslation()) and
// inside MyMasjidsMap.jsx's raw-HTML Leaflet popup (also passed `t`
// from its own component scope) — mirrors JobApplicants.jsx's
// buildStatusLabel(t) pattern.
export function buildStatusLabel(t) {
  return {
    draft: t("masjidWizard.status.draft", "Draft"),
    submitted: t("masjidWizard.status.submitted", "Submitted"),
    under_review: t("masjidWizard.status.underReview", "Under Review"),
    changes_requested: t("masjidWizard.status.changesRequested", "Changes Requested"),
    approved: t("masjidWizard.status.approved", "Approved"),
    rejected: t("masjidWizard.status.rejected", "Rejected"),
    inactive: t("masjidWizard.status.inactive", "Inactive"),
    deleted: t("masjidWizard.status.deleted", "Deleted"),
  };
}
export const EDITABLE = new Set(["draft", "changes_requested"]);

const SEARCHABLE_FIELDS = ["name", "tagline", "about", "category", "city", "area", "district", "state", "country", "formattedAddress"];

export function matchesSearch(masjid, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return SEARCHABLE_FIELDS.some((field) => (masjid[field] || "").toLowerCase().includes(q));
}

export function locationOf(m, t) {
  return [m.city, m.country].filter(Boolean).join(", ") || t("myMasjidsShared.locationNotSet", "Location not set");
}

/** Edit/View/Campaign/Delete action links shared by Grid and List views. */
export function MasjidActions({ m, onDelete }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="msj-list-actions">
      <Link to={`/account/my-masjids/${m.id}`}>{EDITABLE.has(m.status) ? t("masjidWizard.summary.edit", "Edit") : t("myMasjidsShared.viewDetails", "View Details")}</Link>
      {m.adminFeedback && <Link to={`/account/my-masjids/${m.id}`}>{t("myMasjidsShared.viewAdminFeedback", "View Admin Feedback")}</Link>}
      {m.status === "approved" && <Link to={`/masjid/${m.id}`}>{t("myMasjidsShared.viewPublicProfile", "View Public Profile")}</Link>}
      {m.status === "approved" && m.isGreenTick && <Link to={`/account/my-campaigns/new?masjidId=${m.id}`}>{t("myMasjidsShared.createCampaign", "Create a Campaign")}</Link>}
      {m.status === "approved" && <Link to={`/account/my-campaigns?masjidId=${m.id}`}>{t("myMasjidsShared.manageCampaigns", "Manage Campaigns")}</Link>}
      <button type="button" className="danger" onClick={() => onDelete(m)}>{t("myMasjidsShared.delete", "Delete")}</button>
    </div>
  );
}

export function CampaignsLink({ m }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <button type="button" className="msj-list-campaigns" onClick={() => navigate(`/account/my-campaigns?masjidId=${m.id}`)}>
      {t("myMasjidsShared.campaignsLabel", "Campaigns:")} <strong>{m.campaignCount}</strong>
    </button>
  );
}
