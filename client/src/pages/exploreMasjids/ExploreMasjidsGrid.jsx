import React from "react";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import MediaCountBadge from "../../components/MediaCountBadge.jsx";
import { API_ORIGIN } from "../../config.js";
import { locationOf, VerifiedTick, ActiveCampaignBadge, DistanceBadge, GetDirectionsButton } from "./exploreMasjidsShared.jsx";
import EngagementRow from "../../components/masjid/EngagementRow.jsx";

function ExploreMasjidsGrid({ masjids, userLocation, onOpenReviews }) {
  return (
    <div className="msj-explore-grid">
      {masjids.map((m) => (
        // A plain div (not <Link>) so the Get Directions <a> below can nest safely —
        // an <a> can't be a valid descendant of another <a>.
        <div className="msj-explore-card" key={m.id} onClick={() => onOpenReviews(m)} role="link" tabIndex={0}>
          <div className="msj-explore-thumb">
            <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
            <VerifiedTick />
            <MediaCountBadge photoCount={m.photoCount} videoCount={m.videoCount} />
          </div>
          <div className="msj-explore-body">
            <div className="msj-explore-card-top">
              <h3>{m.name}</h3>
              <GetDirectionsButton m={m} />
            </div>
            {m.category && <span className="msj-category-badge">{m.category}</span>}
            {m.tagline && <p className="msj-explore-tagline">{m.tagline}</p>}
            <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {locationOf(m)}</p>
            <div className="msj-explore-row-meta">
              <EngagementRow masjid={m} variant="grid" onOpenReviews={() => onOpenReviews(m, "reviews")} />
              <ActiveCampaignBadge m={m} />
              <DistanceBadge userLocation={userLocation} m={m} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ExploreMasjidsGrid;
