import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../Icons.jsx";
import userApi from "../../services/userApi.js";
import { API_ORIGIN } from "../../config.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

const PAGE_SIZE = 20;

// Shared by both the "Followers" and "Following" lists on a profile --
// `type` picks the endpoint, `viewer` gates whether the per-row Follow
// button renders at all (a logged-out visitor just sees the list).
function FollowListModal({ userId, type, title, viewer, onClose }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = (nextPage) => {
    setLoading(true);
    userApi
      .get(`/${userId}/${type}`, { params: { page: nextPage, pageSize: PAGE_SIZE } })
      .then(({ data }) => {
        setUsers((prev) => (nextPage === 1 ? data.users : [...prev, ...data.users]));
        setTotal(data.total);
        setPage(nextPage);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, type]);

  const toggleFollow = async (row) => {
    if (!viewer) return;
    setBusyId(row.id);
    try {
      if (row.isFollowing) {
        await userApi.delete(`/${row.id}/follow`);
      } else {
        await userApi.post(`/${row.id}/follow`);
      }
      setUsers((prev) => prev.map((u) => (u.id === row.id ? { ...u, isFollowing: !row.isFollowing } : u)));
    } catch {
      // best-effort -- row just stays in its previous state
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal msj-modal-wide pf-follow-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label={t("common.close", "Close")}><Icon name="x" size={16} /></button>
        <h3>{title}</h3>

        {loading && users.length === 0 ? (
          <p className="msj-note">{t("profile.follow.loading", "Loading…")}</p>
        ) : users.length === 0 ? (
          <p className="msj-note">
            {type === "followers"
              ? t("profile.follow.emptyFollowers", "No followers yet.")
              : t("profile.follow.emptyFollowing", "Not following anyone yet.")}
          </p>
        ) : (
          <div className="pf-follow-list">
            {users.map((u) => (
              <div key={u.id} className="pf-follow-row">
                <Link to={`/profile/${u.username}`} className="pf-follow-row-identity" onClick={onClose}>
                  {u.profilePhoto ? (
                    <img className="pf-follow-row-avatar" src={`${API_ORIGIN}${u.profilePhoto}`} alt={u.fullName} />
                  ) : (
                    <span className="pf-follow-row-avatar pf-follow-row-avatar-fallback">{initialsOf(u.fullName)}</span>
                  )}
                  <span className="pf-follow-row-text">
                    <strong>{u.fullName}</strong>
                    <span>@{u.username}</span>
                  </span>
                </Link>
                {viewer && viewer.id !== u.id && (
                  <button
                    type="button"
                    className={`pf-follow-row-btn${u.isFollowing ? " is-following" : ""}`}
                    disabled={busyId === u.id}
                    onClick={() => toggleFollow(u)}
                  >
                    {u.isFollowing ? t("profile.follow.following", "Following") : t("profile.follow.follow", "Follow")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && users.length < total && (
          <button type="button" className="btn btn-outline-ink" style={{ marginTop: 14 }} onClick={() => load(page + 1)}>
            {t("profile.follow.loadMore", "Load more")}
          </button>
        )}
      </div>
    </div>
  );
}

export default FollowListModal;
