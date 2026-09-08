import React from "react";
import { API_ORIGIN } from "../../config.js";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";

// Shared between the campaign page's compact donor preview and the "All
// Donors" modal so the avatar rules (real photo vs. initials vs. the
// distinct anonymous mark) only live in one place.
function DonorAvatar({ donor }) {
  if (donor.donorName === "Anonymous") {
    return (
      <div className="camp-donor-avatar camp-donor-avatar-anon" aria-hidden="true">
        <Icon name="heart" size={13} />
      </div>
    );
  }
  if (donor.donorPhoto) {
    return <img className="camp-donor-avatar camp-donor-avatar-photo" src={`${API_ORIGIN}${donor.donorPhoto}`} alt="" />;
  }
  return (
    <div className="camp-donor-avatar" aria-hidden="true">
      {donor.donorName.trim()[0]?.toUpperCase()}
    </div>
  );
}

function DonorRow({ donor }) {
  return (
    <div className="camp-donor-row">
      <DonorAvatar donor={donor} />
      <div className="camp-donor-info">
        <strong>{donor.donorName}</strong>
        <span>{formatDate(donor.createdAt)}</span>
      </div>
      <div className="camp-donor-amount">₹{Number(donor.amount).toLocaleString("en-IN")}</div>
    </div>
  );
}

export default DonorRow;
