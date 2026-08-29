import React, { useState } from "react";
import { Icon } from "../Icons.jsx";
import AddressAutocomplete from "../AddressAutocomplete.jsx";
import userApi from "../../services/userApi.js";

const GENDERS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const MARITAL_STATUSES = [
  { value: "", label: "Select" },
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "other", label: "Other / Prefer not to say" },
];

function PersonalDetailsCard({ user, onUserUpdated }) {
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    email: user.email || "",
    mobile: user.mobile || "",
    gender: user.gender || "",
    maritalStatus: user.maritalStatus || "",
    dateOfBirth: user.dateOfBirth || "",
  });
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

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
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
    setSaving(true);
    setErrors({});
    try {
      const { data } = await userApi.patch("/me", {
        fullName: form.fullName,
        email: form.email,
        mobile: form.mobile,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        dateOfBirth: form.dateOfBirth || null,
        location,
      });
      setEmailVerified(data.user.emailVerified);
      setMobileVerified(data.user.mobileVerified);
      onUserUpdated(data.user);
      showToast("Personal details updated successfully.");
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't save your details.";
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
      const { data } = await userApi.post("/me/verify/send-otp", { target });
      setDemoOtp(data.demoOtp || "");
      setOtpTarget(target);
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't send the verification code.";
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
        onUserUpdated(data.user);
      }
      setOtpTarget(null);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect code.");
    }
  };

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>Personal Details</h3>
      </div>

      <form onSubmit={save}>
        {errors.form && <div className="auth-alert" style={{ marginBottom: 18 }}><Icon name="info" size={17} />{errors.form}</div>}

        <div className="auth-field">
          <label>Full Name</label>
          <input value={form.fullName} onChange={(e) => { setForm((f) => ({ ...f, fullName: e.target.value })); setErrors((er) => ({ ...er, fullName: null })); }} />
          {errors.fullName && <span className="auth-field-error">{errors.fullName}</span>}
        </div>

        <div className="profile-field-grid">
          <div className="auth-field">
            <label>Gender</label>
            <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
              {GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
          <div className="auth-field">
            <label>Marital Status</label>
            <select value={form.maritalStatus} onChange={(e) => setForm((f) => ({ ...f, maritalStatus: e.target.value }))}>
              {MARITAL_STATUSES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="auth-field">
          <label>Date of Birth</label>
          <input type="date" value={form.dateOfBirth || ""} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
        </div>

        <div className="auth-field">
          <label>Current Location / Hometown</label>
          <AddressAutocomplete
            value={locationQuery}
            onChange={setLocationQuery}
            onResolved={onLocationResolved}
            placeholder="Search for your city…"
          />
        </div>

        <div className="auth-field msj-verifiable-field">
          <label>Email Address</label>
          <div className="msj-verifiable-row">
            <input value={form.email} onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setErrors((er) => ({ ...er, email: null })); }} placeholder="you@example.com" />
            {form.email && emailVerified ? (
              <span className="acct-status-pill active"><Icon name="check" size={13} /> Verified</span>
            ) : form.email ? (
              <button className="btn btn-outline-ink" type="button" disabled={otpSending} onClick={() => sendOtp("email")}>{otpSending ? "Sending…" : "Verify"}</button>
            ) : null}
          </div>
          {errors.email && <span className="auth-field-error">{errors.email}</span>}
        </div>

        <div className="auth-field msj-verifiable-field">
          <label>Mobile Number</label>
          <div className="msj-verifiable-row">
            <input
              value={form.mobile}
              onChange={(e) => { setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })); setErrors((er) => ({ ...er, mobile: null })); }}
              placeholder="10-digit mobile number"
              maxLength={10}
            />
            {form.mobile && mobileVerified ? (
              <span className="acct-status-pill active"><Icon name="check" size={13} /> Verified</span>
            ) : form.mobile ? (
              <button className="btn btn-outline-ink" type="button" disabled={otpSending} onClick={() => sendOtp("mobile")}>{otpSending ? "Sending…" : "Verify"}</button>
            ) : null}
          </div>
          {errors.mobile && <span className="auth-field-error">{errors.mobile}</span>}
        </div>

        <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>

      {otpTarget && (
        <div className="msj-modal-overlay" onClick={() => setOtpTarget(null)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setOtpTarget(null)} aria-label="Close"><Icon name="x" size={16} /></button>
            <h3>Verify {otpTarget === "email" ? "Email Address" : "Mobile Number"}</h3>
            <p className="msj-modal-sub">Enter the 6-digit code sent to {otpTarget === "email" ? form.email : form.mobile}.</p>
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

      {toast && <div className="acct-toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}

export default PersonalDetailsCard;
