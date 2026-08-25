import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "../../components/Icons.jsx";
import campaignApi from "../../services/campaignApi.js";
import masjidApi from "../../services/masjidApi.js";
import MediaThumb from "../../components/MediaThumb.jsx";

const STEPS = [
  { key: "masjid", label: "Select Masjid" },
  { key: "basic", label: "Basic Info" },
  { key: "category", label: "Category & Type" },
  { key: "funding", label: "Funding & Budget" },
  { key: "photos", label: "Photos & Media" },
  { key: "compliance", label: "Compliance" },
  { key: "review", label: "Review & Submit" },
];

const DESC_MAX = 5000;
const DONATION_TYPES = [
  { key: "general_sadaqah", label: "General Sadaqah" },
  { key: "zakat", label: "Zakat" },
  { key: "waqf", label: "Waqf" },
  { key: "other", label: "Other" },
];

const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review", changes_requested: "Changes Requested",
  approved: "Approved", active: "Active", paused: "Paused", goal_reached: "Goal Reached",
  completed: "Completed", rejected: "Rejected", cancelled: "Cancelled",
};

function emptyForm() {
  return { title: "", shortDescription: "", description: "", categoryId: "", donationType: "general_sadaqah", zakatEligibilityNote: "", goalAmount: "", endDate: "" };
}

function Field({ label, children, hint, error }) {
  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      <label>{label}</label>
      {children}
      {error ? <span className="auth-field-error">{error}</span> : hint ? <span className="msj-field-hint">{hint}</span> : null}
    </div>
  );
}

