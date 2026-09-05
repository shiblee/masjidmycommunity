import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import MediaCountBadge from "../../components/MediaCountBadge.jsx";
import { API_ORIGIN } from "../../config.js";
import { locationOf, VerifiedTick, ActiveCampaignBadge, DistanceBadge, GetDirectionsButton, excerpt } from "./exploreMasjidsShared.jsx";

function ExploreMasjidsList({ masjids, onViewOnMap, userLocation }) {
  const navigate = useNavigate();
  return (
    <div className="msj-explore-row-list">
      {masjids.map((m) => (
        <div className="msj-explore-row msj-explore-row-clickable" key={m.id} onClick={() => navigate(`/masjid/${m.id}`)} role="link" tabIndex={0}>
          <div className="msj-explore-row-thumb">
            <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
            <MediaCountBadge photoCount={m.photoCount} videoCount={m.videoCount} />
          </div>
          <div className="msj-explore-row-body">
            <div className="msj-explore-row-top">
              <h3>{m.name}</h3>
              <VerifiedTick inline />
              {m.category && <span className="msj-category-badge">{m.category}</span>}
            </div>
            <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {locationOf(m)}{m.address ? ` — ${m.address}` : ""}</p>
            {m.imamName && <p className="msj-explore-row-imam">Imam: {m.imamName}</p>}
            {excerpt(m.about) && <p className="msj-explore-row-about">{excerpt(m.about)}</p>}
            <div className="msj-explore-row-meta">
              <ActiveCampaignBadge m={m} />
              <DistanceBadge userLocation={userLocation} m={m} />
            </div>
          </div>
          <div className="msj-list-actions msj-explore-row-actions">
            <GetDirectionsButton m={m} className="msj-explore-row-directions" />
            <button type="button" onClick={(e) => { e.stopPropagation(); onViewOnMap(m); }}>View on Map</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ExploreMasjidsList;
