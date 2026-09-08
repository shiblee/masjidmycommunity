import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import MediaThumb from "../../components/MediaThumb.jsx";
import { formatDate, formatDateTime } from "../../utils/formatDateTime.js";
import MicButton from "../../components/MicButton.jsx";
import { amountInWordsIndian } from "../../utils/amountInWords.js";

const TABS = [
  { key: "overview", label: "Overall" },
  { key: "basic", label: "Basic Info" },
  { key: "funding", label: "Category & Funding" },
  { key: "photos", label: "Photos & Media" },
  { key: "compliance", label: "Compliance" },
];

// Mirrors CampaignWizard.jsx's own word cap for this field exactly, so an
// admin edit and an owner edit are held to the same bar.
const DESC_MAX_WORDS = 500;
const wordCount = (text) => (text || "").trim().split(/\s+/).filter(Boolean).length;
const truncateWords = (text, max) => {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  return words.length > max ? words.slice(0, max).join(" ") : text;
};

function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

// Whole-day count from today (local) to the target end date — used as a
// live label next to the field rather than something the admin has to
// work out by reading the date themselves.
function daysRemainingLabel(endDate) {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((end - today) / 86400000);
  if (days < 0) return "Ended";
  if (days === 0) return "Ends today";
  return `${days} day${days === 1 ? "" : "s"} remaining`;
}

function ReasonModal({ title, placeholder, extraFields, onCancel, onSubmit }) {
  const [text, setText] = useState("");
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{title}</h3>
        {extraFields}
        <div className="amx-form-group" style={{ marginTop: 16 }}>
          <div className="amx-textarea-mic-wrap">
            <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
            <MicButton onTranscript={(t) => setText(t)} />
          </div>
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
          <div className="amx-textarea-mic-wrap">
            <textarea rows={2} value={form.notes} onChange={set("notes")} />
            <MicButton onTranscript={(t) => setForm((f) => ({ ...f, notes: t }))} />
          </div>
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

// Same label + mandatory-* + red-error-below pattern MasjidReview.jsx's own
// AField uses, duplicated here rather than shared (matches this codebase's
// existing per-controller/per-page constant convention).
function AField({ label, children, required, error, hint, labelExtra }) {
  return (
    <div className="amx-form-group">
      {labelExtra ? (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 7 }}>
          <label style={{ marginBottom: 0 }}>{label}{required && <span className="amx-required">*</span>}</label>
          {labelExtra}
        </div>
      ) : (
        <label>{label}{required && <span className="amx-required">*</span>}</label>
      )}
      {children}
      {error ? (
        <div className="amx-field-error"><Icon name="info" size={14} />{error}</div>
      ) : hint ? (
        <span className="amx-panel-sub" style={{ display: "block", marginTop: 6 }}>{hint}</span>
      ) : null}
    </div>
  );
}

// Sits beside every edit tab (Basic Info / Category & Funding / Photos &
// Media / Compliance) so the admin can always see what they're editing —
// cover, title, masjid, status, funding progress — without switching back
// to Overview.
function CampaignSnapshot({ campaign, masjid, cover }) {
  const pct = campaign.progressPercent ?? 0;
  return (
    <div className="amx-card amx-panel amx-review-actions">
      <div className="amx-panel-head"><h3>Snapshot</h3></div>
      <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "16/10", marginBottom: 16 }}>
        <MediaThumb src={cover ? `${API_ORIGIN}${cover.url}` : null} mediaType={cover?.mediaType} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <h4 style={{ margin: "0 0 2px" }}>{campaign.title}</h4>
      <p className="amx-panel-sub" style={{ margin: "0 0 14px" }}>{masjid?.name}{masjid?.city ? ` · ${masjid.city}` : ""}</p>
      <StatusBadge status={campaign.status} />
      <div style={{ marginTop: 18 }}>
        <div className="amx-progress"><span style={{ width: `${Math.min(pct, 100)}%` }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
          <span>{currency(campaign.amountRaised)} raised</span>
          <span className="amx-panel-sub">{pct}%</span>
        </div>
      </div>
      <div className="amx-dropdown-sep" style={{ margin: "16px 0" }} />
      <Row label="Funding Goal" value={campaign.goalAmount ? currency(campaign.goalAmount) : "Not set"} />
      <Row label="Masjid Status" value={masjid?.status === "approved" && masjid?.isGreenTick ? "Approved · Green Tick" : masjid?.status} />
    </div>
  );
}

