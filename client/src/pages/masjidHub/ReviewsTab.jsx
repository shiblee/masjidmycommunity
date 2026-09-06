import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { getUserToken } from "../../utils/userAuthStorage.js";
import { StarRating } from "../exploreMasjids/exploreMasjidsShared.jsx";
import ReviewForm from "../exploreMasjids/ReviewForm.jsx";
import ReviewRow from "../exploreMasjids/ReviewRow.jsx";

const API = `${API_BASE}/masjids/public`;

function ReviewsTab({ masjidId }) {
  const [data, setData] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [reviewSettings, setReviewSettings] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const loggedIn = !!getUserToken();

  const load = () => {
    axios
      .get(`${API}/${masjidId}/reviews`, loggedIn ? { headers: { Authorization: `Bearer ${getUserToken()}` } } : undefined)
      .then(({ data }) => setData(data))
      .catch(() => setData({ average: 0, count: 0, breakdown: {}, reviews: [] }));
    if (loggedIn) {
      const token = getUserToken();
      axios.get(`${API}/${masjidId}/reviews/mine`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setMyReview(data.review))
        .catch(() => {});
    }
  };

  useEffect(() => {
    axios.get(`${API}/review-settings`).then(({ data }) => setReviewSettings(data)).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [masjidId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaved = (review) => {
    setMyReview(review);
    setShowForm(false);
    load();
  };

  if (!data) return <p className="msj-review-empty">Loading…</p>;

  return (
    <div className="msj-hub-reviews">
      <div className="msj-hub-reviews-summary">
        <div className="msj-hub-reviews-average">
          <strong>{data.count > 0 ? data.average.toFixed(1) : "—"}</strong>
          <StarRating value={data.average} size={18} />
          <span>{data.count} review{data.count === 1 ? "" : "s"}</span>
        </div>
        {data.count > 0 && (
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
      </div>

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
        <ReviewForm masjidId={masjidId} existing={myReview} settings={reviewSettings} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
      )}

      <div className="msj-review-list">
        {data.reviews.length === 0 && <p className="msj-review-empty">No reviews yet — be the first to share your experience.</p>}
        {data.reviews.map((r) => <ReviewRow review={r} key={r.id} />)}
      </div>
    </div>
  );
}

export default ReviewsTab;
