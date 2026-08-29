import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { Icon } from "../../components/Icons.jsx";
import masjidApi from "../../services/masjidApi.js";
import AddressAutocomplete from "../../components/AddressAutocomplete.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";

const STEPS = [
  { key: "basic", label: "Basic Info" },
  { key: "contact", label: "Contact & Verification" },
  { key: "photos", label: "Photos & Media" },
  { key: "review", label: "Review & Submit" },
];

const ABOUT_MAX = 5000;

const PHOTO_CATEGORIES = [
  { key: "community", label: "Community Activities" },
  { key: "exterior", label: "Exterior View" },
  { key: "facilities", label: "Facilities" },
  { key: "interior", label: "Interior View" },
  { key: "prayer_hall", label: "Prayer Hall" },
  { key: "other", label: "Other" },
];

function emptyForm() {
  return {
    name: "", tagline: "", about: "", category: "",
    address: "", area: "", city: "", district: "", state: "", country: "", postalCode: "", mapLink: "",
    formattedAddress: "", latitude: null, longitude: null,
    imamName: "", contactMobile: "", contactEmail: "",
  };
}

const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", approved: "Approved", rejected: "Rejected", inactive: "Inactive", deleted: "Deleted",
};

function Field({ label, children, hint, error, required }) {
  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      <label>{label}{required && <span className="msj-required">*</span>}</label>
      {children}
      {error ? <span className="auth-field-error">{error}</span> : hint ? <span className="msj-field-hint">{hint}</span> : null}
    </div>
  );
}

function WizardShell({ embedded, children }) {
  if (embedded) return <div className="cw-wizard-embed">{children}</div>;
  return (
    <main className="msj-page">
      <div className="wrap py-lg">{children}</div>
    </main>
  );
}

