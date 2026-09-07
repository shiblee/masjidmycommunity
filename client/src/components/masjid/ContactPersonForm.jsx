import React, { useState } from "react";
import { Icon } from "../Icons.jsx";
import masjidApi from "../../services/masjidApi.js";

// Extracted out of MasjidWizard.jsx (its original, still primary, caller) so
// other flows that need to add/verify a masjid contact person — e.g. the
// Green Tick wizard's "Add Someone Else" representative flow — can reuse the
// exact same name/designation/mobile form and OTP verification instead of
// duplicating it.
export const MOBILE_RE = /^[6-9]\d{9}$/;

export function Field({ label, children, hint, error, required, labelExtra }) {
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

export function ContactPersonForm({ masjidId, designations, contact, initialDesignation, lockDesignation, onCancel, onSaved, onRemoved }) {
  const isEdit = !!contact;
  const [designation, setDesignation] = useState(contact?.designation || initialDesignation || "");
  const [name, setName] = useState(contact?.name || "");
  const [mobile, setMobile] = useState(contact?.mobile || "");
  const [contactId, setContactId] = useState(contact?.id || null);
  const [verified, setVerified] = useState(contact?.verified || false);
  // Tracks the mobile value actually persisted server-side (not the initial
  // prop, which is null for a brand-new person) — comparing against the prop
  // would make mobileChanged permanently true for a new contact, hiding the
  // Verified pill even right after a real OTP confirmation succeeds.
  const [savedMobile, setSavedMobile] = useState(contact?.mobile || null);
  const [saving, setSaving] = useState(false);
  // True once a field changes after the last successful persist — lets Save
  // skip re-sending identical data (which, for a person just created and
  // verified in this same sitting, would needlessly turn into an update
  // call instead of a create, and an approved masjid's existing contacts
  // stay locked from updates on purpose).
  const [dirty, setDirty] = useState(false);
  // Keyed by field name ("designation"/"name"/"mobile") so each message
  // renders attached to the field it's actually about, matching the rest of
  // this form's error style — a "form" key covers anything that isn't
  // tied to one specific field.
  const [errors, setErrors] = useState({});

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  const mobileChanged = mobile !== savedMobile;
  const effectiveVerified = verified && !mobileChanged;

  const persist = async () => {
    const nextErrors = {};
    if (!designation) nextErrors.designation = "Please select a designation.";
    if (!name.trim()) nextErrors.name = "Name is required.";
    if (!MOBILE_RE.test(mobile)) nextErrors.mobile = "Enter a valid 10-digit Indian mobile number.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return null;
    }
    setSaving(true);
    setErrors({});
    try {
      const payload = { designation, name: name.trim(), mobile };
      const { data } = contactId
        ? await masjidApi.patch(`/${masjidId}/contacts/${contactId}`, payload)
        : await masjidApi.post(`/${masjidId}/contacts`, payload);
      setContactId(data.contact.id);
      setVerified(data.contact.verified);
      setSavedMobile(data.contact.mobile);
      setDirty(false);
      return data.contact;
    } catch (err) {
      const field = err.response?.data?.field;
      const message = err.response?.data?.message || "Couldn't save this person.";
      setErrors(field ? { [field]: message } : { form: message });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const startVerify = async () => {
    const saved = await persist();
    if (!saved) return;
    setOtpSending(true);
    setOtpError("");
    setOtpCode("");
    try {
      const { data } = await masjidApi.post(`/${masjidId}/contacts/${saved.id}/send-otp`);
      setDemoOtp(data.demoOtp || "");
      setOtpOpen(true);
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Couldn't send the verification code." });
    } finally {
      setOtpSending(false);
    }
  };

  const resendOtp = async () => {
    setOtpSending(true);
    setOtpError("");
    try {
      const { data } = await masjidApi.post(`/${masjidId}/contacts/${contactId}/send-otp`);
      setDemoOtp(data.demoOtp || "");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Couldn't resend the code.");
    } finally {
      setOtpSending(false);
    }
  };

  const confirmVerify = async () => {
    setOtpError("");
    try {
      const { data } = await masjidApi.post(`/${masjidId}/contacts/${contactId}/confirm-otp`, { otp: otpCode });
      setVerified(data.contact.verified);
      setOtpOpen(false);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect code.");
    }
  };

  const done = async () => {
    if (contactId && !dirty) {
      onSaved({ id: contactId, designation, name: name.trim(), mobile, verified });
      return;
    }
    const saved = await persist();
    if (saved) onSaved(saved);
  };

  const remove = async () => {
    if (!contactId) {
      onCancel();
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      await masjidApi.delete(`/${masjidId}/contacts/${contactId}`);
      onRemoved(contactId);
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Couldn't remove this person." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="msj-contact-form">
      <h4>{isEdit ? "Edit Contact Person" : "Add Contact Person"}</h4>
      <div className="msj-field-row">
        <Field
          label="Designation"
          required
          error={errors.designation}
          hint={lockDesignation ? "This is a required role for every masjid and can't be changed here." : undefined}
        >
          <select
            value={designation}
            onChange={(e) => { setDesignation(e.target.value); setDirty(true); setErrors((er) => ({ ...er, designation: null })); }}
            disabled={lockDesignation}
          >
            <option value="">Select a designation</option>
            {designations.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Name" required error={errors.name}>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setDirty(true); setErrors((er) => ({ ...er, name: null })); }}
            maxLength={255}
            placeholder="Full name"
          />
        </Field>
      </div>
      <Field
        label="Mobile Number"
        required
        error={errors.mobile}
        hint={effectiveVerified ? undefined : "Changing a verified number requires re-verification."}
      >
        <div className="msj-verifiable-row">
          <input
            value={mobile}
            onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setDirty(true); setErrors((er) => ({ ...er, mobile: null })); }}
            placeholder="10-digit mobile number"
            maxLength={10}
          />
          {effectiveVerified ? (
            <span className="acct-status-pill active"><Icon name="check" size={13} /> Verified</span>
          ) : (
            <button className="btn btn-outline-ink" type="button" disabled={!mobile || otpSending || saving} onClick={startVerify}>
              {otpSending ? "Sending…" : "Verify Mobile"}
            </button>
          )}
        </div>
      </Field>

      {errors.form && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{errors.form}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-gold" type="button" onClick={done} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="btn btn-outline-ink" type="button" onClick={onCancel} disabled={saving}>Cancel</button>
        {isEdit && (
          <button className="msj-resend-link" type="button" style={{ marginLeft: "auto", width: "auto" }} onClick={remove} disabled={saving}>
            Remove this person
          </button>
        )}
      </div>

      {otpOpen && (
        <div className="msj-modal-overlay" onClick={() => setOtpOpen(false)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setOtpOpen(false)} aria-label="Close"><Icon name="x" size={16} /></button>
            <h3>Verify Mobile Number</h3>
            <p className="msj-modal-sub">Enter the 6-digit code sent to {mobile}.</p>
            {demoOtp && <p className="msj-note">Demo mode — verification code: <strong>{demoOtp}</strong></p>}
            <div className="auth-field">
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" maxLength={6} style={{ letterSpacing: "6px", textAlign: "center", fontSize: 20 }} />
            </div>
            {otpError && <span className="auth-field-error">{otpError}</span>}
            <button className="btn btn-gold" style={{ width: "100%", marginTop: 12 }} onClick={confirmVerify} type="button">Verify</button>
            <button className="msj-resend-link" type="button" onClick={resendOtp} disabled={otpSending}>{otpSending ? "Sending…" : "Resend code"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
