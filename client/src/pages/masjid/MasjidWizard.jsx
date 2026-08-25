import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "../../components/Icons.jsx";
import masjidApi from "../../services/masjidApi.js";
import AddressAutocomplete from "../../components/AddressAutocomplete.jsx";
import LocationMap from "../../components/LocationMap.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import { validateDonationAccount, validateUpiId, validateIfsc, validateAccountNumber } from "../../utils/donationValidation.js";

const STEPS = [
  { key: "basic", label: "Basic Info" },
  { key: "location", label: "Location" },
  { key: "contact", label: "Contact & Verification" },
  { key: "donation", label: "Donation Account" },
  { key: "photos", label: "Photos & Media" },
  { key: "review", label: "Review & Submit" },
];

const ABOUT_MAX = 5000;
const CURRENT_YEAR = new Date().getFullYear();

const PHOTO_CATEGORIES = [
  { key: "exterior", label: "Exterior View" },
  { key: "interior", label: "Interior View" },
  { key: "prayer_hall", label: "Prayer Hall" },
  { key: "community", label: "Community Activities" },
  { key: "facilities", label: "Facilities" },
  { key: "other", label: "Other" },
];

function emptyForm() {
  return {
    name: "", tagline: "", about: "", yearEstablished: "", category: "",
    address: "", area: "", city: "", district: "", state: "", country: "", postalCode: "", mapLink: "",
    formattedAddress: "", latitude: null, longitude: null,
    imamName: "", contactMobile: "", contactEmail: "",
  };
}

const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", approved: "Approved", rejected: "Rejected", inactive: "Inactive",
};

function Field({ label, children, hint, error }) {
  return (
    <div className={`auth-field${error ? " has-error" : ""}`}>
      <label>{label}</label>
      {children}
      {error ? <span className="auth-field-error">{error}</span> : hint ? <span className="msj-field-hint">{hint}</span> : null}
    </div>
  );
}

