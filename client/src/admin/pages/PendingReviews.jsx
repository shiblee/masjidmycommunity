import React, { useEffect, useState } from "react";
import Icon from "../components/Icons.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";
import { API_ORIGIN } from "../../config.js";

function StarRow({ rating }) {
  return (
    <span style={{ color: "#D9A441", letterSpacing: 1 }}>
      {"★".repeat(rating)}
      <span style={{ color: "#d8d8d8" }}>{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function PendingReviews() {
  const [reviews, setReviews] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const load = () => {
    adminApi.get("/reviews/pending").then(({ data }) => setReviews(data.reviews)).catch(() => setReviews([]));
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    setBusyId(id);
    setError("");
    try {
      await adminApi.post(`/reviews/${id}/action`, { action });
      setReviews((rs) => rs.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update that review.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Trust &amp; Safety</span>
          <h1>Pending Reviews</h1>
          <p>Reviews the AI moderation layer flagged as borderline — approve to publish, or reject to keep hidden.</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        {error && <div className="amx-alert-banner warn" style={{ marginBottom: 16 }}>{error}</div>}

        {reviews && reviews.length === 0 && (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>Nothing pending</strong>
            <span>Flagged reviews will show up here for approval or rejection.</span>
          </div>
        )}

        {reviews && reviews.length > 0 && (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Masjid</th>
                  <th>Reviewer</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Flagged</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.masjid?.name || "—"}</strong></td>
                    <td>{r.reviewer?.fullName || "Unknown"}</td>
                    <td><StarRow rating={r.rating} /></td>
                    <td style={{ maxWidth: 320 }}>
                      <div style={{ marginBottom: r.media?.length ? 8 : 0 }}>{r.body}</div>
                      {r.media?.length > 0 && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {r.media.map((m) =>
                            m.mediaType === "video" ? (
                              <video key={m.id} src={`${API_ORIGIN}${m.url}`} muted controls style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover" }} />
                            ) : (
                              <img key={m.id} src={`${API_ORIGIN}${m.url}`} alt="" style={{ width: 56, height: 56, borderRadius: 6, objectFit: "cover" }} />
                            )
                          )}
                        </div>
                      )}
                    </td>
                    <td>{r.flagReason || "—"}</td>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="amx-btn amx-btn-sm amx-btn-outline"
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "reject")}
                        style={{ marginRight: 8 }}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="amx-btn amx-btn-sm amx-btn-primary"
                        disabled={busyId === r.id}
                        onClick={() => act(r.id, "approve")}
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default PendingReviews;