function MasjidWizard({ embedded = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const backTo = embedded ? "/my-community" : "/account/my-masjids";
  const backLabel = embedded ? "Back to Community Wall" : "Back to My Masjids";

  const [masjidId, setMasjidId] = useState(id || null);
  const [status, setStatus] = useState("draft");
  const [adminFeedback, setAdminFeedback] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [categories, setCategories] = useState([]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [uploadCategory, setUploadCategory] = useState("exterior");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!id);
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [otpTarget, setOtpTarget] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // Advancing steps doesn't change the URL (this wizard can be embedded
  // inline on the Community Wall), so the router's own scroll-to-top never
  // fires here — do it manually whenever the visible step changes.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [step, submitted]);

  useEffect(() => {
    axios
      .get(`${API_BASE}/masjids/public/categories`)
      .then(({ data }) => setCategories([...data.categories].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, []);

  const applyResolvedAddress = (fields) => {
    setForm((f) => ({
      ...f,
      address: fields.address || f.address,
      formattedAddress: fields.formattedAddress || f.formattedAddress,
      area: fields.area || f.area,
      city: fields.city || f.city,
      district: fields.district || f.district,
      state: fields.state || f.state,
      country: fields.country || f.country,
      postalCode: fields.postalCode || f.postalCode,
      mapLink: fields.mapLink || f.mapLink,
      latitude: fields.latitude ?? f.latitude,
      longitude: fields.longitude ?? f.longitude,
    }));
  };

  useEffect(() => {
    if (!id) {
      // Navigating here from an existing masjid's edit page (e.g. via "Add a
      // Masjid" in the sidebar) reuses this same component instance — React
      // Router doesn't remount it just because the :id param disappeared, so
      // without this the previous masjid's data would stay on screen under
      // the new /new URL.
      setMasjidId(null);
      setStatus("draft");
      setAdminFeedback(null);
      setForm(emptyForm());
      setEmailVerified(false);
      setMobileVerified(false);
      setPhotos([]);
      setStep(1);
      setErrors({});
      setSubmitted(false);
      setLoading(false);
      setLoaded(true);
      return;
    }
    setLoading(true);
    setLoaded(false);
    masjidApi
      .get(`/${id}`)
      .then(({ data }) => {
        const m = data.masjid;
        setMasjidId(m.id);
        setStatus(m.status);
        setAdminFeedback(m.adminFeedback);
        setForm({
          name: m.name || "", tagline: m.tagline || "", about: m.about || "", category: m.category || "",
          address: m.address || "", area: m.area || "", city: m.city || "", district: m.district || "", state: m.state || "", country: m.country || "",
          postalCode: m.postalCode || "", mapLink: m.mapLink || "",
          formattedAddress: m.formattedAddress || "",
          latitude: m.latitude != null ? Number(m.latitude) : null,
          longitude: m.longitude != null ? Number(m.longitude) : null,
          imamName: m.imamName || "", contactMobile: m.contactMobile || "", contactEmail: m.contactEmail || "",
        });
        setEmailVerified(m.emailVerified);
        setMobileVerified(m.mobileVerified);
        setPhotos(m.photos || []);
        setLoaded(true);
      })
      .catch(() => setErrors({ form: "Couldn't load this masjid." }))
      .finally(() => setLoading(false));
  }, [id]);

  const readOnly = !!masjidId && !["draft", "changes_requested"].includes(status);
  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: null }));
  };

  const validateStep = () => {
    if (step === 2) {
      if (!form.imamName?.trim()) {
        setErrors({ imamName: "Imam name is required." });
        return false;
      }
      if (!form.contactMobile?.trim()) {
        setErrors({ contactMobile: "A contact mobile number is required." });
        return false;
      }
      if (!/^[6-9]\d{9}$/.test(form.contactMobile.trim())) {
        setErrors({ contactMobile: "Enter a valid 10-digit Indian mobile number." });
        return false;
      }
      if (!mobileVerified) {
        setErrors({ contactMobile: "Please verify the contact mobile number before continuing." });
        return false;
      }
      if (form.contactEmail?.trim() && !emailVerified) {
        setErrors({ contactEmail: "Please verify the email address, or clear it to continue without one." });
        return false;
      }
    }
    return true;
  };

  // Saving is always allowed — the gates below only decide whether the user may
  // move to the next step, so sending an OTP and saving a draft stay possible
  // while the step is still incomplete.
  const saveCurrentStep = async () => {
    // An existing masjid must finish loading first, otherwise the still-empty
    // initial form would be written over the saved record.
    if (id && !loaded) {
      setErrors({ form: "Still loading this masjid — please try again in a moment." });
      return false;
    }

    setSaving(true);
    setErrors({});
    try {
      let mid = masjidId;
      if (!mid) {
        if (!form.name.trim()) {
          setErrors({ name: "Masjid name is required." });
          return false;
        }
        const { data } = await masjidApi.post("/", { name: form.name });
        mid = data.masjid.id;
        setMasjidId(mid);
        setStatus(data.masjid.status);
      }
      await masjidApi.patch(`/${mid}`, form);
      return true;
    } catch (err) {
      const field = err.response?.data?.field;
      const message = err.response?.data?.message || "Couldn't save. Please try again.";
      setErrors(field ? { [field]: message } : { form: message });
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
    const ok = await saveCurrentStep();
    if (ok) navigate("/account/my-masjids");
  };

  const sendOtp = async (target) => {
    const ok = await saveCurrentStep();
    if (!ok) return;
    setOtpSending(true);
    setOtpError("");
    setOtpCode("");
    try {
      const { data } = await masjidApi.post(`/${masjidId}/verify/send-otp`, { target });
      setDemoOtp(data.demoOtp || "");
      setOtpTarget(target);
    } catch (err) {
      setErrors((er) => ({ ...er, [target === "email" ? "contactEmail" : "contactMobile"]: err.response?.data?.message || "Couldn't send the verification code." }));
    } finally {
      setOtpSending(false);
    }
  };

  const confirmOtp = async () => {
    setOtpError("");
    try {
      const { data } = await masjidApi.post(`/${masjidId}/verify/confirm-otp`, { otp: otpCode });
      if (data.target === "email") setEmailVerified(true);
      else setMobileVerified(true);
      setOtpTarget(null);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect code.");
    }
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    fd.append("category", uploadCategory);
    setSaving(true);
    setErrors((er) => ({ ...er, photos: null }));
    try {
      const { data } = await masjidApi.post(`/${masjidId}/photos`, fd);
      setPhotos((p) => [...p, ...data.photos]);
    } catch (err) {
      setErrors((er) => ({ ...er, photos: err.response?.data?.message || "Couldn't upload photo(s)." }));
    } finally {
      setSaving(false);
      e.target.value = "";
    }
  };

  const setCover = async (photoId) => {
    await masjidApi.patch(`/${masjidId}/photos/${photoId}`, { isCover: true });
    setPhotos((p) => p.map((ph) => ({ ...ph, isCover: ph.id === photoId })));
  };
  const removePhoto = async (photoId) => {
    await masjidApi.delete(`/${masjidId}/photos/${photoId}`);
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
  };
  const movePhoto = async (index, dir) => {
    const next = [...photos];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setPhotos(next);
    await Promise.all(next.map((ph, i) => masjidApi.patch(`/${masjidId}/photos/${ph.id}`, { sortOrder: i })));
  };

  const doSubmit = async () => {
    setSaving(true);
    setErrors((er) => ({ ...er, submit: null }));
    try {
      await masjidApi.post(`/${masjidId}/submit`);
      setSubmitted(true);
    } catch (err) {
      setErrors((er) => ({ ...er, submit: err.response?.data?.message || "Couldn't submit for verification." }));
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
          <h1>Your Masjid registration has been successfully submitted for verification.</h1>
          <p>Our team will review the details you provided. You can track the approval status any time from My Masjids.</p>
          <Link to="/account/my-masjids" className="btn btn-gold">Go to My Masjids <span className="btn-arrow">→</span></Link>
        </div>
      </WizardShell>
    );
  }

  if (readOnly) {
    return (
      <WizardShell embedded={embedded}>
        <Link to={backTo} className="msj-back-link"><Icon name="chevronLeft" size={16} /> {backLabel}</Link>
        <div className="section-head" style={{ marginTop: 16, maxWidth: "none" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <span className="eyebrow">{form.name}</span>
            <span className={`acct-status-pill ${status}`}>{STATUS_LABEL[status]}</span>
          </div>
          <h2>Registration Details</h2>
        </div>
        {adminFeedback && (
          <div className="msj-feedback-banner">
            <strong>{status === "rejected" ? "Reason for rejection" : "Admin feedback"}</strong>
            <p>{adminFeedback}</p>
          </div>
        )}
        <MasjidSummary form={form} photos={photos} emailVerified={emailVerified} mobileVerified={mobileVerified} />
      </WizardShell>
    );
  }

  return (
    <WizardShell embedded={embedded}>
      <Link to={backTo} className="msj-back-link"><Icon name="chevronLeft" size={16} /> {backLabel}</Link>

        <div className="section-head msj-wizard-title-head" style={{ marginTop: 16, marginBottom: 32 }}>
          <span className="eyebrow">Register Your Masjid</span>
          <h2 className="msj-wizard-title">{form.name || "New Masjid Registration"}</h2>
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

        {errors.form && <div className="auth-alert" style={{ marginBottom: 20 }}><Icon name="info" size={17} />{errors.form}</div>}

        <div className={`card msj-step-card${step === 3 || step === 4 ? " msj-step-card-wide" : ""}`}>
          {step === 1 && (
            <>
              <Field label="Masjid Name" required error={errors.name}><input value={form.name} onChange={setField("name")} placeholder="e.g. Al-Noor Masjid" maxLength={255} /></Field>
              <Field label="Tagline / Short Description" error={errors.tagline}>
                <input value={form.tagline} onChange={setField("tagline")} placeholder="A brief line that captures your masjid" maxLength={255} />
              </Field>
              <Field label="About the Masjid" required error={errors.about}>
                <textarea rows={5} maxLength={ABOUT_MAX} value={form.about} onChange={setField("about")} placeholder="Share the masjid's history, community, and mission" />
              </Field>
              <Field label="Masjid Category" error={errors.category}>
                <select value={form.category} onChange={setField("category")}>
                  <option value="">Select a category</option>
                  {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Address" required error={errors.address} hint={!errors.address ? "Search for the masjid by name or address — the rest of the location details fill in automatically." : undefined}>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  onResolved={applyResolvedAddress}
                  placeholder="e.g. Jama Masjid, Delhi"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Imam Name" required error={errors.imamName}><input value={form.imamName} onChange={setField("imamName")} maxLength={255} /></Field>

              <VerifiableField
                label="Contact Mobile Number"
                required
                value={form.contactMobile}
                onChange={(e) => setField("contactMobile")({ target: { value: e.target.value.replace(/\D/g, "").slice(0, 10) } })}
                placeholder="10-digit mobile number"
                maxLength={10}
                verified={mobileVerified}
                sending={otpSending}
                onVerify={() => sendOtp("mobile")}
                error={errors.contactMobile}
              />
              <VerifiableField
                label="Email Address"
                value={form.contactEmail}
                onChange={setField("contactEmail")}
                placeholder="masjid@example.com"
                verified={emailVerified}
                sending={otpSending}
                onVerify={() => sendOtp("email")}
                error={errors.contactEmail}
              />
            </>
          )}

          {step === 3 && (
            <>
              <h3>Photos &amp; Media</h3>
              <p className="msj-note" style={{ marginBottom: 16 }}>Photos: JPG, PNG, or WEBP, up to 5MB each. Videos: MP4, WEBM, or MOV, up to 50MB each. Choose a category, then upload.</p>
              <div className="msj-upload-row">
                <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                  {PHOTO_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <label className="btn btn-outline-ink msj-upload-btn">
                  <Icon name="upload" size={16} /> Upload Photos or Videos
                  <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden onChange={handleFiles} />
                </label>
              </div>
              {errors.photos && <span className="auth-field-error" style={{ display: "block", marginBottom: 12 }}>{errors.photos}</span>}
              <div className="msj-photo-grid msj-photo-grid-lg">
                {photos.map((p, i) => (
                  <div className="msj-photo-card" key={p.id}>
                    <MediaThumb src={`${API_ORIGIN}${p.url}`} mediaType={p.mediaType} videoProps={{ controls: true }} />
                    {p.isCover && <span className="msj-cover-badge"><Icon name="star" size={12} /> Cover</span>}
                    <span className="msj-photo-cat">{PHOTO_CATEGORIES.find((c) => c.key === p.category)?.label || p.category}</span>
                    <div className="msj-photo-actions">
                      {!p.isCover && p.mediaType !== "video" && <button type="button" onClick={() => setCover(p.id)} title="Set as cover"><Icon name="star" size={16} /></button>}
                      <button type="button" onClick={() => movePhoto(i, -1)} title="Move earlier"><Icon name="chevronLeft" size={16} /></button>
                      <button type="button" onClick={() => movePhoto(i, 1)} title="Move later"><Icon name="chevronRight" size={16} /></button>
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
              <h3>Review &amp; Submit</h3>
              <MasjidSummary form={form} photos={photos} emailVerified={emailVerified} mobileVerified={mobileVerified} onEdit={setStep} />
              {errors.submit && <span className="auth-field-error" style={{ display: "block", marginTop: 12 }}>{errors.submit}</span>}
            </>
          )}

          <div className="msj-step-actions">
            <div>
              {step > 1 && <button className="btn btn-outline-ink" onClick={goBack} type="button"><Icon name="chevronLeft" size={16} /> Back</button>}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-outline-ink" onClick={saveAsDraft} type="button" disabled={saving}>Save as Draft</button>
              {step < STEPS.length && <button className="btn btn-gold" onClick={goNext} type="button" disabled={saving}>{saving ? "Saving…" : "Next"} <span className="btn-arrow">→</span></button>}
              {step === STEPS.length && <button className="btn btn-gold" onClick={doSubmit} type="button" disabled={saving}>{saving ? "Submitting…" : "Submit for Verification"} <span className="btn-arrow">→</span></button>}
            </div>
          </div>
        </div>

      {otpTarget && (
        <div className="msj-modal-overlay" onClick={() => setOtpTarget(null)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setOtpTarget(null)} aria-label="Close"><Icon name="x" size={16} /></button>
            <h3>Verify {otpTarget === "email" ? "Email Address" : "Mobile Number"}</h3>
            <p className="msj-modal-sub">Enter the 6-digit code sent to {otpTarget === "email" ? form.contactEmail : form.contactMobile}.</p>
            {demoOtp && <p className="msj-note">Demo mode — verification code: <strong>{demoOtp}</strong></p>}
            <div className="auth-field">
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" maxLength={6} style={{ letterSpacing: "6px", textAlign: "center", fontSize: 20 }} />
            </div>
            {otpError && <span className="auth-field-error">{otpError}</span>}
            <button className="btn btn-gold" style={{ width: "100%", marginTop: 12 }} onClick={confirmOtp} type="button">Verify</button>
            <button className="msj-resend-link" type="button" onClick={() => sendOtp(otpTarget)}>Resend code</button>
          </div>
        </div>
      )}
    </WizardShell>
  );
}

function VerifiableField({ label, value, onChange, placeholder, maxLength, verified, sending, onVerify, hint, error, required }) {
  return (
    <div className={`auth-field msj-verifiable-field${error ? " has-error" : ""}`}>
      <label>{label}{required && <span className="msj-required">*</span>}</label>
      <div className="msj-verifiable-row">
        <input value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength} />
        {verified ? (
          <span className="acct-status-pill active"><Icon name="check" size={13} /> Verified</span>
        ) : (
          <button className="btn btn-outline-ink" type="button" disabled={!value || sending} onClick={onVerify}>{sending ? "Sending…" : "Verify"}</button>
        )}
      </div>
      {error ? <span className="auth-field-error">{error}</span> : hint ? <span className="msj-field-hint">{hint}</span> : null}
    </div>
  );
}

function MasjidSummary({ form, photos, emailVerified, mobileVerified, onEdit }) {
  // A video can never be the cover (enforced server-side too) — a masjid
  // with only videos uploaded falls back to the branded placeholder instead
  // of silently rendering a video where a still image is expected.
  const cover = photos.find((p) => p.isCover) || photos.find((p) => p.mediaType !== "video");
  return (
    <div className="msj-summary">
      <MediaThumb src={cover ? `${API_ORIGIN}${cover.url}` : null} className="msj-summary-cover" />
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Basic Information</h4>{onEdit && <button type="button" onClick={() => onEdit(1)}>Edit</button>}</div>
        <p><strong>{form.name}</strong>{form.tagline && ` — ${form.tagline}`}</p>
        <p>{form.about}</p>
        <p>{[form.address, form.area, form.city, form.district, form.state, form.country, form.postalCode].filter(Boolean).join(", ")}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Contact &amp; Verification</h4>{onEdit && <button type="button" onClick={() => onEdit(2)}>Edit</button>}</div>
        <p>Imam: {form.imamName || "—"}</p>
        <p>{form.contactEmail || "—"} {emailVerified && "(verified)"} · {form.contactMobile || "—"} {mobileVerified && "(verified)"}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Photographs</h4>{onEdit && <button type="button" onClick={() => onEdit(3)}>Edit</button>}</div>
        <div className="msj-photo-grid msj-photo-grid-lg">
          {photos.map((p) => (
            <MediaThumb key={p.id} src={`${API_ORIGIN}${p.url}`} mediaType={p.mediaType} className="msj-summary-thumb" videoProps={{ controls: true }} />
          ))}
          {photos.length === 0 && <p>No photographs uploaded.</p>}
        </div>
      </div>
    </div>
  );
}

export default MasjidWizard;
