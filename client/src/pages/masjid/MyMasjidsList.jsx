import React from "react";
import { Icon } from "../../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import MediaThumb from "../../components/MediaThumb.jsx";
import {
  STATUS_LABEL, locationOf, MasjidActions, MediaCountBadge, CampaignsLink,
  VerifiedTick, ActiveCampaignBadge, excerpt,
} from "./myMasjidsShared.jsx";

function MyMasjidsList({ masjids, onDelete, onViewOnMap }) {
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
              {m.status === "approved" && <VerifiedTick inline />}
              <span className={`acct-status-pill ${m.status}`}>{STATUS_LABEL[m.status]}</span>
              {m.category && <span className="msj-category-badge">{m.category}</span>}
            </div>
            <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {locationOf(m)}{m.address ? ` — ${m.address}` : ""}</p>
            {m.imamName && <p className="msj-explore-row-imam">Imam: {m.imamName}</p>}
            {excerpt(m.about) && <p className="msj-explore-row-about">{excerpt(m.about)}</p>}
            <div className="msj-explore-row-meta">
              <span>Registered {formatDate(m.createdAt)}</span>
              <CampaignsLink m={m} />
              <ActiveCampaignBadge m={m} />
            </div>
          </div>
          <div className="msj-explore-row-actions-col">
            <button type="button" className="msj-view-on-map" onClick={() => onViewOnMap(m)}>View on Map</button>
            <MasjidActions m={m} onDelete={onDelete} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default MyMasjidsList;
