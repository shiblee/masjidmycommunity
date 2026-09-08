import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { Icon } from "../../components/Icons.jsx";
import { WizardShell, WizardStepper } from "../../components/wizard/WizardShell.jsx";
import campaignApi from "../../services/campaignApi.js";
import masjidApi from "../../services/masjidApi.js";
import MediaThumb from "../../components/MediaThumb.jsx";
import MicButton from "../../components/MicButton.jsx";

const STEPS = [
  { key: "basic", label: "Masjid & Basic Info", icon: "mosque" },
  { key: "funding", label: "Category & Funding", icon: "wallet" },
  { key: "photos", label: "Photos & Media", icon: "camera" },
  { key: "compliance", label: "Compliance", icon: "shieldCheck" },
  { key: "review", label: "Review & Submit", icon: "sparkle" },
];

const DESC_MAX_WORDS = 500;
const wordCount = (text) => (text || "").trim().split(/\s+/).filter(Boolean).length;
const truncateWords = (text, max) => {
  const words = (text || "").trim().split(/\s+/).filter(Boolean);
  return words.length > max ? words.slice(0, max).join(" ") : text;
};

// Whole-day count from today (local) to the target end date — live label
// next to the field rather than something the creator has to work out.
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

const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review", changes_requested: "Changes Requested",
  approved: "Approved", active: "Active", paused: "Paused", goal_reached: "Goal Reached",
  completed: "Completed", rejected: "Rejected", cancelled: "Cancelled",
};

function emptyForm() {
  return { title: "", shortDescription: "", description: "", categoryId: "", donationType: "General Sadaqah", zakatEligibilityNote: "", goalAmount: "", endDate: "" };
}

function Field({ label, children, hint, error, required, labelExtra }) {
  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      {labelExtra ? (
        <div className="pf-field-label-row">
          <label>{label}{required && <span className="msj-required">*</span>}</label>
          {labelExtra}
        </div>
      ) : (
        <label>{label}{required && <span className="msj-required">*</span>}</label>
      )}
      {children}
      {error ? <span className="auth-field-error">{error}</span> : hint ? <span className="msj-field-hint">{hint}</span> : null}
    </div>
  );
}

