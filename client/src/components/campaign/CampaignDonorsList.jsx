import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../Icons.jsx";
import DonorRow from "./DonorRow.jsx";
import AllDonorsModal from "./AllDonorsModal.jsx";

const PREVIEW_COUNT = 5;

function CampaignDonorsList({ slug, campaignTitle, donorCount }) {
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
        {donors === null && Array.from({ length: 3 }).map((_, i) => (
          <div className="camp-donor-row camp-donor-row-skeleton" key={i} aria-hidden="true">
            <div className="camp-donor-avatar camp-donor-skel-block" />
            <div className="camp-donor-info">
              <span className="camp-donor-skel-block camp-donor-skel-line" style={{ width: "55%" }} />
              <span className="camp-donor-skel-block camp-donor-skel-line" style={{ width: "35%" }} />
            </div>
          </div>
        ))}
        {donors && donors.length === 0 && (
          <div className="camp-donor-state">
            <Icon name="heart" size={20} />
            <p>Be the first to support this campaign.</p>
          </div>
        )}
        {donors?.map((d) => <DonorRow key={d.id} donor={d} />)}
      </div>

      {donorCount > 0 && (
        <button type="button" className="btn btn-outline-ink" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => setShowAll(true)}>
          View All Donors
        </button>
      )}

      {showAll && <AllDonorsModal slug={slug} total={donorCount} campaignTitle={campaignTitle} onClose={() => setShowAll(false)} />}
    </div>
  );
}

export default CampaignDonorsList;
