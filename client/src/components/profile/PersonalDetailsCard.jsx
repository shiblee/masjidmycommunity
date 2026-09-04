import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../Icons.jsx";
import AddressAutocomplete from "../AddressAutocomplete.jsx";
import MicButton from "../MicButton.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";
import userApi from "../../services/userApi.js";
import adminApi from "../../admin/services/adminApi.js";

const GENDER_KEYS = [
  { value: "", key: "personal.genderPreferNotToSay", fallback: "Prefer not to say" },
  { value: "male", key: "personal.genderMale", fallback: "Male" },
  { value: "female", key: "personal.genderFemale", fallback: "Female" },
  { value: "other", key: "personal.genderOther", fallback: "Other" },
];

const BIO_MAX = 280;

const MONTH_KEYS = [
  { value: "01", key: "personal.month.january", fallback: "January" },
  { value: "02", key: "personal.month.february", fallback: "February" },
  { value: "03", key: "personal.month.march", fallback: "March" },
  { value: "04", key: "personal.month.april", fallback: "April" },
  { value: "05", key: "personal.month.may", fallback: "May" },
  { value: "06", key: "personal.month.june", fallback: "June" },
  { value: "07", key: "personal.month.july", fallback: "July" },
  { value: "08", key: "personal.month.august", fallback: "August" },
  { value: "09", key: "personal.month.september", fallback: "September" },
  { value: "10", key: "personal.month.october", fallback: "October" },
  { value: "11", key: "personal.month.november", fallback: "November" },
  { value: "12", key: "personal.month.december", fallback: "December" },
];
const CURRENT_YEAR = new Date().getFullYear();
const DOB_YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

function daysInMonth(month, year) {
  if (!month) return 31;
  return new Date(Number(year) || 2000, Number(month), 0).getDate();
}

function calcAge(day, month, year) {
  if (!day || !month || !year) return null;
  const today = new Date();
  const birth = new Date(Number(year), Number(month) - 1, Number(day));
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
}