function BasicInfoTab({ id, campaign, onSaved }) {
  const [form, setForm] = useState({
    title: campaign.title || "", shortDescription: campaign.shortDescription || "",
    description: campaign.description || "", endDate: campaign.endDate || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const minEndDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: null }));
  };

  const save = async () => {
    if (form.endDate && form.endDate < minEndDate) {
      setErrors({ endDate: "Target end date must be in the future." });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const { data } = await adminApi.patch(`/campaigns/${id}`, form);
      onSaved(data.campaign);
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Couldn't save changes." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Basic Info</h3></div>
      {errors.form && <div className="amx-form-error" style={{ marginBottom: 16 }}><Icon name="info" size={16} />{errors.form}</div>}

      <AField label="Campaign Title" required error={errors.title}>
        <input value={form.title} onChange={setField("title")} maxLength={255} />
      </AField>
      <AField label="Short Description" required error={errors.shortDescription}>
        <input value={form.shortDescription} onChange={setField("shortDescription")} placeholder="A brief summary of what this campaign funds" />
      </AField>
      <AField
        label="Full Description"
        required
        error={errors.description}
        labelExtra={<span className="pf-char-counter">{wordCount(form.description)}/{DESC_MAX_WORDS} words</span>}
      >
        <div className="msj-about-wrap">
          <textarea
            rows={7}
            value={form.description}
            onChange={(e) => {
              setForm((f) => ({ ...f, description: truncateWords(e.target.value, DESC_MAX_WORDS) }));
              setErrors((er) => ({ ...er, description: null }));
            }}
            placeholder="Describe the project in detail"
          />
          <MicButton
            onTranscript={(text) => setForm((f) => ({ ...f, description: truncateWords(text, DESC_MAX_WORDS) }))}
            className="msj-about-mic"
          />
        </div>
      </AField>
      <AField
        label="Target End Date"
        error={errors.endDate}
        labelExtra={form.endDate ? <span className="pf-char-counter">{daysRemainingLabel(form.endDate)}</span> : undefined}
      >
        <input type="date" min={minEndDate} value={form.endDate || ""} onChange={setField("endDate")} />
      </AField>

      <button className="amx-btn amx-btn-accent" onClick={save} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function FundingTab({ id, campaign, categories, classifications, onSaved }) {
  const [form, setForm] = useState({
    categoryId: campaign.categoryId || "", donationType: campaign.donationType || "General Sadaqah",
    zakatEligibilityNote: campaign.zakatEligibilityNote || "", goalAmount: campaign.goalAmount || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: null }));
  };

  const save = async () => {
    if (!form.goalAmount || Number(form.goalAmount) <= 0) {
      setErrors({ goalAmount: "Funding goal must be greater than zero." });
      return;
    }
    if (form.donationType === "Zakat" && !form.zakatEligibilityNote.trim()) {
      setErrors({ zakatEligibilityNote: "Explain how this campaign qualifies for Zakat." });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const { data } = await adminApi.patch(`/campaigns/${id}`, form);
      onSaved(data.campaign);
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Couldn't save changes." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Category &amp; Funding</h3></div>
      {errors.form && <div className="amx-form-error" style={{ marginBottom: 16 }}><Icon name="info" size={16} />{errors.form}</div>}

      <AField label="Category">
        <select value={form.categoryId} onChange={setField("categoryId")}>
          <option value="">Select a category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </AField>
      <AField label="Islamic Fundraising Classification">
        <select value={form.donationType} onChange={setField("donationType")}>
          {classifications.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </AField>
      {form.donationType === "Zakat" && (
        <AField label="Zakat Eligibility Explanation" required error={errors.zakatEligibilityNote}>
          <textarea rows={4} value={form.zakatEligibilityNote} onChange={setField("zakatEligibilityNote")} />
        </AField>
      )}
      <AField
        label="Funding Goal (INR)"
        required
        error={errors.goalAmount}
        hint={!errors.goalAmount ? amountInWordsIndian(form.goalAmount) : undefined}
      >
        <input type="number" min="1" value={form.goalAmount} onChange={setField("goalAmount")} />
      </AField>

      <button className="amx-btn amx-btn-accent" onClick={save} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function PhotosTab({ id, photos, setPhotos, showToast }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    setUploading(true);
    setError("");
    try {
      const { data } = await adminApi.post(`/campaigns/${id}/photos`, fd);
      setPhotos((p) => [...p, ...data.photos]);
      showToast(`${data.photos.length} photo(s)/video(s) uploaded.`);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload photo(s).");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const setCover = async (photoId) => {
    await adminApi.patch(`/campaigns/${id}/photos/${photoId}`, { isCover: true });
    setPhotos((p) => p.map((ph) => ({ ...ph, isCover: ph.id === photoId })));
    showToast("Cover photo updated.");
  };
  const removePhoto = async (photoId) => {
    await adminApi.delete(`/campaigns/${id}/photos/${photoId}`);
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
    showToast("Photo removed.");
  };
  const movePhoto = async (index, dir) => {
    const next = [...photos];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setPhotos(next);
    await Promise.all(next.map((ph, i) => adminApi.patch(`/campaigns/${id}/photos/${ph.id}`, { sortOrder: i })));
  };

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Photos &amp; Media</h3></div>
      <label className="amx-btn amx-btn-outline" style={{ cursor: "pointer", marginBottom: 16, display: "inline-flex" }}>
        <Icon name="upload" size={15} /> {uploading ? "Uploading…" : "Upload Photos or Videos"}
        <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden onChange={handleFiles} disabled={uploading} />
      </label>
      {error && <div className="amx-form-error" style={{ marginBottom: 16 }}><Icon name="info" size={16} />{error}</div>}
      <div className="msj-photo-grid msj-photo-grid-lg">
        {photos.map((p, i) => (
          <div className="msj-photo-card" key={p.id}>
            <MediaThumb src={`${API_ORIGIN}${p.url}`} mediaType={p.mediaType} videoProps={{ controls: true }} />
            {p.isCover && <span className="msj-cover-badge"><Icon name="check" size={12} /> Cover</span>}
            <div className="msj-photo-actions">
              {!p.isCover && p.mediaType !== "video" && <button type="button" onClick={() => setCover(p.id)} title="Set as cover"><Icon name="star" size={14} /></button>}
              <button type="button" onClick={() => movePhoto(i, -1)} title="Move earlier"><Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /></button>
              <button type="button" onClick={() => movePhoto(i, 1)} title="Move later"><Icon name="arrowRight" size={14} /></button>
              <button type="button" onClick={() => removePhoto(p.id)} title="Remove"><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
        {photos.length === 0 && <div className="msj-photo-empty"><Icon name="imageIcon" size={24} /><span>No photos or videos yet</span></div>}
      </div>
    </div>
  );
}

function ComplianceTab({ id, documents, setDocuments, showToast }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("documents", f));
    setUploading(true);
    setError("");
    try {
      const { data } = await adminApi.post(`/campaigns/${id}/documents`, fd);
      setDocuments((d) => [...d, ...data.documents]);
      showToast(`${data.documents.length} document(s) uploaded.`);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload document(s).");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

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

  // Opens the file (PDF/image render natively; other types fall back to a
  // download, same as any browser). The tab is opened synchronously before
  // the fetch resolves so popup blockers don't treat it as unsolicited.
  const viewDocument = async (doc) => {
    const win = window.open("", "_blank");
    try {
      const res = await adminApi.get(`/campaigns/${id}/documents/${doc.id}/file`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      if (win) win.location.href = url;
      else window.open(url, "_blank");
    } catch {
      win?.close();
      showToast("Couldn't open that document.");
    }
  };

  const removeDocument = async (docId) => {
    await adminApi.delete(`/campaigns/${id}/documents/${docId}`);
    setDocuments((d) => d.filter((doc) => doc.id !== docId));
    showToast("Document removed.");
  };

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Compliance</h3></div>
      <div className="msj-compliance-list" style={{ marginBottom: 20 }}>
        <p>What every approved campaign confirms:</p>
        <ul>
          <li>All information provided is accurate and not misleading.</li>
          <li>No fabricated Hadith, Qur'an citations, or religious claims have been used.</li>
          <li>Funds will be used strictly for the purpose described in this campaign.</li>
          <li>This masjid holds the necessary local authorization to raise funds for this project.</li>
        </ul>
      </div>
      <label className="amx-btn amx-btn-outline" style={{ cursor: "pointer", marginBottom: 16, display: "inline-flex" }}>
        <Icon name="upload" size={15} /> {uploading ? "Uploading…" : "Upload Supporting Documents"}
        <input type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png" multiple hidden onChange={handleFiles} disabled={uploading} />
      </label>
      {error && <div className="amx-form-error" style={{ marginBottom: 16 }}><Icon name="info" size={16} />{error}</div>}
      {documents.map((d) => (
        <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--a-border)" }}>
          <span><Icon name="book" size={14} style={{ marginRight: 6 }} />{d.fileName} <span className="amx-panel-sub">({d.documentType})</span></span>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={() => viewDocument(d)}><Icon name="eye" size={13} /> View</button>
            <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={() => downloadDocument(d)}>Download</button>
            <button type="button" className="amx-btn amx-btn-sm amx-btn-outline" onClick={() => removeDocument(d.id)}><Icon name="trash" size={13} /></button>
          </div>
        </div>
      ))}
      {documents.length === 0 && <p className="amx-panel-sub">No documents uploaded.</p>}
    </div>
  );
}

// Each item links straight to the tab that would fix it, so a stalled
// review doesn't require the admin to hunt for what's missing.
function ChecklistItem({ done, label, onClick }) {
  return (
    <button type="button" className={`amx-checklist-item${done ? " done" : ""}`} onClick={onClick} disabled={!onClick}>
      <span className="amx-checklist-icon"><Icon name={done ? "check" : "info"} size={13} /></span>
      <span>{label}</span>
      {!done && onClick && <Icon name="arrowRight" size={14} className="amx-checklist-arrow" />}
    </button>
  );
}

function CampaignReview() {
  const { id, tab: tabParam } = useParams();
  const navigate = useNavigate();
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : "overview";
  const goToTab = (key) => navigate(key === "overview" ? `/admin/campaigns/${id}` : `/admin/campaigns/${id}/${key}`, { replace: true });

  const [campaign, setCampaign] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [history, setHistory] = useState([]);
  const [donations, setDonations] = useState([]);
  const [masjid, setMasjid] = useState(null);
  const [categories, setCategories] = useState([]);
  const [classifications, setClassifications] = useState([]);
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
  useEffect(() => {
    adminApi.get("/campaign-categories").then(({ data }) => setCategories(data.categories)).catch(() => {});
    adminApi.get("/campaign-classifications").then(({ data }) => setClassifications(data.classifications)).catch(() => {});
  }, []);

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

  if (!campaign) return <div className="amx-empty"><Icon name="campaign" /><strong>Loading…</strong></div>;

  const cover = photos.find((p) => p.isCover) || photos[0];
  const reviewable = ["submitted", "under_review", "changes_requested"].includes(campaign.status);
  const budgetTotal = budgetItems.reduce((s, b) => s + Number(b.amount || 0), 0);

  const checklist = [
    { done: !!campaign.shortDescription?.trim() && !!campaign.description?.trim(), label: "Basic info (title & description) complete", tab: "basic" },
    { done: !!campaign.goalAmount && Number(campaign.goalAmount) > 0, label: "Funding goal set", tab: "funding" },
    { done: campaign.donationType !== "Zakat" || !!campaign.zakatEligibilityNote, label: "Zakat eligibility explained (if applicable)", tab: "funding" },
    { done: photos.length > 0, label: "At least one photo or video provided", tab: "photos" },
    { done: masjid?.status === "approved" && masjid?.isGreenTick, label: "Masjid is Green Tick verified", tab: null },
  ];
  const checklistDoneCount = checklist.filter((c) => c.done).length;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/campaigns")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Campaigns
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
              <MediaThumb src={cover ? `${API_ORIGIN}${cover.url}` : null} mediaType={cover?.mediaType} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                {campaign.title}
                <button className="amx-icon-action" title="Edit Basic Info" onClick={() => goToTab("basic")}><Icon name="edit" size={15} /></button>
              </h1>
              <p style={{ margin: "2px 0 0" }}>{masjid?.name} · {[masjid?.city, masjid?.country].filter(Boolean).join(", ") || "No location"}</p>
            </div>
          </div>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center", gap: 10 }}>
          <span className="amx-badge amx-badge-neutral" title="Funding progress">
            <span className="amx-badge-dot" /> {currency(campaign.amountRaised)}{campaign.goalAmount ? ` of ${currency(campaign.goalAmount)}` : ""}
          </span>
          <StatusBadge status={campaign.status} />
        </div>
      </div>

      {campaign.adminFeedback && (
        <div className="amx-alert-banner warn" style={{ marginBottom: 20 }}>
          <Icon name="info" size={16} /> Latest feedback sent to owner: {campaign.adminFeedback}
        </div>
      )}

      <div className="amx-tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => goToTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="amx-editor-layout">
          <div>
            <Section title="Campaign Details">
              <Row label="Short Description" value={campaign.shortDescription} />
              <Row label="Full Description" value={campaign.description} />
              <Row label="End Date" value={campaign.endDate} />
            </Section>

            <Section title="Islamic Fundraising Classification">
              <Row label="Type" value={campaign.donationType} />
              {campaign.donationType === "Zakat" && <Row label="Zakat Eligibility Note" value={campaign.zakatEligibilityNote} />}
            </Section>

            <Section title="Funding">
              {campaign.goalAmount ? (
                <div style={{ marginBottom: 18 }}>
                  <div className="amx-progress"><span style={{ width: `${Math.min(campaign.progressPercent ?? 0, 100)}%` }} /></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13.5 }}>
                    <span><strong>{currency(campaign.amountRaised)}</strong> raised of {currency(campaign.goalAmount)}</span>
                    <span className="amx-panel-sub">{campaign.progressPercent ?? 0}%</span>
                  </div>
                </div>
              ) : (
                <Row label="Amount Raised" value={currency(campaign.amountRaised)} />
              )}
              {budgetItems.length > 0 && (
                <>
                  {budgetItems.map((b) => <Row key={b.id} label={b.label} value={currency(b.amount)} />)}
                  <Row label="Budget Total" value={currency(budgetTotal)} />
                </>
              )}
            </Section>

            <Section title="Photos & Videos">
              <div className="msj-photo-grid">
                {photos.map((p) => (
                  <div className="msj-photo-card" key={p.id}>
                    <MediaThumb src={`${API_ORIGIN}${p.url}`} mediaType={p.mediaType} videoProps={{ controls: true }} />
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
                </div>
              ))}
              {documents.length === 0 && <p>No documents uploaded.</p>}
            </Section>

            <Section title="Donations Recorded">
              {donations.map((d) => (
                <div key={d.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--a-border)" }}>
                  <strong>{currency(d.amount)}</strong> via {d.method} — {d.donorName || "Anonymous"}
                  <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{formatDateTime(d.createdAt)}</span>
                </div>
              ))}
              {donations.length === 0 && <p>No donations recorded yet.</p>}
            </Section>

            <Section title="Campaign History">
              {history.map((h) => (
                <div key={h.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--a-border)" }}>
                  <strong style={{ textTransform: "capitalize" }}>{h.action.replace(/_/g, " ")}</strong>
                  <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{formatDateTime(h.createdAt)} · {h.actorType === "admin" ? h.actorName : "Owner"}</span>
                  {h.note && <p style={{ marginTop: 4 }}>{h.note}</p>}
                </div>
              ))}
              {history.length === 0 && <p>No history yet.</p>}
            </Section>
          </div>

          <div>
            <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
              <div className="amx-panel-head">
                <h3>Review Checklist</h3>
                <span className="amx-panel-sub">{checklistDoneCount}/{checklist.length} complete</span>
              </div>
              <div className="amx-checklist">
                {checklist.map((c, i) => (
                  <ChecklistItem key={i} done={c.done} label={c.label} onClick={c.tab ? () => goToTab(c.tab) : undefined} />
                ))}
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
      )}

      {tab !== "overview" && (
        <div className="amx-editor-layout">
          {tab === "basic" && <BasicInfoTab id={id} campaign={campaign} onSaved={setCampaign} />}
          {tab === "funding" && <FundingTab id={id} campaign={campaign} categories={categories} classifications={classifications} onSaved={setCampaign} />}
          {tab === "photos" && <PhotosTab id={id} photos={photos} setPhotos={setPhotos} showToast={showToast} />}
          {tab === "compliance" && <ComplianceTab id={id} documents={documents} setDocuments={setDocuments} showToast={showToast} />}
          <CampaignSnapshot campaign={campaign} masjid={masjid} cover={cover} />
        </div>
      )}

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
