import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import MediaCountBadge from "../../components/MediaCountBadge.jsx";
import { API_ORIGIN } from "../../config.js";
import { locationOf, VerifiedTick, ActiveCampaignBadge, DistanceBadge, excerpt } from "./exploreMasjidsShared.jsx";

function ExploreMasjidsList({ masjids, onViewOnMap, userLocation }) {
  return (
    <div className="msj-explore-row-list">
      {masjids.map((m) => (
        <div className="msj-explore-row" key={m.id}>
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
            <Link to={`/masjid/${m.id}`}>View Details</Link>
            <button type="button" onClick={() => onViewOnMap(m)}>View on Map</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ExploreMasjidsList;