function formatDob(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// A compact, custom listbox for Day/Month/Year — used instead of a native
// <select> because native pickers can flip open upward when there isn't
// room below (e.g. a 100-entry Year list near the bottom of the viewport).
// This one is always anchored to, and opens below, its own trigger, with a
// capped height so it scrolls internally instead of overflowing the page.
function DobSelect({ label, placeholder, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="pf-dob-field" ref={wrapRef}>
      <button
        type="button"
        className={`pf-dob-trigger${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className={selected ? "" : "pf-dob-placeholder"}>{selected ? selected.label : placeholder}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <ul className="pf-dob-panel" role="listbox" aria-label={label}>
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className={o.value === value ? "selected" : ""}
                role="option"
                aria-selected={o.value === value}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.label}
                {o.value === value && <Icon name="check" size={13} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The actual field-by-field editing form — deliberately free of any modal/
// card chrome, so it can be dropped straight into a full page (Profile.jsx's
// inline "Profile Details" section) or wrapped in a modal (EditModal, below,
// still used for the pencil-icon edit flow elsewhere). All the state, OTP
// verification flow, and save logic lives here once, in a single source of
// truth, regardless of which chrome wraps it.
//
// mode: "self" (owner editing their own profile, via /me + OTP verification),
// "admin" (admin editing on a user's behalf, via /admin/users/:id/profile —
// bypasses OTP since an admin is already a privileged actor).
export function PersonalDetailsForm({ user, mode, targetUserId, onSaved, onCancel }) {
  const isAdmin = mode === "admin";
  const client = isAdmin ? adminApi : userApi;
  const savePath = isAdmin ? `/users/${targetUserId}/profile` : "/me";
  const { t, language } = useTranslation();

  const [form, setForm] = useState({
    fullName: user.fullName || "",
    bio: user.bio || "",
    email: user.email || "",
    mobile: user.mobile || "",
    gender: user.gender || "",
    maritalStatus: user.maritalStatus || "",
    dateOfBirth: user.dateOfBirth || "",
  });
  const [maritalOptions, setMaritalOptions] = useState([]);
  useEffect(() => {
    const client = isAdmin ? adminApi : userApi;
    client
      .get(isAdmin ? "/marital-statuses" : "/meta/marital-statuses")
      .then(({ data }) => setMaritalOptions(data.statuses || []))
      .catch(() => {});
  }, [isAdmin]);

  const [dobYear, dobMonth, dobDay] = (user.dateOfBirth || "").split("-");
  const [dobDayVal, setDobDayVal] = useState(dobDay || "");
  const [dobMonthVal, setDobMonthVal] = useState(dobMonth || "");
  const [dobYearVal, setDobYearVal] = useState(dobYear || "");

  const applyDob = (day, month, year) => {
    setForm((f) => ({ ...f, dateOfBirth: day && month && year ? `${year}-${month}-${day}` : "" }));
  };

  const onDobDayChange = (v) => { setDobDayVal(v); applyDob(v, dobMonthVal, dobYearVal); };
  const onDobMonthChange = (v) => {
    setDobMonthVal(v);
    const maxDay = daysInMonth(v, dobYearVal);
    const day = dobDayVal && Number(dobDayVal) > maxDay ? String(maxDay).padStart(2, "0") : dobDayVal;
    setDobDayVal(day);
    applyDob(day, v, dobYearVal);
  };
  const onDobYearChange = (v) => {
    setDobYearVal(v);
    const maxDay = daysInMonth(dobMonthVal, v);
    const day = dobDayVal && Number(dobDayVal) > maxDay ? String(maxDay).padStart(2, "0") : dobDayVal;
    setDobDayVal(day);
    applyDob(day, dobMonthVal, v);
  };

  const [locationQuery, setLocationQuery] = useState(user.locationLabel || "");
  const [location, setLocation] = useState({
    label: user.locationLabel || "",
    city: user.locationCity || "",
    state: user.locationState || "",
    country: user.locationCountry || "",
    lat: user.locationLat ?? null,
    lng: user.locationLng ?? null,
  });

  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [mobileVerified, setMobileVerified] = useState(user.mobileVerified);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [otpTarget, setOtpTarget] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  const [bioGenerating, setBioGenerating] = useState(false);
  const [bioAiError, setBioAiError] = useState("");

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  const generateBioWithAi = async () => {
    setBioGenerating(true);
    setBioAiError("");
    try {
      const { data } = await client.post(isAdmin ? `/users/${targetUserId}/bio/generate` : "/me/bio/generate", { languageCode: language });
      setForm((f) => ({ ...f, bio: (data.bio || "").slice(0, BIO_MAX) }));
    } catch (err) {
      setBioAiError(err.response?.data?.message || t("personal.bioGenerateError", "Couldn't generate a bio right now. Please try again."));
    } finally {
      setBioGenerating(false);
    }
  };

  const fieldForMessage = (message) => {
    const m = (message || "").toLowerCase();
    if (m.includes("email")) return "email";
    if (m.includes("mobile")) return "mobile";
    if (m.includes("name")) return "fullName";
    return "form";
  };

  const onLocationResolved = (resolved) => {
    const label = resolved.formattedAddress || [resolved.city, resolved.state, resolved.country].filter(Boolean).join(", ");
    setLocationQuery(label);
    setLocation({
      label,
      city: resolved.city || "",
      state: resolved.state || "",
      country: resolved.country || "",
      lat: resolved.latitude ?? null,
      lng: resolved.longitude ?? null,
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setErrors({ fullName: t("personal.fullNameRequiredError", "Full name is required.") });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const { data } = await client.patch(savePath, {
        fullName: form.fullName,
        bio: form.bio,
        email: form.email,
        mobile: form.mobile,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        dateOfBirth: form.dateOfBirth || null,
        location,
      });
      setEmailVerified(data.user.emailVerified);
      setMobileVerified(data.user.mobileVerified);
      showToast(t("personal.detailsUpdated", "Personal details updated."));
      onSaved?.(data.user);
    } catch (err) {
      const message = err.response?.data?.message || t("personal.saveDetailsError", "Couldn't save these details. Please try again.");
      setErrors({ [fieldForMessage(message)]: message });
    } finally {
      setSaving(false);
    }
  };

  const sendOtp = async (target) => {
    setOtpSending(true);
    setErrors((er) => ({ ...er, [target]: null }));
    setOtpError("");
    setOtpCode("");
    try {
      const { data } = await userApi.post("/me/verify/send-otp", { target, value: target === "email" ? form.email : form.mobile });
      setDemoOtp(data.demoOtp || "");
      setOtpTarget(target);
    } catch (err) {
      const message = err.response?.data?.message || t("personal.sendOtpError", "Couldn't send the verification code.");
      setErrors((er) => ({ ...er, [target]: message }));
    } finally {
      setOtpSending(false);
    }
  };

  const confirmOtp = async () => {
    setOtpError("");
    try {
      const { data } = await userApi.post("/verify-otp", { userId: user.id, otp: otpCode });
      if (data.user) {
        setEmailVerified(data.user.emailVerified);
        setMobileVerified(data.user.mobileVerified);
        setForm((f) => ({ ...f, email: data.user.email, mobile: data.user.mobile }));
      }
      showToast(otpTarget === "mobile" ? t("personal.mobileVerifiedToast", "Mobile number verified.") : t("personal.emailVerifiedToast", "Email address verified."));
      setOtpTarget(null);
    } catch (err) {
      setOtpError(err.response?.data?.message || t("personal.incorrectCode", "Incorrect code."));
    }
  };

  const dobAge = calcAge(dobDayVal, dobMonthVal, dobYearVal);

  return (
    <>
      <form onSubmit={save} noValidate>
        {errors.form && <div className="auth-alert" style={{ marginBottom: 18 }}><Icon name="bulb" size={17} />{errors.form}</div>}

        <div className="pf-form-section">
          <h4 className="pf-form-section-title">{t("personal.basicInformation", "Basic Information")}</h4>

          <div className="auth-field">
            <label>{t("personal.fullName", "Full Name")} <span className="pf-required">*</span></label>
            <input
              value={form.fullName}
              onChange={(e) => { setForm((f) => ({ ...f, fullName: e.target.value })); setErrors((er) => ({ ...er, fullName: null })); }}
              placeholder={t("personal.fullNamePlaceholder", "Your full name")}
              aria-required="true"
            />
            {errors.fullName && <span className="auth-field-error">{errors.fullName}</span>}
          </div>

          <div className="auth-field">
            <div className="pf-field-label-row pf-bio-label-row">
              <div className="pf-bio-label-group">
                <label>{t("personal.aboutBio", "About / Bio")}</label>
                <button type="button" className="pf-ai-bio-btn" onClick={generateBioWithAi} disabled={bioGenerating}>
                  {bioGenerating ? <span className="mic-btn-spinner" /> : <Icon name="sparkle" size={13} />}
                  {bioGenerating ? t("personal.generatingBio", "Generating…") : t("personal.generateBioWithAi", "Generate Bio with AI")}
                </button>
              </div>
              <span className="pf-char-counter">{form.bio.length}/{BIO_MAX}</span>
            </div>
            <div className="pf-bio-wrap">
              <textarea
                rows={3}
                maxLength={BIO_MAX}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder={t("personal.bioPlaceholder", "A short line about yourself…")}
              />
              <MicButton
                onTranscript={(text) => setForm((f) => ({ ...f, bio: text.slice(0, BIO_MAX) }))}
                className="pf-bio-mic"
              />
            </div>
            {bioAiError && <span className="auth-field-error">{bioAiError}</span>}
          </div>
        </div>

        <div className="pf-form-section">
          <h4 className="pf-form-section-title">{t("personal.personalInformation", "Personal Information")}</h4>

          <div className="auth-field">
            <label>{t("personal.gender", "Gender")}</label>
            <div className="pf-radio-group" role="radiogroup" aria-label={t("personal.gender", "Gender")}>
              {GENDER_KEYS.map((g) => (
                <label key={g.value} className={`pf-radio-option${form.gender === g.value ? " selected" : ""}`}>
                  <input
                    type="radio"
                    name="gender"
                    value={g.value}
                    checked={form.gender === g.value}
                    onChange={() => setForm((f) => ({ ...f, gender: g.value }))}
                    className="pf-radio-input"
                  />
                  <span className="pf-radio-dot" aria-hidden="true" />
                  {t(g.key, g.fallback)}
                </label>
              ))}
            </div>
          </div>

          <div className="profile-field-grid">
            <div className="auth-field">
              <label>{t("personal.maritalStatus", "Marital Status")}</label>
              <select value={form.maritalStatus} onChange={(e) => setForm((f) => ({ ...f, maritalStatus: e.target.value }))}>
                <option value="">{t("personal.select", "Select")}</option>
                {maritalOptions.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                {form.maritalStatus && !maritalOptions.some((m) => m.name === form.maritalStatus) && (
                  <option value={form.maritalStatus}>{form.maritalStatus}</option>
                )}
              </select>
            </div>
            <div className="auth-field">
              <div className="pf-field-label-row">
                <label>{t("personal.dateOfBirth", "Date of Birth")}</label>
                {dobAge !== null && <span className="pf-age-badge">{dobAge} {dobAge === 1 ? t("personal.yearOld", "year") : t("personal.yearsOld", "years")} old</span>}
              </div>
              <div className="pf-dob-row">
                <DobSelect
                  label={t("personal.day", "Day")}
                  placeholder={t("personal.day", "Day")}
                  value={dobDayVal}
                  onChange={onDobDayChange}
                  options={Array.from({ length: daysInMonth(dobMonthVal, dobYearVal) }, (_, i) => {
                    const d = String(i + 1).padStart(2, "0");
                    return { value: d, label: d };
                  })}
                />
                <DobSelect
                  label={t("personal.month", "Month")}
                  placeholder={t("personal.month", "Month")}
                  value={dobMonthVal}
                  onChange={onDobMonthChange}
                  options={MONTH_KEYS.map((m) => ({ value: m.value, label: t(m.key, m.fallback) }))}
                />
                <DobSelect
                  label={t("personal.year", "Year")}
                  placeholder={t("personal.year", "Year")}
                  value={dobYearVal}
                  onChange={onDobYearChange}
                  options={DOB_YEARS.map((y) => ({ value: String(y), label: String(y) }))}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pf-form-section">
          <h4 className="pf-form-section-title">{t("personal.location", "Location")}</h4>
          <div className="auth-field">
            <label>{t("personal.currentLocationHometown", "Current Location / Hometown")}</label>
            <AddressAutocomplete value={locationQuery} onChange={setLocationQuery} onResolved={onLocationResolved} placeholder={t("personal.searchForCity", "Search for your city…")} />
          </div>
        </div>

        <div className="pf-form-section pf-form-section-last">
          <h4 className="pf-form-section-title">{t("personal.contactInformation", "Contact Information")}</h4>

          <div className="auth-field msj-verifiable-field">
            <label>{t("personal.emailAddress", "Email Address")}</label>
            <div className="msj-verifiable-row">
              <input value={form.email} onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors((er) => ({ ...er, email: null })); }} placeholder={t("personal.emailPlaceholder", "you@example.com")} />
              {isAdmin ? (
                form.email && (
                  <span className={`acct-status-pill${emailVerified ? " active" : " pending_verification"}`}>
                    {emailVerified && <Icon name="check" size={13} />} {emailVerified ? t("personal.verified", "Verified") : t("personal.notVerified", "Not Verified")}
                  </span>
                )
              ) : form.email && emailVerified ? (
                <span className="acct-status-pill active"><Icon name="check" size={13} /> {t("personal.verified", "Verified")}</span>
              ) : form.email ? (
                <button className="btn btn-outline-ink" type="button" disabled={otpSending} onClick={() => sendOtp("email")}>{otpSending ? t("personal.sending", "Sending…") : t("personal.verify", "Verify")}</button>
              ) : null}
            </div>
            {errors.email && <span className="auth-field-error">{errors.email}</span>}
            {isAdmin && form.email !== (user.email || "") && (
              <span className="msj-note">{t("personal.emailChangeNote", "Changing this resets the account's email verification — the member will need to re-verify.")}</span>
            )}
          </div>

          <div className="auth-field msj-verifiable-field">
            <label>{t("personal.mobileNumber", "Mobile Number")}</label>
            <div className="msj-verifiable-row">
              <input
                value={form.mobile}
                onChange={(e) => { setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })); setErrors((er) => ({ ...er, mobile: null })); }}
                placeholder={t("personal.mobilePlaceholder", "10-digit mobile number")}
                maxLength={10}
              />
              {isAdmin ? (
                form.mobile && (
                  <span className={`acct-status-pill${mobileVerified ? " active" : " pending_verification"}`}>
                    {mobileVerified && <Icon name="check" size={13} />} {mobileVerified ? t("personal.verified", "Verified") : t("personal.notVerified", "Not Verified")}
                  </span>
                )
              ) : form.mobile && mobileVerified ? (
                <span className="acct-status-pill active"><Icon name="check" size={13} /> {t("personal.verified", "Verified")}</span>
              ) : form.mobile ? (
                <button className="btn btn-outline-ink" type="button" disabled={otpSending} onClick={() => sendOtp("mobile")}>{otpSending ? t("personal.sending", "Sending…") : t("personal.verify", "Verify")}</button>
              ) : null}
            </div>
            {errors.mobile && <span className="auth-field-error">{errors.mobile}</span>}
            {isAdmin && form.mobile !== (user.mobile || "") && (
              <span className="msj-note">{t("personal.mobileChangeNote", "Changing this resets the account's mobile verification — the member will need to re-verify.")}</span>
            )}
          </div>
        </div>

        <div className="pf-form-actions">
          <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? t("personal.saving", "Saving…") : t("personal.saveChanges", "Save Changes")}</button>
          {onCancel && <button type="button" className="btn btn-outline-ink" onClick={onCancel} disabled={saving}>{t("personal.cancel", "Cancel")}</button>}
        </div>
      </form>

      {otpTarget && !isAdmin && (
        <div className="msj-modal-overlay" onClick={() => setOtpTarget(null)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setOtpTarget(null)} aria-label="Close"><Icon name="x" size={16} /></button>
            <h3>{otpTarget === "email" ? t("personal.verifyEmailAddress", "Verify Email Address") : t("personal.verifyMobileNumber", "Verify Mobile Number")}</h3>
            <p className="msj-modal-sub">{t("personal.enterCodeSentTo", "Enter the 6-digit code sent to")} {otpTarget === "email" ? form.email : form.mobile}.</p>
            {demoOtp && <p className="msj-note">{t("personal.demoModeCode", "Demo mode — verification code:")} <strong>{demoOtp}</strong></p>}
            <div className="auth-field">
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t("personal.sixDigitCode", "6-digit code")} maxLength={6} style={{ letterSpacing: "6px", textAlign: "center", fontSize: 20 }} />
            </div>
            {otpError && <span className="auth-field-error">{otpError}</span>}
            <button className="btn btn-gold" style={{ width: "100%", marginTop: 12 }} onClick={confirmOtp} type="button">{t("personal.verify", "Verify")}</button>
            <button className="msj-resend-link" type="button" onClick={() => sendOtp(otpTarget)}>{t("personal.resendCode", "Resend code")}</button>
          </div>
        </div>
      )}

      {toast && <div className="acct-toast"><Icon name="check" size={16} />{toast}</div>}
    </>
  );
}

function EditModal({ user, mode, targetUserId, onCancel, onSaved }) {
  const { t } = useTranslation();
  return (
    <div className="msj-modal-overlay" onClick={onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>{t("personal.editPersonalDetails", "Edit Personal Details")}</h3>
        <PersonalDetailsForm user={user} mode={mode} targetUserId={targetUserId} onSaved={onSaved} />
      </div>
    </div>
  );
}

function PersonalDetailsCard({ user, mode = "self", targetUserId, onUserUpdated }) {
  const { t } = useTranslation();
  const editable = mode !== "view";
  const [editing, setEditing] = useState(false);

  const handleSaved = (updatedUser) => {
    setEditing(false);
    onUserUpdated?.(updatedUser);
  };

  // Private fields (email/mobile/gender/maritalStatus/dateOfBirth) are only
  // ever present in the payload for the owner or an admin viewer — the
  // public endpoint omits them entirely for anyone else, so their mere
  // presence here is what gates this block, not a separate permission check.
  const hasPrivate = user.email !== undefined || user.mobile !== undefined || user.gender !== undefined;

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>{t("personal.personalDetails", "Personal Details")}</h3>
        {editable && (
          <button type="button" className="profile-icon-btn" aria-label={t("personal.editPersonalDetails", "Edit personal details")} onClick={() => setEditing(true)}>
            <Icon name="edit" size={15} />
          </button>
        )}
      </div>

      <div className="profile-display-block">
        {user.bio ? (
          <p className="profile-bio-text">{user.bio}</p>
        ) : editable ? (
          <button type="button" className="profile-empty-prompt" onClick={() => setEditing(true)}>
            <Icon name="plus" size={14} /> {t("personal.addShortBio", "Add a short bio")}
          </button>
        ) : null}

        {user.locationLabel && (
          <div className="profile-meta-row"><Icon name="mapPin" size={15} />{user.locationLabel}</div>
        )}

        {hasPrivate && (user.gender || user.maritalStatus || user.dateOfBirth || user.email || user.mobile) && (
          <div className="profile-detail-grid">
            {user.gender && (
              <div><span>{t("personal.gender", "Gender")}</span><strong>{(() => { const g = GENDER_KEYS.find((k) => k.value === user.gender); return g ? t(g.key, g.fallback) : user.gender; })()}</strong></div>
            )}
            {user.maritalStatus && (
              <div><span>{t("personal.maritalStatus", "Marital Status")}</span><strong>{user.maritalStatus}</strong></div>
            )}
            {user.dateOfBirth && (
              <div><span>{t("personal.dateOfBirth", "Date of Birth")}</span><strong>{formatDob(user.dateOfBirth)}</strong></div>
            )}
            {user.email && (
              <div>
                <span>{t("personal.email", "Email")}</span>
                <strong>{user.email} {user.emailVerified && <Icon name="check" size={13} />}</strong>
              </div>
            )}
            {user.mobile && (
              <div>
                <span>{t("personal.mobile", "Mobile")}</span>
                <strong>{user.mobile} {user.mobileVerified && <Icon name="check" size={13} />}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && <EditModal user={user} mode={mode} targetUserId={targetUserId} onCancel={() => setEditing(false)} onSaved={handleSaved} />}
    </div>
  );
}

export default PersonalDetailsCard;
