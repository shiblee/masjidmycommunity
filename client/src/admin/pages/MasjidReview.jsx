import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import StaticLocationMap from "../../components/StaticLocationMap.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";

function ReasonModal({ title, placeholder, onCancel, onSubmit }) {
  const [text, setText] = useState("");
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{title}</h3>
        <div className="amx-form-group" style={{ marginTop: 16 }}>
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
        </div>
        <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} disabled={!text.trim()} onClick={() => onSubmit(text.trim())}>
          Submit
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
      <div className="amx-panel-head"><h3>{title}</h3></div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span className="amx-panel-sub" style={{ display: "block" }}>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function MasjidReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [masjid, setMasjid] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [donationAccount, setDonationAccount] = useState(null);
  const [history, setHistory] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminApi.get(`/masjids/${id}`).then(({ data }) => {
      setMasjid(data.masjid);
      setPhotos(data.photos);
      setDonationAccount(data.donationAccount);
      setHistory(data.history);
    });
  };

  useEffect(() => { load(); }, [id]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const act = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      load();
      showToast(successMsg);
      setModal(null);
    } catch (err) {
      showToast(err.response?.data?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (!masjid) return <div className="amx-empty"><Icon name="mosque" /><strong>Loading…</strong></div>;

  const cover = photos.find((p) => p.isCover) || photos[0];
  const reviewable = ["submitted", "under_review", "changes_requested"].includes(masjid.status);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/masjids")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Masjid Management
          </button>
          <h1 style={{ marginTop: 10 }}>{masjid.name}</h1>
          <p>{[masjid.city, masjid.country].filter(Boolean).join(", ")}</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center" }}>
          <StatusBadge status={masjid.status} />
        </div>
      </div>

      {masjid.adminFeedback && (
        <div className="amx-alert-banner warn" style={{ marginBottom: 20 }}>
          <Icon name="info" size={16} /> Latest feedback sent to owner: {masjid.adminFeedback}
        </div>
      )}

      <div className="amx-editor-layout">
        <div>
          {cover && (
            <div style={{ width: "100%", height: 260, borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
              <MediaThumb src={`http://localhost:5050${cover.url}`} mediaType={cover.mediaType} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          <Section title="Basic Information">
            <Row label="Tagline" value={masjid.tagline} />
            <Row label="About" value={masjid.about} />
            <Row label="Year Established" value={masjid.yearEstablished} />
            <Row label="Category" value={masjid.category} />
          </Section>

          <Section title="Location">
            <Row label="Address" value={[masjid.address, masjid.area, masjid.city, masjid.district, masjid.state, masjid.country, masjid.postalCode].filter(Boolean).join(", ")} />
            {masjid.latitude != null && (
              <Row label="Coordinates" value={`${Number(masjid.latitude).toFixed(6)}, ${Number(masjid.longitude).toFixed(6)}`} />
            )}
            <StaticLocationMap latitude={masjid.latitude} longitude={masjid.longitude} height={240} />
            {masjid.mapLink && (
              <a href={masjid.mapLink} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 12 }}>
                Open in Google Maps
              </a>
            )}
          </Section>

          <Section title="Contact &amp; Verification">
            <Row label="Imam" value={masjid.imamName} />
            <Row label="Email" value={`${masjid.contactEmail || "—"} ${masjid.emailVerified ? "(verified)" : ""}`} />
            <Row label="Mobile" value={`${masjid.contactMobile || "—"} ${masjid.mobileVerified ? "(verified)" : ""}`} />
          </Section>

          <Section title="Donation Account">
            {donationAccount ? (
              <>
                <Row label="UPI ID" value={donationAccount.upiId} />
                <Row label="Bank" value={donationAccount.bankName} />
                <Row label="Account Holder" value={donationAccount.accountHolderName} />
                <Row label="Account Number" value={donationAccount.accountNumber} />
                <Row label="IFSC / Routing" value={donationAccount.ifscCode} />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <StatusBadge status={donationAccount.verified ? "verified" : "pending"} />
                  {!donationAccount.verified && (
                    <button className="amx-btn amx-btn-sm amx-btn-outline" onClick={() => act(() => adminApi.post(`/masjids/${id}/donation-account/verify`), "Donation account marked verified.")}>
                      Mark Verified
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p>No donation account submitted yet.</p>
            )}
          </Section>

          <Section title="Photos & Videos">
            <div className="msj-photo-grid">
              {photos.map((p) => (
                <div className="msj-photo-card" key={p.id}>
                  <MediaThumb src={`http://localhost:5050${p.url}`} mediaType={p.mediaType} videoProps={{ controls: true }} />
                  {p.isCover && <span className="msj-cover-badge"><Icon name="check" size={12} /> Cover</span>}
                </div>
              ))}
              {photos.length === 0 && <p>No photographs or videos uploaded.</p>}
            </div>
          </Section>

          <Section title="Registration History">
            {history.map((h) => (
              <div key={h.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--a-border)" }}>
                <strong style={{ textTransform: "capitalize" }}>{h.action.replace(/_/g, " ")}</strong>
                <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{new Date(h.createdAt).toLocaleString()} · {h.actorType === "admin" ? h.actorName : "Owner"}</span>
                {h.note && <p style={{ marginTop: 4 }}>{h.note}</p>}
              </div>
            ))}
            {history.length === 0 && <p>No history yet.</p>}
          </Section>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head"><h3>Actions</h3></div>
          {reviewable ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => act(() => adminApi.post(`/masjids/${id}/approve`), "Masjid approved and published.")}>
                <Icon name="check" size={16} /> Approve
              </button>
              <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => setModal("changes")}>
                Request Changes
              </button>
              <button className="amx-btn amx-btn-danger" disabled={busy} onClick={() => setModal("reject")}>
                Reject
              </button>
            </div>
          ) : masjid.status === "approved" ? (
            <button className="amx-btn amx-btn-danger" disabled={busy} onClick={() => act(() => adminApi.post(`/masjids/${id}/deactivate`), "Masjid deactivated.")}>
              Deactivate
            </button>
          ) : masjid.status === "inactive" ? (
            <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => act(() => adminApi.post(`/masjids/${id}/activate`), "Masjid reactivated.")}>
              Reactivate
            </button>
          ) : (
            <p>No further action needed.</p>
          )}

          <div className="amx-dropdown-sep" style={{ margin: "18px 0" }} />
          <button className="amx-btn amx-btn-outline" disabled={busy} style={{ width: "100%" }} onClick={() => setModal("note")}>
            <Icon name="edit" size={15} /> Add Internal Note
          </button>
        </div>
      </div>

      {modal === "reject" && (
        <ReasonModal title="Reject Masjid" placeholder="Explain why this masjid is being rejected…" onCancel={() => setModal(null)} onSubmit={(reason) => act(() => adminApi.post(`/masjids/${id}/reject`, { reason }), "Masjid rejected.")} />
      )}
      {modal === "changes" && (
        <ReasonModal title="Request Changes" placeholder="Describe what the owner needs to update…" onCancel={() => setModal(null)} onSubmit={(note) => act(() => adminApi.post(`/masjids/${id}/request-changes`, { note }), "Changes requested.")} />
      )}
      {modal === "note" && (
        <ReasonModal title="Add Internal Note" placeholder="Visible to admins only…" onCancel={() => setModal(null)} onSubmit={(note) => act(() => adminApi.post(`/masjids/${id}/notes`, { note }), "Note added.")} />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default MasjidReview;
