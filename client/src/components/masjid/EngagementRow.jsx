import React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import { RatingChip } from "../../pages/exploreMasjids/exploreMasjidsShared.jsx";
import { useMasjidLike } from "../../hooks/useMasjidLike.js";
import { formatCompactNumber } from "../../utils/formatCompactNumber.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// The one Like/Rating/Review display used everywhere a masjid appears —
// Grid/List/Map cards, Nearby, My Masjid, Liked Masjids, Campaign pages.
// `variant` only changes text density, never the underlying data or
// interaction: "grid"/"map" stay bare numbers (lightweight, not KPI-card
// styled), "list"/"detail" spell out "Likes"/"Reviews" where there's room.
// Pass `onOpenReviews` to make the rating piece clickable (reuses the
// existing RatingChip exactly, so Explore's click-to-review behavior is
// unchanged); omit it for a plain, non-interactive display.
function EngagementRow({ masjid, variant = "list", onOpenReviews, className = "" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { liked, likeCount, toggle, busy } = useMasjidLike(masjid.id, {
    liked: !!masjid.likedByMe,
    likeCount: masjid.likeCount || 0,
  });

  const handleToggle = async (e) => {
    e.stopPropagation();
    const result = await toggle();
    if (result?.needsLogin) navigate("/auth");
  };

  const verbose = variant === "list" || variant === "detail";

  return (
    <div className={`msj-engagement-row msj-engagement-${variant} ${className}`}>
      <button
        type="button"
        className={`msj-like-btn${liked ? " liked" : ""}`}
        onClick={handleToggle}
        disabled={busy}
        aria-pressed={liked}
        aria-label={liked ? t("engagement.unlike", "Unlike this masjid") : t("engagement.like", "Like this masjid")}
      >
        <Icon name="heart" size={13} />
        {likeCount > 0 && (
          <span className="msj-like-count">
            {formatCompactNumber(likeCount)}{verbose ? ` ${t("engagement.likes", "Likes")}` : ""}
          </span>
        )}
      </button>

      {masjid.reviewCount > 0 && (
        onOpenReviews ? (
          <RatingChip m={masjid} onClick={onOpenReviews} />
        ) : (
          <span className="msj-rating-chip-static">
            <Icon name="star" size={12} /> {Number(masjid.avgRating).toFixed(1)}
            <span className="msj-rating-chip-count">
              {verbose ? ` (${masjid.reviewCount} ${t("engagement.reviews", "Reviews")})` : ` (${masjid.reviewCount})`}
            </span>
          </span>
        )
      )}
    </div>
  );
}

export default EngagementRow;
