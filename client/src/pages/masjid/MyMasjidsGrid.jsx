import React from "react";
import { Icon } from "../../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import MediaThumb from "../../components/MediaThumb.jsx";
import { STATUS_LABEL, locationOf, MasjidActions, MediaCountBadge, CampaignsLink } from "./myMasjidsShared.jsx";
import EngagementRow from "../../components/masjid/EngagementRow.jsx";
import GreenTickBadge from "../../components/masjid/GreenTickBadge.jsx";

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
              <span className="msj-card-title-row">
                <h3>{m.name}</h3>
                <GreenTickBadge masjid={m} variant="grid" />
              </span>
              <span className={`acct-status-pill ${m.status}`}>{STATUS_LABEL[m.status]}</span>
            </div>
            {m.category && <span className="msj-category-badge">{m.category}</span>}
            <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {locationOf(m)}</p>
            {m.status === "approved" && <EngagementRow masjid={m} variant="list" className="msj-list-engagement" />}
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
