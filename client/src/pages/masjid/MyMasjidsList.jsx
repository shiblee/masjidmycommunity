import React from "react";
import { Icon } from "../../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import MediaThumb from "../../components/MediaThumb.jsx";
import {
  buildStatusLabel, locationOf, MasjidActions, MediaCountBadge, CampaignsLink,
  ActiveCampaignBadge, excerpt,
} from "./myMasjidsShared.jsx";
import EngagementRow from "../../components/masjid/EngagementRow.jsx";
import GreenTickBadge from "../../components/masjid/GreenTickBadge.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

function MyMasjidsList({ masjids, onDelete, onViewOnMap }) {
  const { t } = useTranslation();
  const STATUS_LABEL = buildStatusLabel(t);
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
              <GreenTickBadge masjid={m} variant="list" />
              <span className={`acct-status-pill ${m.status}`}>{STATUS_LABEL[m.status]}</span>
              {m.category && <span className="msj-category-badge">{m.category}</span>}
            </div>
            <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {locationOf(m, t)}{m.address ? ` — ${m.address}` : ""}</p>
            {m.imamName && <p className="msj-explore-row-imam">{t("exploreMasjidsPage.list.imamLabel", "Imam:")} {m.imamName}</p>}
            {excerpt(m.about) && <p className="msj-explore-row-about">{excerpt(m.about)}</p>}
            <div className="msj-explore-row-meta">
              <span>{t("myMasjidsShared.registered", "Registered {date}").replace("{date}", formatDate(m.createdAt))}</span>
              <CampaignsLink m={m} />
              <ActiveCampaignBadge m={m} />
              {m.status === "approved" && <EngagementRow masjid={m} variant="list" />}
            </div>
          </div>
          <div className="msj-explore-row-actions-col">
            <button type="button" className="msj-view-on-map" onClick={() => onViewOnMap(m)}>{t("exploreMasjidsPage.list.viewOnMap", "View on Map")}</button>
            <MasjidActions m={m} onDelete={onDelete} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default MyMasjidsList;
