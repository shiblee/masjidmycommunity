import React, { useState } from "react";
import axios from "axios";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { getUserToken } from "../../utils/userAuthStorage.js";
import { formatDate } from "../../utils/formatDateTime.js";
import { StarRating } from "./exploreMasjidsShared.jsx";

const API = `${API_BASE}/masjids/public`;

function ReviewRow({ review }) {
  const reviewer = review.reviewer;
  const [likeCount, setLikeCount] = useState(review.likeCount || 0);
  const [likedByMe, setLikedByMe] = useState(!!review.likedByMe);
  const [busy, setBusy] = useState(false);

  const toggleLike = async () => {
    const token = getUserToken();
    if (!token) { window.location.href = "/auth"; return; }
    setBusy(true);
    const nextLiked = !likedByMe;
    setLikedByMe(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const method = nextLiked ? "post" : "delete";
      const { data } = await axios[method](`${API}/reviews/${review.id}/like`, method === "post" ? {} : undefined, { headers: { Authorization: `Bearer ${token}` } });
      setLikedByMe(data.likedByMe);
      setLikeCount(data.likeCount);
    } catch {
      setLikedByMe(!nextLiked);
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="msj-review-row">
      <MediaThumb src={reviewer?.profilePhoto ? `${API_ORIGIN}${reviewer.profilePhoto}` : null} className="msj-review-avatar" />
      <div className="msj-review-row-body">
        <div className="msj-review-row-top">
          <strong>{reviewer?.fullName || "A Masjid My Community member"}</strong>
          <span className="msj-review-date">{formatDate(review.createdAt)}</span>
        </div>
        <StarRating value={review.rating} size={13} />
        {review.body && <p className="msj-review-body">{review.body}</p>}
        {review.media?.length > 0 && (
          <div className="msj-review-media-strip">
            {review.media.map((m) => (
              <MediaThumb key={m.id} src={`${API_ORIGIN}${m.url}`} mediaType={m.mediaType} className="msj-review-media-strip-thumb" videoProps={{ controls: true }} />
            ))}
          </div>
        )}
        <button type="button" className={`msj-review-like-btn ${likedByMe ? "active" : ""}`} onClick={toggleLike} disabled={busy}>
          <Icon name="heart" size={13} /> {likeCount > 0 ? likeCount : ""} Helpful
        </button>
      </div>
    </div>
  );
}

export default ReviewRow;
