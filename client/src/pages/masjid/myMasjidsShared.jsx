import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";

export const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", approved: "Approved", rejected: "Rejected", inactive: "Inactive", deleted: "Deleted",
};
export const EDITABLE = new Set(["draft", "changes_requested"]);

const SEARCHABLE_FIELDS = ["name", "tagline", "about", "category", "city", "area", "district", "state", "country", "formattedAddress"];

export function matchesSearch(masjid, query) {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return SEARCHABLE_FIELDS.some((field) => (masjid[field] || "").toLowerCase().includes(q));
}

export function locationOf(m) {
  return [m.city, m.country].filter(Boolean).join(", ") || "Location not set";
}

/** Edit/View/Campaign/Delete action links shared by Grid and List views. */
export function MasjidActions({ m, onDelete }) {
  const navigate = useNavigate();
  return (
    <div className="msj-list-actions">
      <Link to={`/account/my-masjids/${m.id}`}>{EDITABLE.has(m.status) ? "Edit" : "View Details"}</Link>
      {m.adminFeedback && <Link to={`/account/my-masjids/${m.id}`}>View Admin Feedback</Link>}
      {m.status === "approved" && <Link to={`/masjid/${m.id}`}>View Public Profile</Link>}
      {m.status === "approved" && <Link to={`/account/my-campaigns/new?masjidId=${m.id}`}>Create a Campaign</Link>}
      {m.status === "approved" && <Link to={`/account/my-campaigns?masjidId=${m.id}`}>Manage Campaigns</Link>}
      <button type="button" className="danger" onClick={() => onDelete(m)}>Delete</button>
    </div>
  );
}

/** Small "5 photos · 1 video" badge shown on Grid thumbs, List rows, and Map popups. */
export function MediaCountBadge({ photoCount, videoCount }) {
  if (!photoCount && !videoCount) return null;
  return (
    <span className="msj-media-badge">
      {photoCount > 0 && <span><Icon name="imageIcon" size={12} /> {photoCount}</span>}
      {videoCount > 0 && <span><Icon name="play" size={12} /> {videoCount}</span>}
    </span>
  );
}

export function CampaignsLink({ m }) {
  const navigate = useNavigate();
  return (
    <button type="button" className="msj-list-campaigns" onClick={() => navigate(`/account/my-campaigns?masjidId=${m.id}`)}>
      Campaigns: <strong>{m.campaignCount}</strong>
    </button>
  );
}
