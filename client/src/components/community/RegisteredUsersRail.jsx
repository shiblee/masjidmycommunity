import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import MediaThumb from "../MediaThumb.jsx";
import userApi from "../../services/userApi.js";
import { API_ORIGIN } from "../../config.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const RAIL_PAGE_SIZE = 6;

// Self-contained like ReelsRail.jsx -- each instance fetches its own
// preview on mount, so rendering this repeatedly through the feed (see
// Community.jsx's interval-checkpoint loop) works the same way the Reels
// rail already repeats: no shared state to thread through, just drop
// another <RegisteredUsersRail /> wherever it should reappear.
function RegisteredUsersRail() {
  const { t } = useTranslation();
  const [users, setUsers] = useState(null);

  useEffect(() => {
    userApi
      .get("/public", { params: { pageSize: RAIL_PAGE_SIZE } })
      .then(({ data }) => setUsers(data.users || []))
      .catch(() => setUsers([]));
  }, []);

  if (!users || users.length === 0) return null;

  return (
    <div className="cw-users-rail">
      <div className="cw-users-rail-head">
        <h4><Icon name="people" size={15} /> {t("community.registeredUsers.heading", "Registered Users")}</h4>
        <Link to="/explore-users" className="cw-side-link" style={{ marginTop: 0 }}>
          {t("communityWall.sideList.viewAllUsers", "See All Users")} <span className="btn-arrow">→</span>
        </Link>
      </div>
      <div className="cw-users-scroll">
        {users.map((u) => (
          <Link to={`/profile/${u.username}`} className="cw-user-tile" key={u.id}>
            <span className="cw-user-tile-avatar">
              <MediaThumb src={u.profilePhoto ? `${API_ORIGIN}${u.profilePhoto}` : null} />
            </span>
            <span className="cw-user-tile-name">{u.fullName}</span>
            <span className="cw-user-tile-loc">{[u.locationCity, u.locationCountry].filter(Boolean).join(", ")}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default RegisteredUsersRail;