function CampaignWizard({ embedded = false }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const backTo = embedded ? "/my-community" : "/account/my-campaigns";
  const backLabel = embedded ? "Back to Community Wall" : "Back to My Campaigns";

  const [campaignId, setCampaignId] = useState(id || null);
  const [status, setStatus] = useState("draft");
  const [adminFeedback, setAdminFeedback] = useState(null);
  const [approvedMasjids, setApprovedMasjids] = useState(null);
  // Only used to tell "no masjid at all" apart from "approved but not yet
  // Green Tick verified" so the empty-state message/link can point the
  // owner at the right next step instead of a generic one.
  const [unverifiedApprovedMasjid, setUnverifiedApprovedMasjid] = useState(null);
  const [masjidId, setMasjidId] = useState(params.get("masjidId") || "");
  const [masjidInfo, setMasjidInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [photos, setPhotos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!id);
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Advancing steps doesn't change the URL (this wizard can be embedded
  // inline on the Community Wall), so the router's own scroll-to-top never
  // fires here — do it manually whenever the visible step changes.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step, submitted]);

  useEffect(() => {
    axios.get(`${API_BASE}/campaigns/public/categories`).then(({ data }) => setCategories([...data.categories].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
    axios.get(`${API_BASE}/campaigns/public/classifications`).then(({ data }) => setClassifications([...data.classifications].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) return;
    masjidApi.get("/mine").then(({ data }) => {
      // Raising funds requires Green Tick verification, not just an
      // approved (publicly listed) masjid — a real financial-trust bar
      // above the site-listing bar.
      const approved = data.masjids.filter((m) => m.status === "approved" && m.isGreenTick).sort((a, b) => a.name.localeCompare(b.name));
      setApprovedMasjids(approved);
      if (approved.length === 0) {
        setUnverifiedApprovedMasjid(data.masjids.find((m) => m.status === "approved" && !m.isGreenTick) || null);
      }
      // If the wizard wasn't opened from a specific masjid's page and the
      // owner only has one eligible masjid, there's nothing to choose — skip
      // the selection step for them instead of making them click through it.
      if (!params.get("masjidId") && approved.length === 1) setMasjidId(approved[0].id);
    }).catch(() => setApprovedMasjids([]));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    campaignApi
      .get(`/${id}`)
      .then(({ data }) => {
        const c = data.campaign;
        setCampaignId(c.id);
        setStatus(c.status);
        setAdminFeedback(c.adminFeedback);
        setMasjidId(c.masjidId);
        setMasjidInfo(c.masjid);
        setForm({
          title: c.title || "", shortDescription: c.shortDescription || "", description: c.description || "",
          categoryId: c.categoryId || "", donationType: c.donationType || "General Sadaqah", zakatEligibilityNote: c.zakatEligibilityNote || "",
          goalAmount: c.goalAmount || "", endDate: c.endDate || "",
        });
        setPhotos(c.photos || []);
        setDocuments(c.documents || []);
        setLoaded(true);
      })
      .catch(() => setErrors({ form: "Couldn't load this campaign." }))
      .finally(() => setLoading(false));
  }, [id]);

  const readOnly = !!campaignId && !["draft", "changes_requested"].includes(status);
  const cameFromMasjidPage = !!params.get("masjidId");
  const lockedMasjidName = masjidInfo?.name || approvedMasjids?.find((m) => String(m.id) === String(masjidId))?.name;
  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: null }));
  };

  const minEndDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const validateStep = () => {
    if (step === 1 && !masjidId) {
      setErrors({ masjidId: "Select the masjid this campaign is raised for." });
      return false;
    }
    if (step === 1 && !form.title?.trim()) {
      setErrors({ title: "Campaign title is required." });
      return false;
    }
    if (step === 1 && wordCount(form.description) > DESC_MAX_WORDS) {
      setErrors({ description: `Keep the description under ${DESC_MAX_WORDS} words.` });
      return false;
    }
    if (step === 1 && form.endDate && form.endDate < minEndDate) {
      setErrors({ endDate: "Target end date must be in the future." });
      return false;
    }
    if (step === 2 && form.donationType === "Zakat" && !form.zakatEligibilityNote?.trim()) {
      setErrors({ zakatEligibilityNote: "Explain how this campaign qualifies for Zakat before continuing." });
      return false;
    }
    if (step === 2 && (!form.goalAmount || Number(form.goalAmount) <= 0)) {
      setErrors({ goalAmount: "Set a funding goal greater than zero." });
      return false;
    }
    return true;
  };

  const saveCurrentStep = async () => {
    if (id && !loaded) {
      setErrors({ form: "Still loading this campaign — please try again in a moment." });
      return false;
    }
    setSaving(true);
    setErrors({});
    try {
      let cid = campaignId;
      if (!cid) {
        if (!masjidId || !form.title.trim()) {
          setErrors({ title: "Enter a campaign title." });
          return false;
        }
        const { data } = await campaignApi.post("/", { masjidId, title: form.title });
        cid = data.campaign.id;
        setCampaignId(cid);
        setStatus(data.campaign.status);
        setMasjidInfo(data.campaign.masjid);
      }
      await campaignApi.patch(`/${cid}`, form);
      return true;
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Couldn't save. Please try again." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (!validateStep()) return;
    const ok = await saveCurrentStep();
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const saveAsDraft = async () => {
    if (!campaignId) {
      if (!masjidId || !form.title.trim()) { navigate("/account/my-campaigns"); return; }
    }
    const ok = await saveCurrentStep();
    if (ok) navigate("/account/my-campaigns");
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    setSaving(true);
    setErrors((er) => ({ ...er, photos: null }));
    try {
      const { data } = await campaignApi.post(`/${campaignId}/photos`, fd);
      setPhotos((p) => [...p, ...data.photos]);
    } catch (err) {
      setErrors((er) => ({ ...er, photos: err.response?.data?.message || "Couldn't upload photo(s)." }));
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const setCover = async (photoId) => {
    await campaignApi.patch(`/${campaignId}/photos/${photoId}`, { isCover: true });
    setPhotos((p) => p.map((ph) => ({ ...ph, isCover: ph.id === photoId })));
  };
  const removePhoto = async (photoId) => {
    await campaignApi.delete(`/${campaignId}/photos/${photoId}`);
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
  };

  const handleDocuments = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("documents", f));
    fd.append("documentType", "other");
    setSaving(true);
    setErrors((er) => ({ ...er, documents: null }));
    try {
      const { data } = await campaignApi.post(`/${campaignId}/documents`, fd);
      setDocuments((d) => [...d, ...data.documents]);
    } catch (err) {
      setErrors((er) => ({ ...er, documents: err.response?.data?.message || "Couldn't upload document(s)." }));
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };
  const removeDocument = async (docId) => {
    await campaignApi.delete(`/${campaignId}/documents/${docId}`);
    setDocuments((d) => d.filter((doc) => doc.id !== docId));
  };

  const doSubmit = async () => {
    setSaving(true);
    setErrors((er) => ({ ...er, submit: null }));
    try {
      await campaignApi.post(`/${campaignId}/submit`);
      setSubmitted(true);
    } catch (err) {
      setErrors((er) => ({ ...er, submit: err.response?.data?.message || "Couldn't submit for review." }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <WizardShell embedded={embedded}><p>Loading…</p></WizardShell>;

  if (submitted) {
    return (
      <WizardShell embedded={embedded}>
        <div className="msj-confirm">
          <div className="msj-confirm-icon"><Icon name="check" size={32} /></div>
          <h1>Your campaign has been submitted for review.</h1>
          <p>An admin will check the Islamic, legal, and content guidelines before this campaign goes live. You can track its status any time from My Campaigns.</p>
          <Link to="/account/my-campaigns" className="btn btn-gold">Go to My Campaigns <span className="btn-arrow">→</span></Link>
        </div>
      </WizardShell>
    );
  }

  if (!approvedMasjids && !id) return <WizardShell embedded={embedded}><p>Loading…</p></WizardShell>;

  if (approvedMasjids && approvedMasjids.length === 0 && !id) {
    return (
      <WizardShell embedded={embedded}>
        <div className="msj-empty-state">
          <Icon name="mosque" size={30} />
          <h3>Green Tick verification required</h3>
          {unverifiedApprovedMasjid ? (
            <>
              <p>Only a Green Tick verified masjid can raise a campaign. "{unverifiedApprovedMasjid.name}" is approved but not yet Green Tick verified — apply for verification, then come back to start a campaign.</p>
              <Link to={`/account/my-masjids/${unverifiedApprovedMasjid.id}/green-tick`} className="btn btn-gold">Apply for Green Tick <span className="btn-arrow">→</span></Link>
            </>
          ) : (
            <>
              <p>Only a Green Tick verified masjid can raise a campaign. Register your masjid and complete Green Tick verification, then come back to start a campaign.</p>
              <Link to="/account/my-masjids" className="btn btn-gold">Go to My Masjids <span className="btn-arrow">→</span></Link>
            </>
          )}
        </div>
      </WizardShell>
    );
  }

  if (readOnly) {
    return (
      <WizardShell embedded={embedded}>
        <Link to={backTo} className="msj-back-link"><Icon name="chevronLeft" size={16} /> {backLabel}</Link>
        <div className="section-head msj-wizard-title-head" style={{ marginTop: 16 }}>
          <span className="eyebrow">{masjidInfo?.name}</span>
          <h2 className="msj-wizard-title">{form.title}</h2>
          <span className={`acct-status-pill ${status}`}>{STATUS_LABEL[status]}</span>
        </div>
        {adminFeedback && (
          <div className="msj-feedback-banner">
            <strong>{status === "rejected" ? "Reason for rejection" : "Admin feedback"}</strong>
            <p>{adminFeedback}</p>
          </div>
        )}
        <CampaignSummary form={form} masjidInfo={masjidInfo} photos={photos} documents={documents} category={categories.find((c) => c.id === Number(form.categoryId))} />
      </WizardShell>
    );
  }

  return (
    <WizardShell embedded={embedded}>
      <Link to={backTo} className="msj-back-link"><Icon name="chevronLeft" size={16} /> {backLabel}</Link>

      <div className="msj-wizard-center">
        {adminFeedback && status === "changes_requested" && (
          <div className="msj-feedback-banner" style={{ marginTop: 20 }}>
            <strong>Changes requested by the admin</strong>
            <p>{adminFeedback}</p>
          </div>
        )}

        <WizardStepper steps={STEPS} current={step} />
        <p className="msj-stepper-current">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>

        {errors.form && <div className="auth-alert" style={{ marginBottom: 20 }}><Icon name="info" size={17} />{errors.form}</div>}

        <div className={`card msj-step-card${step === 3 || step === 5 ? " msj-step-card-wide" : ""}`}>
          {step === 1 && (
            <>
              {cameFromMasjidPage ? (
                <div className="msj-masjid-locked">
                  <Icon name="mosque" size={18} />
                  <div>
                    <span className="msj-note">This campaign will be created for</span>
                    <div className="msj-masjid-locked-name">{lockedMasjidName || "your masjid"}</div>
                  </div>
                </div>
              ) : (
                <>
                  <Field label="Masjid" required error={errors.masjidId}>
                    <select
                      value={masjidId}
                      onChange={(e) => { setMasjidId(e.target.value); setErrors((er) => ({ ...er, masjidId: null })); }}
                      disabled={!!campaignId}
                    >
                      <option value="">Select a masjid</option>
                      {approvedMasjids?.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}{[m.city, m.country].filter(Boolean).length ? ` — ${[m.city, m.country].filter(Boolean).join(", ")}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
              <div style={{ marginTop: 24 }}>
                <Field label="Campaign Title" required error={errors.title}>
                  <input value={form.title} onChange={setField("title")} placeholder="e.g. Rebuild Our Flood-Damaged Prayer Hall" disabled={!!campaignId} />
                </Field>
              </div>

              <h3 style={{ marginTop: 28 }}>Basic Information</h3>
              <Field label="Short Description" required>
                <input value={form.shortDescription} onChange={setField("shortDescription")} placeholder="A brief summary of what this campaign funds" />
              </Field>
              <Field
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
                    onTranscript={(text) => {
                      setForm((f) => ({ ...f, description: truncateWords(text, DESC_MAX_WORDS) }));
                      setErrors((er) => ({ ...er, description: null }));
                    }}
                    className="msj-about-mic"
                  />
                </div>
              </Field>
              <Field
                label="Target End Date"
                error={errors.endDate}
                labelExtra={form.endDate ? <span className="pf-char-counter">{daysRemainingLabel(form.endDate)}</span> : undefined}
              >
                <input type="date" min={minEndDate} value={form.endDate || ""} onChange={setField("endDate")} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Category">
                <select value={form.categoryId} onChange={setField("categoryId")}>
                  <option value="">Select a category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Islamic Fundraising Classification">
                <select value={form.donationType} onChange={setField("donationType")}>
                  {classifications.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              {form.donationType === "Zakat" && (
                <Field label="Zakat Eligibility Explanation" required error={errors.zakatEligibilityNote}>
                  <textarea rows={4} value={form.zakatEligibilityNote} onChange={setField("zakatEligibilityNote")} placeholder="e.g. Funds go directly to eligible recipients defined under the Zakat categories (asnaf)." />
                </Field>
              )}

              <h3 style={{ marginTop: 28 }}>Funding &amp; Budget</h3>
              <Field label="Funding Goal (INR)" required error={errors.goalAmount}>
                <input type="number" min="1" value={form.goalAmount} onChange={setField("goalAmount")} placeholder="e.g. 100000" />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <p className="msj-note" style={{ marginBottom: 16 }}>Photos: JPG, PNG, or WEBP, up to 5MB each. Videos: MP4, WEBM, or MOV, up to 50MB each.</p>
              <label className="btn btn-outline-ink msj-upload-btn">
                <Icon name="upload" size={16} /> Upload Photos or Videos
                <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden onChange={handleFiles} />
              </label>
              {errors.photos && <span className="auth-field-error" style={{ display: "block", marginTop: 8 }}>{errors.photos}</span>}
              <div className="msj-photo-grid msj-photo-grid-lg" style={{ marginTop: 16 }}>
                {photos.map((p) => (
                  <div className="msj-photo-card" key={p.id}>
                    <MediaThumb src={`${API_ORIGIN}${p.url}`} mediaType={p.mediaType} videoProps={{ controls: true }} />
                    {p.isCover && <span className="msj-cover-badge"><Icon name="star" size={12} /> Cover</span>}
                    <div className="msj-photo-actions">
                      {!p.isCover && p.mediaType !== "video" && <button type="button" onClick={() => setCover(p.id)} title="Set as cover"><Icon name="star" size={16} /></button>}
                      <button type="button" onClick={() => removePhoto(p.id)} title="Remove"><Icon name="trash" size={16} /></button>
                    </div>
                  </div>
                ))}
                {photos.length === 0 && <div className="msj-photo-empty"><Icon name="imageIcon" size={28} /><span>No photos or videos yet</span></div>}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="msj-compliance-list">
                <p>Before submitting, confirm the following:</p>
                <ul>
                  <li>All information provided is accurate and not misleading.</li>
                  <li>No fabricated Hadith, Qur'an citations, or religious claims have been used.</li>
                  <li>Funds will be used strictly for the purpose described in this campaign.</li>
                  <li>This masjid holds the necessary local authorization to raise funds for this project.</li>
                </ul>
              </div>
              <p className="msj-note" style={{ marginBottom: 8, marginTop: 16 }}>Optional: upload supporting documents (registration certificate, trust deed, NOC, budget estimate). PDF, JPG, PNG, DOC/DOCX up to 10MB each.</p>
              <label className="btn btn-outline-ink msj-upload-btn">
                <Icon name="upload" size={16} /> Upload Documents
                <input type="file" accept=".pdf,.doc,.docx,image/jpeg,image/png" multiple hidden onChange={handleDocuments} />
              </label>
              {errors.documents && <span className="auth-field-error" style={{ display: "block", marginTop: 8 }}>{errors.documents}</span>}
              <div style={{ marginTop: 16 }}>
                {documents.map((d) => (
                  <div key={d.id} className="msj-doc-row">
                    <Icon name="book" size={16} /> <span>{d.fileName}</span>
                    <button type="button" onClick={() => removeDocument(d.id)} title="Remove"><Icon name="trash" size={14} /></button>
                  </div>
                ))}
                {documents.length === 0 && <p className="msj-note">No documents uploaded yet.</p>}
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <CampaignSummary form={form} masjidInfo={masjidInfo} photos={photos} documents={documents} category={categories.find((c) => c.id === Number(form.categoryId))} onEdit={setStep} />
              <label className="msj-ack-row">
                <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                I confirm the information above is accurate and complies with Masjid My Community's Islamic and legal guidelines.
              </label>
              {errors.submit && <span className="auth-field-error" style={{ display: "block", marginTop: 8 }}>{errors.submit}</span>}
            </>
          )}

          <div className="msj-step-actions">
            <div>
              {step > 1 && <button className="btn btn-outline-ink" onClick={goBack} type="button"><Icon name="chevronLeft" size={16} /> Back</button>}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-outline-ink" onClick={saveAsDraft} type="button" disabled={saving}>Save as Draft</button>
              {step < STEPS.length && <button className="btn btn-gold" onClick={goNext} type="button" disabled={saving}>{saving ? "Saving…" : "Next"} <span className="btn-arrow">→</span></button>}
              {step === STEPS.length && <button className="btn btn-gold" onClick={doSubmit} type="button" disabled={saving || !acknowledged}>{saving ? "Submitting…" : "Submit for Review"} <span className="btn-arrow">→</span></button>}
            </div>
          </div>
        </div>
      </div>
    </WizardShell>
  );
}

function CampaignSummary({ form, masjidInfo, photos, documents, category, onEdit }) {
  const cover = photos.find((p) => p.isCover) || photos.find((p) => p.mediaType !== "video");
  return (
    <div className="msj-summary">
      <MediaThumb src={cover ? `${API_ORIGIN}${cover.url}` : null} className="msj-summary-cover" />
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Basic Information</h4>{onEdit && <button type="button" onClick={() => onEdit(1)}>Edit</button>}</div>
        <p><strong>{form.title}</strong>{masjidInfo?.name && ` — ${masjidInfo.name}`}</p>
        <p>{form.shortDescription}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Category &amp; Type</h4>{onEdit && <button type="button" onClick={() => onEdit(2)}>Edit</button>}</div>
        <p>{category?.name || "No category selected"} · {form.donationType}</p>
        {form.donationType === "Zakat" && <p>{form.zakatEligibilityNote}</p>}
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Funding &amp; Budget</h4>{onEdit && <button type="button" onClick={() => onEdit(2)}>Edit</button>}</div>
        <p>Goal: ₹{Number(form.goalAmount || 0).toLocaleString("en-IN")}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Photographs</h4>{onEdit && <button type="button" onClick={() => onEdit(3)}>Edit</button>}</div>
        <div className="msj-photo-grid msj-photo-grid-lg">
          {photos.map((p) => <MediaThumb key={p.id} src={`${API_ORIGIN}${p.url}`} mediaType={p.mediaType} className="msj-summary-thumb" videoProps={{ controls: true }} />)}
          {photos.length === 0 && <p>No photographs uploaded.</p>}
        </div>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Documents</h4>{onEdit && <button type="button" onClick={() => onEdit(4)}>Edit</button>}</div>
        {documents.map((d) => <p key={d.id}>{d.fileName}</p>)}
        {documents.length === 0 && <p>No documents uploaded.</p>}
      </div>
    </div>
  );
}

export default CampaignWizard;
