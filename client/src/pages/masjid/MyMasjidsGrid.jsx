import React from "react";
import { Icon } from "../../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import MediaThumb from "../../components/MediaThumb.jsx";
import { STATUS_LABEL, locationOf, MasjidActions, MediaCountBadge, CampaignsLink } from "./myMasjidsShared.jsx";

function MyMasjidsGrid({ masjids, onDelete }) {
  return (
    <div className="msj-list-grid">
      {masjids.map((m) => (
        <div className="msj-list-card" key={m.id}>
          <div className="msj-list-thumb">
            <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
            <MediaCountBadge photoCount={m.photoCount} videoCount={m.videoCount} />
          </div>
          <div className="msj-list-body">
            <div className="msj-list-top">
              <h3>{m.name}</h3>
              <span className={`acct-status-pill ${m.status}`}>{STATUS_LABEL[m.status]}</span>
            </div>
            {m.category && <span className="msj-category-badge">{m.category}</span>}
            <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {locationOf(m)}</p>
            <p className="msj-list-meta">Registered {formatDate(m.createdAt)}</p>
            <CampaignsLink m={m} />
            <MasjidActions m={m} onDelete={onDelete} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default MyMasjidsGrid;