function CampaignWizard() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [campaignId, setCampaignId] = useState(id || null);
  const [status, setStatus] = useState("draft");
  const [adminFeedback, setAdminFeedback] = useState(null);
  const [approvedMasjids, setApprovedMasjids] = useState(null);
  const [masjidId, setMasjidId] = useState(params.get("masjidId") || "");
  const [masjidInfo, setMasjidInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [budgetItems, setBudgetItems] = useState([{ label: "", amount: "" }]);
  const [photos, setPhotos] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!id);
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:5050/api/campaigns/public/categories").then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (id) return;
    masjidApi.get("/mine").then(({ data }) => setApprovedMasjids(data.masjids.filter((m) => m.status === "approved"))).catch(() => setApprovedMasjids([]));
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
          categoryId: c.categoryId || "", donationType: c.donationType || "general_sadaqah", zakatEligibilityNote: c.zakatEligibilityNote || "",
          goalAmount: c.goalAmount || "", endDate: c.endDate || "",
        });
        setBudgetItems(c.budgetItems?.length ? c.budgetItems.map((b) => ({ label: b.label, amount: b.amount })) : [{ label: "", amount: "" }]);
        setPhotos(c.photos || []);
        setDocuments(c.documents || []);
        setLoaded(true);
      })
      .catch(() => setError("Couldn't load this campaign."))
      .finally(() => setLoading(false));
  }, [id]);

  const readOnly = !!campaignId && !["draft", "changes_requested"].includes(status);
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const budgetTotal = budgetItems.reduce((s, b) => s + (Number(b.amount) || 0), 0);

  const validateStep = () => {
    if (step === 1 && !masjidId) {
      setError("Select the masjid this campaign is raised for.");
      return false;
    }
    if (step === 2 && !form.title?.trim()) {
      setError("Campaign title is required.");
      return false;
    }
    if (step === 3 && form.donationType === "zakat" && !form.zakatEligibilityNote?.trim()) {
      setError("Explain how this campaign qualifies for Zakat before continuing.");
      return false;
    }
    if (step === 4 && (!form.goalAmount || Number(form.goalAmount) <= 0)) {
      setError("Set a funding goal greater than zero.");
      return false;
    }
    return true;
  };

  const saveCurrentStep = async () => {
    if (id && !loaded) {
      setError("Still loading this campaign — please try again in a moment.");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      let cid = campaignId;
      if (!cid) {
        if (!masjidId || !form.title.trim()) {
          setError("Select a masjid and enter a campaign title.");
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
      setError(err.response?.data?.message || "Couldn't save. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (!validateStep()) return;
    if (step === 1 && !campaignId) {
      const ok = await saveCurrentStep();
      if (ok) setStep(2);
      return;
    }
    const ok = await saveCurrentStep();
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const saveAsDraft = async () => {
    if (!campaignId) {
      if (!masjidId || !form.title.trim()) { navigate("/account/campaigns"); return; }
    }
    const ok = await saveCurrentStep();
    if (ok) navigate("/account/campaigns");
  };

  const saveBudget = async () => {
    const items = budgetItems.filter((b) => b.label.trim() && Number(b.amount) > 0);
    if (items.length === 0) {
      setError("Add at least one budget line item.");
      return false;
    }
    setSaving(true);
    setError("");
    try {
      await campaignApi.put(`/${campaignId}/budget-items`, { items });
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save budget items.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    setSaving(true);
    setError("");
    try {
      const { data } = await campaignApi.post(`/${campaignId}/photos`, fd);
      setPhotos((p) => [...p, ...data.photos]);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload photo(s).");
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
    setError("");
    try {
      const { data } = await campaignApi.post(`/${campaignId}/documents`, fd);
      setDocuments((d) => [...d, ...data.documents]);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload document(s).");
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
    setError("");
    try {
      await campaignApi.post(`/${campaignId}/submit`);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit for review.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="msj-page"><div className="wrap py-lg"><p>Loading…</p></div></main>;

  if (submitted) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg msj-confirm">
          <div className="msj-confirm-icon"><Icon name="check" size={32} /></div>
          <h1>Your campaign has been submitted for review.</h1>
          <p>An admin will check the Islamic, legal, and content guidelines before this campaign goes live. You can track its status any time from My Campaigns.</p>
          <Link to="/account/campaigns" className="btn btn-gold">Go to My Campaigns <span className="btn-arrow">→</span></Link>
        </div>
      </main>
    );
  }

  if (!approvedMasjids && !id) return <main className="msj-page"><div className="wrap py-lg"><p>Loading…</p></div></main>;

  if (approvedMasjids && approvedMasjids.length === 0 && !id) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg msj-empty-state">
          <Icon name="mosque" size={30} />
          <h3>Complete your masjid's verification first</h3>
          <p>Only an approved masjid can raise a campaign. Register or finish verifying your masjid, then come back to start a campaign.</p>
          <Link to="/account/masjids" className="btn btn-gold">Go to My Masjids <span className="btn-arrow">→</span></Link>
        </div>
      </main>
    );
  }

  if (readOnly) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg">
          <Link to="/account/campaigns" className="msj-back-link"><Icon name="chevronLeft" size={16} /> Back to My Campaigns</Link>
          <div className="section-head" style={{ marginTop: 16 }}>
            <span className="eyebrow">{masjidInfo?.name}</span>
            <h2>{form.title}</h2>
            <span className={`acct-status-pill ${status}`}>{STATUS_LABEL[status]}</span>
          </div>
          {adminFeedback && (
            <div className="msj-feedback-banner">
              <strong>{status === "rejected" ? "Reason for rejection" : "Admin feedback"}</strong>
              <p>{adminFeedback}</p>
            </div>
          )}
          <CampaignSummary form={form} masjidInfo={masjidInfo} budgetItems={budgetItems} budgetTotal={budgetTotal} photos={photos} documents={documents} category={categories.find((c) => c.id === form.categoryId)} />
        </div>
      </main>
    );
  }

  return (
    <main className="msj-page">
      <div className="wrap py-lg">
        <Link to="/account/campaigns" className="msj-back-link"><Icon name="chevronLeft" size={16} /> Back to My Campaigns</Link>

        <div className="section-head" style={{ marginTop: 16, marginBottom: 32 }}>
          <span className="eyebrow">Start a Campaign</span>
          <h2>{form.title || "New Fundraising Campaign"}</h2>
        </div>

        {adminFeedback && status === "changes_requested" && (
          <div className="msj-feedback-banner">
            <strong>Changes requested by the admin</strong>
            <p>{adminFeedback}</p>
          </div>
        )}

        <div className="msj-steps">
          {STEPS.map((s, i) => (
            <div key={s.key} className={`msj-step-dot${i + 1 === step ? " active" : ""}${i + 1 < step ? " done" : ""}`}>
              <span>{i + 1 < step ? <Icon name="check" size={12} /> : i + 1}</span>
              {s.label}
            </div>
          ))}
        </div>

        {error && <div className="auth-alert" style={{ marginBottom: 20 }}><Icon name="info" size={17} />{error}</div>}

        <div className={`card msj-step-card${step === 5 || step === 7 ? " msj-step-card-wide" : ""}`}>
          {step === 1 && (
            <>
              <h3>Select the Masjid</h3>
              <p className="msj-note" style={{ marginBottom: 16 }}>Only campaigns tied to an approved, verified masjid can be launched.</p>
              <div className="msj-list-grid">
                {approvedMasjids?.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`msj-list-card msj-selectable-card${String(masjidId) === String(m.id) ? " selected" : ""}`}
                    onClick={() => setMasjidId(m.id)}
                    disabled={!!campaignId}
                  >
                    <div className="msj-list-thumb"><MediaThumb src={m.coverPhotoUrl ? `http://localhost:5050${m.coverPhotoUrl}` : null} /></div>
                    <div className="msj-list-body">
                      <h3>{m.name}</h3>
                      <p className="msj-list-loc"><Icon name="mapPin" size={14} /> {[m.city, m.country].filter(Boolean).join(", ")}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Field label="Campaign Title" hint="A clear, specific title donors will recognize.">
                <input value={form.title} onChange={setField("title")} placeholder="e.g. Rebuild Our Flood-Damaged Prayer Hall" disabled={!!campaignId} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <h3>Basic Information</h3>
              <Field label="Short Description" hint="One or two sentences shown on campaign cards.">
                <input value={form.shortDescription} onChange={setField("shortDescription")} placeholder="A brief summary of what this campaign funds" />
              </Field>
              <Field label="Full Description" hint={`${form.description.length} / ${DESC_MAX} characters. Explain the need, the plan, and the expected impact — no fabricated claims, hadith, or Qur'an citations.`}>
                <textarea rows={7} maxLength={DESC_MAX} value={form.description} onChange={setField("description")} placeholder="Describe the project in detail" />
              </Field>
              <Field label="Target End Date (optional)">
                <input type="date" value={form.endDate || ""} onChange={setField("endDate")} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <h3>Category &amp; Donation Type</h3>
              <Field label="Category (optional)">
                <select value={form.categoryId} onChange={setField("categoryId")}>
                  <option value="">Select a category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Islamic Fundraising Classification" hint="This determines how the campaign is presented to donors.">
                <select value={form.donationType} onChange={setField("donationType")}>
                  {DONATION_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </Field>
              {form.donationType === "zakat" && (
                <Field label="Zakat Eligibility Explanation" hint="Explain, in your own words, why this specific need qualifies for Zakat funds.">
                  <textarea rows={4} value={form.zakatEligibilityNote} onChange={setField("zakatEligibilityNote")} placeholder="e.g. Funds go directly to eligible recipients defined under the Zakat categories (asnaf)." />
                </Field>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h3>Funding &amp; Budget</h3>
              <Field label="Funding Goal (INR)" hint="The total amount this campaign is trying to raise.">
                <input type="number" min="1" value={form.goalAmount} onChange={setField("goalAmount")} placeholder="e.g. 100000" />
              </Field>

              <h4 className="msj-subhead">Budget Breakdown</h4>
              <p className="msj-note" style={{ marginBottom: 16 }}>Break the goal down into what the funds will actually be spent on — this is shown publicly for transparency.</p>
              {budgetItems.map((b, i) => (
                <div className="msj-field-row" key={i}>
                  <Field label={`Line Item ${i + 1}`}>
                    <input value={b.label} onChange={(e) => setBudgetItems((items) => items.map((it, idx) => (idx === i ? { ...it, label: e.target.value } : it)))} placeholder="e.g. Roofing materials" />
                  </Field>
                  <Field label="Amount (INR)">
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="number" min="0" value={b.amount} onChange={(e) => setBudgetItems((items) => items.map((it, idx) => (idx === i ? { ...it, amount: e.target.value } : it)))} placeholder="0" />
                      {budgetItems.length > 1 && (
                        <button type="button" className="btn btn-outline-ink" onClick={() => setBudgetItems((items) => items.filter((_, idx) => idx !== i))} title="Remove line item">
                          <Icon name="trash" size={16} />
                        </button>
                      )}
                    </div>
                  </Field>
                </div>
              ))}
              <button type="button" className="btn btn-outline-ink" onClick={() => setBudgetItems((items) => [...items, { label: "", amount: "" }])} style={{ marginBottom: 16 }}>
                <Icon name="plus" size={16} /> Add Line Item
              </button>
              <p className="msj-note">
                Budget total: <strong>₹{budgetTotal.toLocaleString("en-IN")}</strong>
                {form.goalAmount && Number(form.goalAmount) !== budgetTotal && <span> — differs from the funding goal of ₹{Number(form.goalAmount).toLocaleString("en-IN")}.</span>}
              </p>
            </>
          )}

          {step === 5 && (
            <>
              <h3>Photos &amp; Media</h3>
              <p className="msj-note" style={{ marginBottom: 16 }}>Photos: JPG, PNG, or WEBP, up to 5MB each. Videos: MP4, WEBM, or MOV, up to 50MB each.</p>
              <label className="btn btn-outline-ink msj-upload-btn">
                <Icon name="upload" size={16} /> Upload Photos or Videos
                <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden onChange={handleFiles} />
              </label>
              <div className="msj-photo-grid msj-photo-grid-lg" style={{ marginTop: 16 }}>
                {photos.map((p) => (
                  <div className="msj-photo-card" key={p.id}>
                    <MediaThumb src={`http://localhost:5050${p.url}`} mediaType={p.mediaType} videoProps={{ controls: true }} />
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

          {step === 6 && (
            <>
              <h3>Compliance Declarations</h3>
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

          {step === 7 && (
            <>
              <h3>Review &amp; Submit</h3>
              <CampaignSummary form={form} masjidInfo={masjidInfo} budgetItems={budgetItems} budgetTotal={budgetTotal} photos={photos} documents={documents} category={categories.find((c) => c.id === Number(form.categoryId))} onEdit={setStep} />
              <label className="msj-ack-row">
                <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                I confirm the information above is accurate and complies with Masjid My Community's Islamic and legal guidelines.
              </label>
            </>
          )}

          <div className="msj-step-actions">
            <div>
              {step > 1 && <button className="btn btn-outline-ink" onClick={goBack} type="button"><Icon name="chevronLeft" size={16} /> Back</button>}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-outline-ink" onClick={saveAsDraft} type="button" disabled={saving}>Save as Draft</button>
              {step === 4 && <button className="btn btn-outline-ink" onClick={async () => { if (!validateStep()) return; const ok = await saveBudget(); if (ok) setStep(5); }} type="button" disabled={saving}>Next <span className="btn-arrow">→</span></button>}
              {step < STEPS.length && step !== 4 && <button className="btn btn-gold" onClick={goNext} type="button" disabled={saving}>{saving ? "Saving…" : "Next"} <span className="btn-arrow">→</span></button>}
              {step === STEPS.length && <button className="btn btn-gold" onClick={doSubmit} type="button" disabled={saving || !acknowledged}>{saving ? "Submitting…" : "Submit for Review"} <span className="btn-arrow">→</span></button>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function CampaignSummary({ form, masjidInfo, budgetItems, budgetTotal, photos, documents, category, onEdit }) {
  const cover = photos.find((p) => p.isCover) || photos.find((p) => p.mediaType !== "video");
  return (
    <div className="msj-summary">
      <MediaThumb src={cover ? `http://localhost:5050${cover.url}` : null} className="msj-summary-cover" />
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Basic Information</h4>{onEdit && <button type="button" onClick={() => onEdit(2)}>Edit</button>}</div>
        <p><strong>{form.title}</strong>{masjidInfo?.name && ` — ${masjidInfo.name}`}</p>
        <p>{form.shortDescription}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Category &amp; Type</h4>{onEdit && <button type="button" onClick={() => onEdit(3)}>Edit</button>}</div>
        <p>{category?.name || "No category selected"} · {DONATION_TYPES.find((d) => d.key === form.donationType)?.label}</p>
        {form.donationType === "zakat" && <p>{form.zakatEligibilityNote}</p>}
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Funding &amp; Budget</h4>{onEdit && <button type="button" onClick={() => onEdit(4)}>Edit</button>}</div>
        <p>Goal: ₹{Number(form.goalAmount || 0).toLocaleString("en-IN")}</p>
        {budgetItems.filter((b) => b.label).map((b, i) => <p key={i}>{b.label}: ₹{Number(b.amount || 0).toLocaleString("en-IN")}</p>)}
        <p><strong>Budget total: ₹{budgetTotal.toLocaleString("en-IN")}</strong></p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Photographs</h4>{onEdit && <button type="button" onClick={() => onEdit(5)}>Edit</button>}</div>
        <div className="msj-photo-grid msj-photo-grid-lg">
          {photos.map((p) => <MediaThumb key={p.id} src={`http://localhost:5050${p.url}`} mediaType={p.mediaType} className="msj-summary-thumb" videoProps={{ controls: true }} />)}
          {photos.length === 0 && <p>No photographs uploaded.</p>}
        </div>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Documents</h4>{onEdit && <button type="button" onClick={() => onEdit(6)}>Edit</button>}</div>
        {documents.map((d) => <p key={d.id}>{d.fileName}</p>)}
        {documents.length === 0 && <p>No documents uploaded.</p>}
      </div>
    </div>
  );
}

export default CampaignWizard;
