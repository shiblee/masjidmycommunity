import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { getUserToken } from "../../utils/userAuthStorage.js";
import { formatDate } from "../../utils/formatDateTime.js";
import { locationOf, StarRating } from "./exploreMasjidsShared.jsx";

const API = `${API_BASE}/masjids/public`;

function ReviewForm({ masjidId, existing, onSaved, onCancel }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [body, setBody] = useState(existing?.body || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!rating) { setError("Please select a star rating."); return; }
    setBusy(true);
    setError("");
    try {
      const token = getUserToken();
      const { data } = await axios.post(
        `${API}/${masjidId}/reviews`,
        { rating, body: body.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved(data.review);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your review. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="msj-review-form">
      <StarRating value={rating} onChange={setRating} size={26} />
      <textarea
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share details of your own experience at this masjid…"
        maxLength={2000}
      />
      {error && <p className="msj-review-form-error">{error}</p>}
      <div className="msj-review-form-actions">
        <button type="button" className="btn btn-outline-ink" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn-gold" onClick={submit} disabled={busy}>
          {busy ? "Posting…" : existing ? "Update Review" : "Post Review"}
        </button>
      </div>
    </div>
  );
}

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
      </div>
    </div>
  );
}

function MasjidReviewModal({ masjid, initialTab = "overview", onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const loggedIn = !!getUserToken();

  const load = () => {
    axios
      .get(`${API}/${masjid.id}/reviews`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ average: 0, count: 0, breakdown: {}, reviews: [] }));
    if (loggedIn) {
      const token = getUserToken();
      axios
        .get(`${API}/${masjid.id}/reviews/mine`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setMyReview(data.review))
        .catch(() => {});
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjid.id]);

  const handleSaved = (review) => {
    setMyReview(review);
    setShowForm(false);
    load();
  };

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal msj-modal-wide msj-review-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>

        {tab === "overview" ? (
          <div className="msj-review-photo-wrap">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="msj-review-modal-photo" />
            {masjid.photoCount > 0 && (
              <Link to={`/masjid/${masjid.id}`} className="msj-review-see-photos">
                <Icon name="imageIcon" size={14} /> See Photos
              </Link>
            )}
          </div>
        ) : (
          <div className="msj-review-modal-header">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="msj-review-modal-cover" />
            <div>
              <h3>{masjid.name}</h3>
              <div className="msj-review-modal-rating">
                <StarRating value={data?.average || 0} size={16} />
                {data && <span>{data.average.toFixed(1)} ({data.count} review{data.count === 1 ? "" : "s"})</span>}
              </div>
              <p className="msj-list-loc"><Icon name="mapPin" size={13} /> {locationOf(masjid)}</p>
            </div>
          </div>
        )}

        {tab === "overview" && (
          <div className="msj-review-modal-titleblock">
            <h3>{masjid.name}</h3>
            <div className="msj-review-modal-rating">
              <StarRating value={data?.average || 0} size={16} />
              {data && <span>{data.average.toFixed(1)} ({data.count} review{data.count === 1 ? "" : "s"})</span>}
            </div>
            <p className="msj-list-loc"><Icon name="mapPin" size={13} /> {locationOf(masjid)}</p>
          </div>
        )}

        <div className="msj-review-tabs">
          <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
          <button type="button" className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>Reviews</button>
          <button type="button" className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}>About</button>
        </div>

        {tab === "overview" && (
          <div className="msj-review-overview">
            <Link to={`/masjid/${masjid.id}`} className="btn btn-outline-ink msj-review-view-profile">View Full Profile</Link>
          </div>
        )}

        {tab === "about" && (
          <div className="msj-review-about-panel">
            {masjid.tagline && <p className="msj-review-tagline">{masjid.tagline}</p>}
            {masjid.category && <span className="msj-category-badge">{masjid.category}</span>}
            {masjid.about ? (
              <>
                <h4 className="msj-review-about-heading">About the Masjid</h4>
                <p className="msj-review-about">{masjid.about}</p>
              </>
            ) : (
              <p className="msj-review-empty">No description added yet.</p>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div className="msj-review-list-panel">
            {data && data.count > 0 && (
              <div className="msj-rating-breakdown">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div className="msj-rating-breakdown-row" key={n}>
                    <span>{n}</span>
                    <div className="msj-rating-breakdown-track">
                      <div className="msj-rating-breakdown-fill" style={{ width: `${data.count ? (data.breakdown[n] / data.count) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showForm && (
              loggedIn ? (
                <button type="button" className="btn btn-gold" onClick={() => setShowForm(true)}>
                  {myReview ? "Edit Your Review" : "Write a Review"}
                </button>
              ) : (
                <p className="msj-review-login-prompt"><Link to="/auth">Sign in</Link> to write a review.</p>
              )
            )}

            {showForm && (
              <ReviewForm masjidId={masjid.id} existing={myReview} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
            )}

            <div className="msj-review-list">
              {data?.reviews.length === 0 && <p className="msj-review-empty">No reviews yet — be the first to share your experience.</p>}
              {data?.reviews.map((r) => <ReviewRow review={r} key={r.id} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MasjidReviewModal;
