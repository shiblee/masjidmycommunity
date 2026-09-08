import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "../components/Icons.jsx";
import { API_BASE } from "../config.js";

const API = `${API_BASE}/masjids/public`;

const STATUS_MESSAGE = {
  green_tick_issued: null, // the normal, positive case — no extra banner needed
  suspended: "This Green Tick is currently suspended and is not an active verification.",
  revoked: "This Green Tick has been revoked and is no longer a valid verification.",
};

function VerifyMasjid() {
  const { verificationId } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/green-tick/verify/${verificationId}`)
      .then(({ data }) => setData(data))
      .catch(() => setNotFound(true));
  }, [verificationId]);

  if (notFound) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg msj-empty-state">
          <Icon name="shieldCheck" size={30} />
          <h3>No masjid found with this verification ID</h3>
          <p>Double-check the verification ID, or the QR code you scanned may be invalid.</p>
          <Link to="/explore-masjids" className="btn btn-gold">Masjids</Link>
        </div>
      </main>
    );
  }

  if (!data) return <main className="msj-page"><div className="wrap py-lg"><p>Loading…</p></div></main>;

  const statusMessage = STATUS_MESSAGE[data.status];

  return (
    <main className="msj-page">
      <div className="wrap py-lg msj-verify-page">
        <div className="msj-verify-certificate">
          <div className={`msj-verify-badge${data.isGreenTick ? " active" : ""}`}>
            <Icon name="shieldCheck" size={28} />
          </div>
          <h1>{data.masjid.name}</h1>
          <p className="msj-verify-loc">{[data.masjid.category, data.masjid.city, data.masjid.country].filter(Boolean).join(" · ")}</p>

          {data.isGreenTick ? (
            <div className="msj-verify-status-ok">
              <Icon name="check" size={16} /> Green Tick Verified
            </div>
          ) : (
            <div className="msj-verify-status-not-ok">
              <Icon name="flag" size={16} /> {statusMessage || `Current status: ${data.status.replaceAll("_", " ")}`}
            </div>
          )}

          <div className="msj-verify-details">
            <div><span>Verification ID</span><strong>{data.verificationId}</strong></div>
            {data.issuedAt && <div><span>Verified On</span><strong>{new Date(data.issuedAt).toLocaleDateString()}</strong></div>}
            <div><span>Issued By</span><strong>Masjid My Community</strong></div>
          </div>
        </div>

        <div className="msj-verify-meaning">
          <h3>What This Green Tick Means</h3>
          <p>
            This Green Tick indicates that Masjid My Community has completed its defined verification process for
            the masjid and its authorized representatives, based on the information and documents submitted and
            reviewed. It does not automatically imply government endorsement, legal ownership certification beyond
            the documents actually reviewed, religious endorsement, a financial guarantee, or a guarantee of safety
            or quality.
          </p>
          {data.masjid.id && (
            <Link to={`/masjid/${data.masjid.id}`} className="btn btn-outline-ink" style={{ marginTop: 16 }}>
              View Masjid Profile <span className="btn-arrow">→</span>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default VerifyMasjid;
