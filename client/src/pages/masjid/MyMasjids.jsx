import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import { formatDate } from "../../utils/formatDateTime.js";
import masjidApi from "../../services/masjidApi.js";
import MediaThumb from "../../components/MediaThumb.jsx";
import MasjidDeleteFlow from "../../components/masjid/MasjidDeleteFlow.jsx";

const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", approved: "Approved", rejected: "Rejected", inactive: "Inactive", deleted: "Deleted",
};
const EDITABLE = new Set(["draft", "changes_requested"]);

function MyMasjids() {
  const navigate = useNavigate();
  const [masjids, setMasjids] = useState(null);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = () => {
    masjidApi
      .get("/mine")
      .then(({ data }) => setMasjids(data.masjids))
      .catch(() => setError("Couldn't load your masjids."));
  };

  useEffect(() => { load(); }, []);

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">Your Masjids</span>
            <h1>My Masjids</h1>
            <p>Register and manage the masjids you represent on Masjid My Community.</p>
          </div>
          <Link to="/account/my-masjids/new" className="btn btn-gold" style={{ marginLeft: "auto" }}>
            <Icon name="plus" size={16} /> Register Your Masjid
          </Link>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {masjids && masjids.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="mosque" size={30} />
              <h3>You haven't registered a masjid yet</h3>
              <p>Register your masjid to start receiving verified visibility and, once approved, launch fundraising campaigns.</p>
              <Link to="/account/my-masjids/new" className="btn btn-gold">Register Your Masjid <span className="btn-arrow">→</span></Link>
            </div>
          )}

          <div className="msj-list-grid">
            {masjids?.map((m) => (
              <div className="msj-list-card" key={m.id}>
                <div className="msj-list-thumb">
                  <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
                </div>
                <div className="msj-list-body">
                  <div className="msj-list-top">
                    <h3>{m.name}</h3>
                    <span className={`acct-status-pill ${m.status}`}>{STATUS_LABEL[m.status]}</span>
                  </div>
                  <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {[m.city, m.country].filter(Boolean).join(", ") || "Location not set"}</p>
                  <p className="msj-list-meta">Registered {formatDate(m.createdAt)}</p>
                  <button
                    type="button"
                    className="msj-list-campaigns"
                    onClick={() => navigate(`/account/my-campaigns?masjidId=${m.id}`)}
                  >
                    Campaigns: <strong>{m.campaignCount}</strong>
                  </button>
                  <div className="msj-list-actions">
                    <Link to={`/account/my-masjids/${m.id}`}>{EDITABLE.has(m.status) ? "Edit" : "View Details"}</Link>
                    {m.adminFeedback && <Link to={`/account/my-masjids/${m.id}`}>View Admin Feedback</Link>}
                    {m.status === "approved" && <Link to={`/masjid/${m.id}`}>View Public Profile</Link>}
                    {m.status === "approved" && <Link to={`/account/my-campaigns/new?masjidId=${m.id}`}>Create a Campaign</Link>}
                    {m.status === "approved" && <Link to={`/account/my-campaigns?masjidId=${m.id}`}>Manage Campaigns</Link>}
                    <button type="button" className="danger" onClick={() => setDeleteTarget(m)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {deleteTarget && (
        <MasjidDeleteFlow masjid={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={load} />
      )}
    </main>
  );
}

export default MyMasjids;
