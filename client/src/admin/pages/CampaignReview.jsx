import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import MediaThumb from "../../components/MediaThumb.jsx";

function ReasonModal({ title, placeholder, extraFields, onCancel, onSubmit }) {
  const [text, setText] = useState("");
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{title}</h3>
        {extraFields}
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

function DonationModal({ onCancel, onSubmit }) {
  const [form, setForm] = useState({ donorName: "", donorEmail: "", amount: "", method: "upi", notes: "" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Record a Donation</h3>
        <p className="amx-panel-sub">For a transfer confirmed outside the platform (bank/UPI). This is never editable to inflate totals — only new records can be added.</p>
        <div className="amx-form-group" style={{ marginTop: 12 }}>
          <label>Donor Name (optional)</label>
          <input value={form.donorName} onChange={set("donorName")} placeholder="Anonymous if left blank" />
        </div>
        <div className="amx-form-group">
          <label>Donor Email (optional)</label>
          <input value={form.donorEmail} onChange={set("donorEmail")} />
        </div>
        <div className="amx-form-group">
          <label>Amount (INR)</label>
          <input type="number" min="1" value={form.amount} onChange={set("amount")} />
        </div>
        <div className="amx-form-group">
          <label>Method</label>
          <select value={form.method} onChange={set("method")}>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="amx-form-group">
          <label>Notes (optional)</label>
          <textarea rows={2} value={form.notes} onChange={set("notes")} />
        </div>
        <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} disabled={!(Number(form.amount) > 0)} onClick={() => onSubmit(form)}>
          Record Donation
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

const DONATION_TYPE_LABEL = { general_sadaqah: "General Sadaqah", zakat: "Zakat", waqf: "Waqf", other: "Other" };

function CampaignReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [history, setHistory] = useState([]);
  const [donations, setDonations] = useState([]);
  const [masjid, setMasjid] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminApi.get(`/campaigns/${id}`).then(({ data }) => {
      setCampaign(data.campaign);
      setPhotos(data.photos);
      setBudgetItems(data.budgetItems);
      setDocuments(data.documents);
      setHistory(data.history);
      setDonations(data.donations);
      setMasjid(data.masjid);
    });
  };

  useEffect(() => { load(); }, [id]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const downloadDocument = async (doc) => {
    try {
      const res = await adminApi.get(`/campaigns/${id}/documents/${doc.id}/file`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast("Couldn't download that document.");
    }
  };

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

  if (!campaign) return <div className="amx-empty"><Icon name="campaign" /><strong>Loading…</strong></div>;

  const cover = photos.find((p) => p.isCover) || photos[0];
  const reviewable = ["submitted", "under_review", "changes_requested"].includes(campaign.status);
  const budgetTotal = budgetItems.reduce((s, b) => s + Number(b.amount || 0), 0);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/campaigns")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Campaigns
          </button>
          <h1 style={{ marginTop: 10 }}>{campaign.title}</h1>
          <p>{masjid?.name} · {[masjid?.city, masjid?.country].filter(Boolean).join(", ")}</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center" }}>
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      {campaign.adminFeedback && (
        <div className="amx-alert-banner warn" style={{ marginBottom: 20 }}>
          <Icon name="info" size={16} /> Latest feedback sent to owner: {campaign.adminFeedback}
        </div>
      )}

      <div className="amx-editor-layout">
        <div>
          {cover && (
            <div style={{ width: "100%", height: 260, borderRadius: 14, marginBottom: 20, overflow: "hidden" }}>
              <MediaThumb src={`http://localhost:5050${cover.url}`} mediaType={cover.mediaType} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}

          <Section title="Campaign Details">
            <Row label="Short Description" value={campaign.shortDescription} />
            <Row label="Full Description" value={campaign.description} />
            <Row label="End Date" value={campaign.endDate} />
          </Section>

          <Section title="Islamic Fundraising Classification">
            <Row label="Type" value={DONATION_TYPE_LABEL[campaign.donationType]} />
            {campaign.donationType === "zakat" && <Row label="Zakat Eligibility Note" value={campaign.zakatEligibilityNote} />}
          </Section>

          <Section title="Funding & Budget">
            <Row label="Funding Goal" value={campaign.goalAmount ? `₹${Number(campaign.goalAmount).toLocaleString("en-IN")}` : "—"} />
            <Row label="Amount Raised" value={`₹${Number(campaign.amountRaised).toLocaleString("en-IN")}`} />
            {budgetItems.map((b) => <Row key={b.id} label={b.label} value={`₹${Number(b.amount).toLocaleString("en-IN")}`} />)}
            <Row label="Budget Total" value={`₹${budgetTotal.toLocaleString("en-IN")}`} />
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

          <Section title="Supporting Documents">
            {documents.map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--a-border)" }}>
                <span>{d.fileName} <span className="amx-panel-sub">({d.documentType})</span></span>
                <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={() => downloadDocument(d)}>Download</button>
              </div>
            ))}
            {documents.length === 0 && <p>No documents uploaded.</p>}
          </Section>

          <Section title="Donations Recorded">
            {donations.map((d) => (
              <div key={d.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--a-border)" }}>
                <strong>₹{Number(d.amount).toLocaleString("en-IN")}</strong> via {d.method} — {d.donorName || "Anonymous"}
                <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{new Date(d.createdAt).toLocaleString()}</span>
              </div>
            ))}
            {donations.length === 0 && <p>No donations recorded yet.</p>}
          </Section>

          <Section title="Campaign History">
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

        <div>
          <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
            <div className="amx-panel-head"><h3>Review Checklist</h3></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><input type="checkbox" defaultChecked={photos.length > 0} readOnly /> Photos/media provided</label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><input type="checkbox" defaultChecked={budgetTotal > 0} readOnly /> Budget breakdown provided</label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><input type="checkbox" defaultChecked={campaign.donationType !== "zakat" || !!campaign.zakatEligibilityNote} readOnly /> Zakat eligibility explained (if applicable)</label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><input type="checkbox" defaultChecked={masjid?.status === "approved"} readOnly /> Masjid is verified/approved</label>
            </div>
          </div>

          <div className="amx-card amx-panel">
            <div className="amx-panel-head"><h3>Actions</h3></div>
            {reviewable ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => setModal("approve")}>
                  <Icon name="check" size={16} /> Approve &amp; Go Live
                </button>
                <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => setModal("changes")}>
                  Request Changes
                </button>
                <button className="amx-btn amx-btn-danger" disabled={busy} onClick={() => setModal("reject")}>
                  Reject
                </button>
              </div>
            ) : ["active", "goal_reached"].includes(campaign.status) ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => setModal("donation")}>
                  <Icon name="donors" size={16} /> Record Donation
                </button>
                <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => act(() => adminApi.post(`/campaigns/${id}/pause`), "Campaign paused.")}>
                  Pause Campaign
                </button>
                <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => act(() => adminApi.post(`/campaigns/${id}/complete`), "Campaign marked completed.")}>
                  Mark Completed
                </button>
              </div>
            ) : campaign.status === "paused" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => act(() => adminApi.post(`/campaigns/${id}/resume`), "Campaign resumed.")}>
                  Resume Campaign
                </button>
                <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => setModal("donation")}>
                  Record Donation
                </button>
              </div>
            ) : (
              <p>No further action needed.</p>
            )}

            <div className="amx-dropdown-sep" style={{ margin: "18px 0" }} />
            <button className="amx-btn amx-btn-outline" disabled={busy} style={{ width: "100%" }} onClick={() => setModal("note")}>
              <Icon name="edit" size={15} /> Add Internal Note
            </button>
          </div>
        </div>
      </div>

      {modal === "approve" && (
        <ReasonModal
          title="Approve Campaign"
          placeholder="Internal note about the Islamic/legal/content review (optional to leave blank, but recommended)…"
          onCancel={() => setModal(null)}
          onSubmit={(note) => act(() => adminApi.post(`/campaigns/${id}/approve`, { note, islamicReviewNotes: note, complianceReviewNotes: note }), "Campaign approved and now live.")}
        />
      )}
      {modal === "reject" && (
        <ReasonModal title="Reject Campaign" placeholder="Explain why this campaign is being rejected…" onCancel={() => setModal(null)} onSubmit={(reason) => act(() => adminApi.post(`/campaigns/${id}/reject`, { reason }), "Campaign rejected.")} />
      )}
      {modal === "changes" && (
        <ReasonModal title="Request Changes" placeholder="Describe what the owner needs to update…" onCancel={() => setModal(null)} onSubmit={(note) => act(() => adminApi.post(`/campaigns/${id}/request-changes`, { note }), "Changes requested.")} />
      )}
      {modal === "note" && (
        <ReasonModal title="Add Internal Note" placeholder="Visible to admins only…" onCancel={() => setModal(null)} onSubmit={(note) => act(() => adminApi.post(`/campaigns/${id}/notes`, { note }), "Note added.")} />
      )}
      {modal === "donation" && (
        <DonationModal onCancel={() => setModal(null)} onSubmit={(form) => act(() => adminApi.post(`/campaigns/${id}/donations`, form), "Donation recorded.")} />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default CampaignReview;
