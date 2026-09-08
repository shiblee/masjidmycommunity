import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import AllDonorsModal from "./AllDonorsModal.jsx";

const PREVIEW_COUNT = 5;

function CampaignDonorsList({ slug, donorCount }) {
  const [donors, setDonors] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    axios
      .get(`${API_BASE}/campaigns/public/${slug}/donors`, { params: { pageSize: PREVIEW_COUNT } })
      .then(({ data }) => setDonors(data.donors))
      .catch(() => setDonors([]));
  }, [slug]);

  return (
    <div className="card msj-profile-card camp-donors-card">
      <div className="camp-donors-head">
        <h4>Donors</h4>
        <span className="msj-list-meta">{donorCount ?? 0} contribution{donorCount === 1 ? "" : "s"}</span>
      </div>

      <div className="camp-donor-list">
        {donors === null && <p className="msj-note">Loading…</p>}
        {donors && donors.length === 0 && <p className="msj-note">Be the first to support this campaign.</p>}
        {donors?.map((d) => (
          <div className="camp-donor-row" key={d.id}>
            <div className="camp-donor-avatar">{d.donorName === "Anonymous" ? <Icon name="heart" size={13} /> : d.donorName.trim()[0]?.toUpperCase()}</div>
            <div className="camp-donor-info">
              <strong>{d.donorName}</strong>
              <span>{formatDate(d.createdAt)}</span>
            </div>
            <div className="camp-donor-amount">₹{Number(d.amount).toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>

      {donorCount > 0 && (
        <button type="button" className="btn btn-outline-ink" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => setShowAll(true)}>
          View All Donors
        </button>
      )}

      {showAll && <AllDonorsModal slug={slug} total={donorCount} onClose={() => setShowAll(false)} />}
    </div>
  );
}

export default CampaignDonorsList;
