import React from "react";
import { Icon } from "../../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import MediaThumb from "../../components/MediaThumb.jsx";
import { STATUS_LABEL, locationOf, MasjidActions, MediaCountBadge, CampaignsLink } from "./myMasjidsShared.jsx";

function MyMasjidsList({ masjids, onDelete }) {
  return (
    <div className="msj-row-list">
      {masjids.map((m) => (
        <div className="msj-row-item" key={m.id}>
          <div className="msj-row-thumb">
            <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
          </div>
          <div className="msj-row-main">
            <div className="msj-row-top">
              <h3>{m.name}</h3>
              {m.category && <span className="msj-category-badge">{m.category}</span>}
              <span className={`acct-status-pill ${m.status}`}>{STATUS_LABEL[m.status]}</span>
            </div>
            <div className="msj-row-meta">
              <span><Icon name="mapPin" size={13} /> {locationOf(m)}</span>
              <span>Registered {formatDate(m.createdAt)}</span>
              <MediaCountBadge photoCount={m.photoCount} videoCount={m.videoCount} />
              <CampaignsLink m={m} />
            </div>
          </div>
          <MasjidActions m={m} onDelete={onDelete} />
        </div>
      ))}
    </div>
  );
}

export default MyMasjidsList;
