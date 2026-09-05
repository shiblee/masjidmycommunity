import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import MediaCountBadge from "../../components/MediaCountBadge.jsx";
import { API_ORIGIN } from "../../config.js";
import { locationOf, VerifiedTick, ActiveCampaignBadge, DistanceBadge } from "./exploreMasjidsShared.jsx";

function ExploreMasjidsGrid({ masjids, userLocation }) {
  return (
    <div className="msj-explore-grid">
      {masjids.map((m) => (
        <Link to={`/masjid/${m.id}`} className="msj-explore-card" key={m.id}>
          <div className="msj-explore-thumb">
            <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
            <VerifiedTick />
            <MediaCountBadge photoCount={m.photoCount} videoCount={m.videoCount} />
          </div>
          <div className="msj-explore-body">
            <h3>{m.name}</h3>
            {m.category && <span className="msj-category-badge">{m.category}</span>}
            {m.tagline && <p className="msj-explore-tagline">{m.tagline}</p>}
            <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {locationOf(m)}</p>
            <div className="msj-explore-row-meta">
              <ActiveCampaignBadge m={m} />
              <DistanceBadge userLocation={userLocation} m={m} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default ExploreMasjidsGrid;