function MasjidWizard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [masjidId, setMasjidId] = useState(id || null);
  const [status, setStatus] = useState("draft");
  const [adminFeedback, setAdminFeedback] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [yearError, setYearError] = useState("");
  const [categories, setCategories] = useState([]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [donation, setDonation] = useState({ upiId: "", upiAccountHolder: "", bankName: "", accountHolderName: "", accountNumber: "", confirmAccountNumber: "", ifscCode: "", branchName: "" });
  const [donationErrors, setDonationErrors] = useState({});
  const [photos, setPhotos] = useState([]);
  const [uploadCategory, setUploadCategory] = useState("exterior");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!id);
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [otpTarget, setOtpTarget] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:5050/api/masjids/public/categories")
      .then(({ data }) => setCategories(data.categories))
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

  // Dragging the pin is a precision adjustment, so the address line the user
  // already chose is kept — only the coordinates and the surrounding
  // administrative fields follow the pin.
  const applyPinLocation = (fields) => {
    setForm((f) => ({
      ...f,
      address: f.address || fields.address || "",
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
    if (!id) return;
    masjidApi
      .get(`/${id}`)
      .then(({ data }) => {
        const m = data.masjid;
        setMasjidId(m.id);
        setStatus(m.status);
        setAdminFeedback(m.adminFeedback);
        setForm({
          name: m.name || "", tagline: m.tagline || "", about: m.about || "", yearEstablished: m.yearEstablished || "", category: m.category || "",
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
        if (m.donationAccount) setDonation((d) => ({ ...d, ...m.donationAccount, accountNumber: "", confirmAccountNumber: "" }));
        setLoaded(true);
      })
      .catch(() => setError("Couldn't load this masjid."))
      .finally(() => setLoading(false));
  }, [id]);

  const readOnly = !!masjidId && !["draft", "changes_requested"].includes(status);
  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setYearField = (e) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
    setForm((f) => ({ ...f, yearEstablished: v }));
    if (!v) { setYearError(""); return; }
    if (v.length < 4) { setYearError(""); return; }
    const year = Number(v);
    setYearError(year < 1300 || year > CURRENT_YEAR ? `Enter a valid year between 1300 and ${CURRENT_YEAR}.` : "");
  };

  const validateStep = () => {
    if (step === 1 && form.yearEstablished && (form.yearEstablished.length < 4 || yearError)) {
      setError(`Enter a valid year between 1300 and ${CURRENT_YEAR}, or leave it blank.`);
      return false;
    }
    if (step === 3) {
      if (!form.contactMobile?.trim()) {
        setError("A contact mobile number is required.");
        return false;
      }
      if (!/^\d{10}$/.test(form.contactMobile.trim())) {
        setError("Enter a valid 10-digit mobile number.");
        return false;
      }
      if (!mobileVerified) {
        setError("Please verify the contact mobile number before continuing.");
        return false;
      }
      if (form.contactEmail?.trim() && !emailVerified) {
        setError("Please verify the email address, or clear it to continue without one.");
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
      setError("Still loading this masjid — please try again in a moment.");
      return false;
    }

    setSaving(true);
    setError("");
    try {
      let mid = masjidId;
      if (!mid) {
        if (!form.name.trim()) {
          setError("Masjid name is required.");
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
      setError(err.response?.data?.message || "Couldn't save. Please try again.");
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
    if (ok) navigate("/account/masjids");
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
      setError(err.response?.data?.message || "Couldn't send the verification code.");
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

  const setDonationField = (key) => (e) => {
    const { value } = e.target;
    setDonation((d) => ({ ...d, [key]: value }));
    setDonationErrors((errs) => (errs[key] ? { ...errs, [key]: "" } : errs));
  };

  const saveDonation = async () => {
    const errors = validateDonationAccount(donation);
    setDonationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Please correct the highlighted donation account details.");
      return false;
    }

    setSaving(true);
    setError("");
    try {
      await masjidApi.put(`/${masjidId}/donation-account`, donation);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save donation account details.");
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
    fd.append("category", uploadCategory);
    setSaving(true);
    setError("");
    try {
      const { data } = await masjidApi.post(`/${masjidId}/photos`, fd);
      setPhotos((p) => [...p, ...data.photos]);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload photo(s).");
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
    setError("");
    try {
      await masjidApi.post(`/${masjidId}/submit`);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit for verification.");
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
          <h1>Your Masjid registration has been successfully submitted for verification.</h1>
          <p>Our team will review the details you provided. You can track the approval status any time from My Masjids.</p>
          <Link to="/account/masjids" className="btn btn-gold">Go to My Masjids <span className="btn-arrow">→</span></Link>
        </div>
      </main>
    );
  }

  if (readOnly) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg">
          <Link to="/account/masjids" className="msj-back-link"><Icon name="chevronLeft" size={16} /> Back to My Masjids</Link>
          <div className="section-head" style={{ marginTop: 16 }}>
            <span className="eyebrow">{form.name}</span>
            <h2>Registration Details</h2>
            <span className={`acct-status-pill ${status}`}>{STATUS_LABEL[status]}</span>
          </div>
          {adminFeedback && (
            <div className="msj-feedback-banner">
              <strong>{status === "rejected" ? "Reason for rejection" : "Admin feedback"}</strong>
              <p>{adminFeedback}</p>
            </div>
          )}
          <MasjidSummary form={form} donation={donation} photos={photos} emailVerified={emailVerified} mobileVerified={mobileVerified} />
        </div>
      </main>
    );
  }

  return (
    <main className="msj-page">
      <div className="wrap py-lg">
        <Link to="/account/masjids" className="msj-back-link"><Icon name="chevronLeft" size={16} /> Back to My Masjids</Link>

        <div className="section-head" style={{ marginTop: 16, marginBottom: 32 }}>
          <span className="eyebrow">Register Your Masjid</span>
          <h2>{form.name || "New Masjid Registration"}</h2>
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

        <div className={`card msj-step-card${step === 2 || step === 5 || step === 6 ? " msj-step-card-wide" : ""}`}>
          {step === 1 && (
            <>
              <h3>Basic Masjid Information</h3>
              <Field label="Masjid Name"><input value={form.name} onChange={setField("name")} placeholder="e.g. Al-Noor Masjid" /></Field>
              <Field label="Tagline / Short Description"><input value={form.tagline} onChange={setField("tagline")} placeholder="A brief line that captures your masjid" /></Field>
              <Field label="About the Masjid" hint={`${form.about.length} / ${ABOUT_MAX} characters`}>
                <textarea rows={5} maxLength={ABOUT_MAX} value={form.about} onChange={setField("about")} placeholder="Share the masjid's history, community, and mission" />
              </Field>
              <div className="msj-field-row">
                <Field label="Year Established (optional)" hint={yearError}>
                  <input value={form.yearEstablished} onChange={setYearField} placeholder="e.g. 1998" inputMode="numeric" maxLength={4} />
                </Field>
                <Field label="Masjid Category (optional)">
                  <select value={form.category} onChange={setField("category")}>
                    <option value="">Select a category</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3>Location &amp; Address</h3>
              <div className="msj-location-grid">
                <div>
                  <Field label="Address" hint="Search for the masjid by name or address — the fields below and the map pin fill in automatically.">
                    <AddressAutocomplete
                      value={form.address}
                      onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                      onResolved={applyResolvedAddress}
                      placeholder="e.g. Jama Masjid, Delhi"
                    />
                  </Field>
                  <div className="msj-field-row">
                    <Field label="Area / Locality"><input value={form.area} onChange={setField("area")} /></Field>
                    <Field label="City"><input value={form.city} onChange={setField("city")} /></Field>
                  </div>
                  <div className="msj-field-row">
                    <Field label="District"><input value={form.district} onChange={setField("district")} /></Field>
                    <Field label="State / Province"><input value={form.state} onChange={setField("state")} /></Field>
                  </div>
                  <div className="msj-field-row">
                    <Field label="Country"><input value={form.country} onChange={setField("country")} /></Field>
                    <Field label="Postal / ZIP Code"><input value={form.postalCode} onChange={setField("postalCode")} /></Field>
                  </div>
                </div>

                <LocationMap latitude={form.latitude} longitude={form.longitude} onPinMoved={applyPinLocation} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3>Contact &amp; Verification</h3>
              <Field label="Imam Name"><input value={form.imamName} onChange={setField("imamName")} /></Field>

              <VerifiableField
                label="Contact Mobile Number *"
                value={form.contactMobile}
                onChange={(e) => setField("contactMobile")({ target: { value: e.target.value.replace(/\D/g, "").slice(0, 10) } })}
                placeholder="10-digit mobile number"
                maxLength={10}
                verified={mobileVerified}
                sending={otpSending}
                onVerify={() => sendOtp("mobile")}
                hint="Required. Must be verified before you can submit."
              />
              <VerifiableField
                label="Email Address (optional)"
                value={form.contactEmail}
                onChange={setField("contactEmail")}
                placeholder="masjid@example.com"
                verified={emailVerified}
                sending={otpSending}
                onVerify={() => sendOtp("email")}
                hint="Optional — but if you add one, it must be verified too."
              />
            </>
          )}

          {step === 4 && (
            <>
              <h3>Donation Account Details</h3>
              <p className="msj-note" style={{ marginBottom: 20 }}>Kept private until an admin validates it. Not shown publicly.</p>
              <h4 className="msj-subhead">UPI Details</h4>
              <div className="msj-field-row">
                <Field label="UPI ID" error={donationErrors.upiId} hint="For example name@okhdfcbank or 9876543210@paytm.">
                  <input
                    value={donation.upiId || ""}
                    onChange={setDonationField("upiId")}
                    onBlur={() => setDonationErrors((e) => ({ ...e, upiId: validateUpiId(donation.upiId) }))}
                    placeholder="name@okhdfcbank"
                    autoComplete="off"
                  />
                </Field>
                <Field label="UPI Account Holder Name" error={donationErrors.upiAccountHolder}>
                  <input value={donation.upiAccountHolder || ""} onChange={setDonationField("upiAccountHolder")} />
                </Field>
              </div>
              <h4 className="msj-subhead">Bank Details</h4>
              <div className="msj-field-row">
                <Field label="Bank Name" error={donationErrors.bankName}>
                  <input value={donation.bankName || ""} onChange={setDonationField("bankName")} />
                </Field>
                <Field label="Account Holder Name" error={donationErrors.accountHolderName}>
                  <input value={donation.accountHolderName || ""} onChange={setDonationField("accountHolderName")} />
                </Field>
              </div>
              <div className="msj-field-row">
                <Field label="Account Number" error={donationErrors.accountNumber}>
                  <input
                    value={donation.accountNumber || ""}
                    onChange={(e) => setDonation((d) => ({ ...d, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 18) }))}
                    onBlur={() => setDonationErrors((e) => ({ ...e, accountNumber: validateAccountNumber(donation.accountNumber) }))}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Confirm Account Number" error={donationErrors.confirmAccountNumber}>
                  <input
                    value={donation.confirmAccountNumber || ""}
                    onChange={(e) => setDonation((d) => ({ ...d, confirmAccountNumber: e.target.value.replace(/\D/g, "").slice(0, 18) }))}
                    inputMode="numeric"
                    autoComplete="off"
                    onPaste={(e) => e.preventDefault()}
                  />
                </Field>
              </div>
              <div className="msj-field-row">
                <Field label="IFSC / Routing Code" error={donationErrors.ifscCode} hint="11 characters, for example HDFC0001234.">
                  <input
                    value={donation.ifscCode || ""}
                    onChange={(e) => setDonation((d) => ({ ...d, ifscCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11) }))}
                    onBlur={() => setDonationErrors((e) => ({ ...e, ifscCode: validateIfsc(donation.ifscCode) }))}
                    placeholder="HDFC0001234"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Branch Name (optional)">
                  <input value={donation.branchName || ""} onChange={setDonationField("branchName")} />
                </Field>
              </div>
            </>
          )}

          {step === 5 && (
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
              <div className="msj-photo-grid msj-photo-grid-lg">
                {photos.map((p, i) => (
                  <div className="msj-photo-card" key={p.id}>
                    <MediaThumb src={`http://localhost:5050${p.url}`} mediaType={p.mediaType} videoProps={{ controls: true }} />
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

          {step === 6 && (
            <>
              <h3>Review &amp; Submit</h3>
              <MasjidSummary form={form} donation={donation} photos={photos} emailVerified={emailVerified} mobileVerified={mobileVerified} onEdit={setStep} />
            </>
          )}

          <div className="msj-step-actions">
            <div>
              {step > 1 && <button className="btn btn-outline-ink" onClick={goBack} type="button"><Icon name="chevronLeft" size={16} /> Back</button>}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="btn btn-outline-ink" onClick={saveAsDraft} type="button" disabled={saving}>Save as Draft</button>
              {step === 4 && <button className="btn btn-outline-ink" onClick={async () => { const ok = await saveDonation(); if (ok) setStep(5); }} type="button" disabled={saving}>Next <span className="btn-arrow">→</span></button>}
              {step < STEPS.length && step !== 4 && <button className="btn btn-gold" onClick={goNext} type="button" disabled={saving}>{saving ? "Saving…" : "Next"} <span className="btn-arrow">→</span></button>}
              {step === STEPS.length && <button className="btn btn-gold" onClick={doSubmit} type="button" disabled={saving}>{saving ? "Submitting…" : "Submit for Verification"} <span className="btn-arrow">→</span></button>}
            </div>
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
    </main>
  );
}

function VerifiableField({ label, value, onChange, placeholder, maxLength, verified, sending, onVerify, hint, error }) {
  return (
    <div className={`auth-field msj-verifiable-field${error ? " has-error" : ""}`}>
      <label>{label}</label>
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

function MasjidSummary({ form, donation, photos, emailVerified, mobileVerified, onEdit }) {
  // A video can never be the cover (enforced server-side too) — a masjid
  // with only videos uploaded falls back to the branded placeholder instead
  // of silently rendering a video where a still image is expected.
  const cover = photos.find((p) => p.isCover) || photos.find((p) => p.mediaType !== "video");
  return (
    <div className="msj-summary">
      <MediaThumb src={cover ? `http://localhost:5050${cover.url}` : null} className="msj-summary-cover" />
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Basic Information</h4>{onEdit && <button type="button" onClick={() => onEdit(1)}>Edit</button>}</div>
        <p><strong>{form.name}</strong>{form.tagline && ` — ${form.tagline}`}</p>
        <p>{form.about}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Location</h4>{onEdit && <button type="button" onClick={() => onEdit(2)}>Edit</button>}</div>
        <p>{[form.address, form.area, form.city, form.district, form.state, form.country, form.postalCode].filter(Boolean).join(", ")}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Contact &amp; Verification</h4>{onEdit && <button type="button" onClick={() => onEdit(3)}>Edit</button>}</div>
        <p>Imam: {form.imamName || "—"}</p>
        <p>{form.contactEmail || "—"} {emailVerified && "(verified)"} · {form.contactMobile || "—"} {mobileVerified && "(verified)"}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Donation Account</h4>{onEdit && <button type="button" onClick={() => onEdit(4)}>Edit</button>}</div>
        <p>{donation?.bankName ? `${donation.bankName} · ${donation.accountHolderName || ""}` : "Not provided"}{donation?.upiId ? ` · UPI: ${donation.upiId}` : ""}</p>
      </div>
      <div className="msj-summary-block">
        <div className="msj-summary-head"><h4>Photographs</h4>{onEdit && <button type="button" onClick={() => onEdit(5)}>Edit</button>}</div>
        <div className="msj-photo-grid msj-photo-grid-lg">
          {photos.map((p) => (
            <MediaThumb key={p.id} src={`http://localhost:5050${p.url}`} mediaType={p.mediaType} className="msj-summary-thumb" videoProps={{ controls: true }} />
          ))}
          {photos.length === 0 && <p>No photographs uploaded.</p>}
        </div>
      </div>
    </div>
  );
}

export default MasjidWizard;
