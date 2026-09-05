import React from "react";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import { StarRating } from "./exploreMasjidsShared.jsx";

function ReviewRow({ review }) {
  const reviewer = review.reviewer;
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
      </div>
    </div>
  );
}

export default ReviewRow;
