import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import { API_ORIGIN } from "../../config.js";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import StaticLocationMap from "../../components/StaticLocationMap.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import AddressAutocomplete from "../../components/AddressAutocomplete.jsx";
import MicButton from "../../components/MicButton.jsx";
import { formatDateTime } from "../../utils/formatDateTime.js";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "basic", label: "Basic Information" },
  { key: "contact", label: "Contact & Verification" },
  { key: "photos", label: "Photographs" },
  { key: "donation", label: "Donation Account" },
];

const PHOTO_CATEGORIES = [
  { key: "community", label: "Community Activities" },
  { key: "exterior", label: "Exterior View" },
  { key: "facilities", label: "Facilities" },
  { key: "interior", label: "Interior View" },
  { key: "prayer_hall", label: "Prayer Hall" },
  { key: "other", label: "Other" },
];

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

// Consistent label + mandatory-red-* + red-error-below pattern for every
// editable field across the tabs below.
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

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function BasicInfoTab({ id, masjid, categories, onSaved }) {
  const [form, setForm] = useState({
    name: masjid.name || "", tagline: masjid.tagline || "", about: masjid.about || "",
    category: masjid.category || "",
    address: masjid.address || "", area: masjid.area || "", city: masjid.city || "",
    district: masjid.district || "", state: masjid.state || "", country: masjid.country || "",
    postalCode: masjid.postalCode || "", formattedAddress: masjid.formattedAddress || "",
    mapLink: masjid.mapLink || "", latitude: masjid.latitude != null ? Number(masjid.latitude) : null,
    longitude: masjid.longitude != null ? Number(masjid.longitude) : null,
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: null }));
  };

  // Google's address_components frequently omit informal house/flat/plot
  // numbers (e.g. "264/146") that don't map to a proper street_number
  // component — reconstructing the Address line from a selected suggestion
  // would silently drop exactly what the admin typed and already sees in
  // the box, so the Address field itself is left untouched here.
  const applyResolvedAddress = (fields) => {
    setForm((f) => ({
      ...f,
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

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { data } = await adminApi.patch(`/masjids/${id}`, form);
      onSaved(data.masjid);
    } catch (err) {
      const field = err.response?.data?.field;
      const message = err.response?.data?.message || "Couldn't save changes.";
      setErrors(field ? { [field]: message } : { form: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-card amx-panel" style={{ maxWidth: 720 }}>
      <div className="amx-panel-head"><h3>Basic Information</h3></div>
      {errors.form && <div className="amx-form-error" style={{ marginBottom: 16 }}><Icon name="info" size={16} />{errors.form}</div>}

      <AField label="Masjid Name" required error={errors.name}>
        <input value={form.name} onChange={setField("name")} maxLength={255} />
      </AField>
      <AField label="Tagline / Short Description" required error={errors.tagline}>
        <input value={form.tagline} onChange={setField("tagline")} maxLength={255} />
      </AField>
      <AField
        label="About the Masjid"
        required
        error={errors.about}
        labelExtra={<span className="pf-char-counter">{form.about.length}/5000</span>}
      >
        <div className="msj-about-wrap">
          <textarea rows={5} maxLength={5000} value={form.about} onChange={setField("about")} />
          <MicButton
            onTranscript={(text) => {
              setForm((f) => ({ ...f, about: text.slice(0, 5000) }));
              setErrors((er) => ({ ...er, about: null }));
            }}
            className="msj-about-mic"
          />
        </div>
      </AField>
      <AField label="Category" required error={errors.category}>
        <select value={form.category} onChange={setField("category")}>
          <option value="">Select a category</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </AField>

      <AField label="Address" required error={errors.address} hint={!errors.address ? "Search to auto-fill the rest of the location fields." : undefined}>
        <AddressAutocomplete
          value={form.address}
          onChange={(v) => setForm((f) => ({ ...f, address: v }))}
          onResolved={applyResolvedAddress}
          placeholder="Search for the masjid's address"
        />
      </AField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <AField label="City" required error={errors.city}><input value={form.city} onChange={setField("city")} /></AField>
        <AField label="State / Province" error={errors.state}><input value={form.state} onChange={setField("state")} /></AField>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <AField label="Country" required error={errors.country}><input value={form.country} onChange={setField("country")} /></AField>
        <AField label="Postal / ZIP Code" error={errors.postalCode}><input value={form.postalCode} onChange={setField("postalCode")} /></AField>
      </div>
      {form.latitude != null && <StaticLocationMap latitude={form.latitude} longitude={form.longitude} height={220} />}

      <button className="amx-btn amx-btn-accent" onClick={save} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

function ContactPersonAdminForm({ id, designations, contact, initialDesignation, lockDesignation, onCancel, onSaved, onRemoved, showToast }) {
  const isEdit = !!contact;
  const [designation, setDesignation] = useState(contact?.designation || initialDesignation || "");
  const [name, setName] = useState(contact?.name || "");
  const [mobile, setMobile] = useState(contact?.mobile || "");
  const [contactId, setContactId] = useState(contact?.id || null);
  const [verified, setVerified] = useState(contact?.verified || false);
  // Tracks the mobile value actually persisted server-side (not the initial
  // prop, which is null for a brand-new person) — comparing against the prop
  // would make mobileChanged permanently true for a new contact, since it
  // never had an "original" number to compare against, hiding the Verified
  // pill even right after a real OTP confirmation succeeds.
  const [savedMobile, setSavedMobile] = useState(contact?.mobile || null);
  const [saving, setSaving] = useState(false);
  // Keyed by field name so each message renders attached to the field it's
  // actually about; "form" covers anything not tied to one specific field.
  const [errors, setErrors] = useState({});

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [demoOtp, setDemoOtp] = useState("");

  // Same rule as the owner-facing wizard: a mobile number is only ever
  // marked verified through the real OTP round-trip below — never a manual
  // toggle, even for admin — and editing it back out invalidates the proof.
  const mobileChanged = mobile !== savedMobile;
  const effectiveVerified = verified && !mobileChanged;

  const persist = async () => {
    const nextErrors = {};
    if (!designation) nextErrors.designation = "Please select a designation.";
    if (!name.trim()) nextErrors.name = "Name is required.";
    if (!/^[6-9]\d{9}$/.test(mobile)) nextErrors.mobile = "Enter a valid 10-digit Indian mobile number.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return null;
    }
    setSaving(true);
    setErrors({});
    try {
      const payload = { designation, name: name.trim(), mobile };
      const { data } = contactId
        ? await adminApi.patch(`/masjids/${id}/contacts/${contactId}`, payload)
        : await adminApi.post(`/masjids/${id}/contacts`, payload);
      setContactId(data.contact.id);
      setVerified(data.contact.verified);
      setSavedMobile(data.contact.mobile);
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
      const { data } = await adminApi.post(`/masjids/${id}/contacts/${saved.id}/send-otp`);
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
      const { data } = await adminApi.post(`/masjids/${id}/contacts/${contactId}/send-otp`);
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
      const { data } = await adminApi.post(`/masjids/${id}/contacts/${contactId}/confirm-otp`, { otp: otpCode });
      setVerified(data.contact.verified);
      setOtpOpen(false);
      showToast("Mobile number verified.");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect code.");
    }
  };

  const done = async () => {
    const saved = await persist();
    if (saved) {
      onSaved(saved);
      showToast(isEdit ? "Contact person updated." : "Contact person added.");
    }
  };

  const remove = async () => {
    if (!contactId) return onCancel();
    setSaving(true);
    setErrors({});
    try {
      await adminApi.delete(`/masjids/${id}/contacts/${contactId}`);
      onRemoved(contactId);
      showToast("Contact person removed.");
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Couldn't remove this person." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-card amx-panel" style={{ maxWidth: 560 }}>
      <div className="amx-panel-head"><h3>{isEdit ? "Edit Contact Person" : "Add Contact Person"}</h3></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <AField
          label="Designation"
          required
          error={errors.designation}
          hint={lockDesignation ? "This is a required role for every masjid and can't be changed here." : undefined}
        >
          <select
            value={designation}
            onChange={(e) => { setDesignation(e.target.value); setErrors((er) => ({ ...er, designation: null })); }}
            disabled={lockDesignation}
          >
            <option value="">Select a designation</option>
            {designations.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </AField>
        <AField label="Name" required error={errors.name}>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors((er) => ({ ...er, name: null })); }}
            maxLength={255}
            placeholder="Full name"
          />
        </AField>
      </div>
      <AField
        label="Mobile Number"
        required
        error={errors.mobile}
        hint={effectiveVerified ? undefined : "Changing a verified number requires re-verification."}
      >
        <div className="msj-verifiable-row">
          <input
            value={mobile}
            onChange={(e) => { setMobile(e.target.value.replace(/\D/g, "").slice(0, 10)); setErrors((er) => ({ ...er, mobile: null })); }}
            maxLength={10}
          />
          {effectiveVerified ? (
            <span className="acct-status-pill active"><Icon name="check" size={13} /> Verified</span>
          ) : (
            <button className="amx-btn amx-btn-outline" type="button" disabled={!mobile || otpSending || saving} onClick={startVerify}>
              {otpSending ? "Sending…" : "Verify Mobile"}
            </button>
          )}
        </div>
      </AField>

      {errors.form && <div className="amx-field-error"><Icon name="info" size={14} />{errors.form}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button className="amx-btn amx-btn-accent" onClick={done} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="amx-btn amx-btn-outline" onClick={onCancel} disabled={saving}>Cancel</button>
        {isEdit && (
          <button className="amx-link-btn" style={{ marginLeft: "auto", color: "var(--a-danger)" }} onClick={remove} disabled={saving}>
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
            <div className="amx-form-group">
              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                maxLength={6}
                style={{ letterSpacing: "6px", textAlign: "center", fontSize: 20 }}
              />
            </div>
            {otpError && <span className="amx-field-error">{otpError}</span>}
            <button className="amx-btn amx-btn-accent" style={{ width: "100%", marginTop: 12 }} onClick={confirmVerify} type="button">Verify</button>
            <button className="msj-resend-link" type="button" onClick={resendOtp} disabled={otpSending}>{otpSending ? "Sending…" : "Resend code"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContactTab({ id, contacts, setContacts, designations, showToast }) {
  const [formTarget, setFormTarget] = useState(null); // null | "new" | contact | { designation }

  const requiredDesignations = designations.filter((d) => d.isRequired);
  const optionalContacts = contacts.filter((c) => !requiredDesignations.some((d) => d.name === c.designation));
  const verifiedCount = requiredDesignations.filter((d) => contacts.some((c) => c.designation === d.name && c.verified)).length;

  const upsert = (contact) => {
    setContacts((cs) => (cs.some((c) => c.id === contact.id) ? cs.map((c) => (c.id === contact.id ? contact : c)) : [...cs, contact]));
    setFormTarget(null);
  };
  const removed = (contactId) => {
    setContacts((cs) => cs.filter((c) => c.id !== contactId));
    setFormTarget(null);
  };

  if (formTarget) {
    const editing = formTarget !== "new" && formTarget.id ? formTarget : null;
    const prefill = formTarget !== "new" && !editing ? formTarget.designation : undefined;
    // A required designation's row always represents that specific role —
    // lock the dropdown so it can't be repurposed into a different role.
    // Optional people keep the designation freely choosable.
    const lockDesignation = requiredDesignations.some((d) => d.name === (editing?.designation ?? prefill));
    return (
      <ContactPersonAdminForm
        id={id}
        designations={designations}
        contact={editing}
        initialDesignation={prefill}
        lockDesignation={lockDesignation}
        onCancel={() => setFormTarget(null)}
        onSaved={upsert}
        onRemoved={removed}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Contact &amp; Verification</h3></div>

      <div style={{ background: "var(--a-bg)", border: "1px solid var(--a-border)", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
        <strong>Mandatory Verification: {verifiedCount} of {requiredDesignations.length} Completed</strong>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10 }}>
          {requiredDesignations.map((d) => {
            const c = contacts.find((c) => c.designation === d.name);
            const done = !!c?.verified;
            return (
              <span key={d.id} style={{ fontSize: 13, fontWeight: 600, color: done ? "var(--a-green-deep)" : "var(--a-warn)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name={done ? "check" : "info"} size={13} /> {d.name} — {done ? "Verified" : c ? "Not Verified" : "Not Added"}
              </span>
            );
          })}
        </div>
      </div>

      <div className="amx-table-wrap">
        <table className="amx-table">
          <thead><tr><th>Designation</th><th>Name</th><th>Mobile</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {requiredDesignations.map((d) => {
              const c = contacts.find((c) => c.designation === d.name);
              return (
                <tr key={d.id}>
                  <td style={{ whiteSpace: "nowrap" }}><strong>{d.name}</strong></td>
                  <td>{c?.name || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{c?.mobile || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <StatusBadge status={c?.verified ? "verified" : "pending"} label={c?.verified ? "Verified" : c ? "Not Verified" : "Required"} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => setFormTarget(c || { designation: d.name })}>{c ? "Edit" : "Add"}</button>
                  </td>
                </tr>
              );
            })}
            {optionalContacts.map((c) => (
              <tr key={c.id}>
                <td style={{ whiteSpace: "nowrap" }}><strong>{c.designation}</strong></td>
                <td>{c.name}</td>
                <td style={{ whiteSpace: "nowrap" }}>{c.mobile}</td>
                <td style={{ whiteSpace: "nowrap" }}><StatusBadge status={c.verified ? "verified" : "pending"} label={c.verified ? "Verified" : "Not Verified"} /></td>
                <td style={{ textAlign: "right" }}>
                  <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => setFormTarget(c)}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="amx-btn amx-btn-outline" style={{ marginTop: 16 }} onClick={() => setFormTarget("new")}>
        <Icon name="plus" size={15} /> Add More Person
      </button>
    </div>
  );
}

function PhotosTab({ id, photos, setPhotos, showToast }) {
  const [uploadCategory, setUploadCategory] = useState("exterior");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    fd.append("category", uploadCategory);
    setUploading(true);
    setError("");
    try {
      const { data } = await adminApi.post(`/masjids/${id}/photos`, fd);
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
    await adminApi.patch(`/masjids/${id}/photos/${photoId}`, { isCover: true });
    setPhotos((p) => p.map((ph) => ({ ...ph, isCover: ph.id === photoId })));
    showToast("Cover photo updated.");
  };
  const removePhoto = async (photoId) => {
    await adminApi.delete(`/masjids/${id}/photos/${photoId}`);
    setPhotos((p) => p.filter((ph) => ph.id !== photoId));
    showToast("Photo removed.");
  };
  const movePhoto = async (index, dir) => {
    const next = [...photos];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setPhotos(next);
    await Promise.all(next.map((ph, i) => adminApi.patch(`/masjids/${id}/photos/${ph.id}`, { sortOrder: i })));
  };

  return (
    <div className="amx-card amx-panel">
      <div className="amx-panel-head"><h3>Photographs</h3></div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <select className="amx-select" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
          {PHOTO_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <label className="amx-btn amx-btn-outline" style={{ cursor: "pointer" }}>
          <Icon name="upload" size={15} /> {uploading ? "Uploading…" : "Upload Photos or Videos"}
          <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden onChange={handleFiles} disabled={uploading} />
        </label>
      </div>
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

function DonationTab({ id, donationAccount, setDonationAccount, showToast }) {
  const [busy, setBusy] = useState(false);

  if (!donationAccount) {
    return (
      <div className="amx-card amx-panel">
        <div className="amx-panel-head"><h3>Donation Account</h3></div>
        <p>No donation account has been added for this masjid yet.</p>
      </div>
    );
  }

  const toggleVerified = async () => {
    setBusy(true);
    try {
      const { data } = await adminApi.post(`/masjids/${id}/donation-account/verify`, { verified: !donationAccount.verified });
      setDonationAccount(data.donationAccount);
      showToast(data.donationAccount.verified ? "Donation account verified." : "Donation account marked unverified.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't update verification.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="amx-card amx-panel" style={{ maxWidth: 560 }}>
      <div className="amx-panel-head" style={{ alignItems: "center" }}>
        <h3>Donation Account</h3>
        <StatusBadge status={donationAccount.verified ? "verified" : "pending"} label={donationAccount.verified ? "Verified" : "Not Verified"} />
      </div>
      {donationAccount.upiId && <Row label="UPI ID" value={donationAccount.upiId} />}
      {donationAccount.upiAccountHolder && <Row label="UPI Account Holder" value={donationAccount.upiAccountHolder} />}
      {donationAccount.bankName && <Row label="Bank" value={[donationAccount.bankName, donationAccount.branchName].filter(Boolean).join(", ")} />}
      {donationAccount.accountHolderName && <Row label="Account Holder" value={donationAccount.accountHolderName} />}
      {donationAccount.accountNumberMasked && <Row label="Account Number" value={donationAccount.accountNumberMasked} />}
      {donationAccount.ifscCode && <Row label="IFSC" value={donationAccount.ifscCode} />}
      <button
        className={`amx-btn ${donationAccount.verified ? "amx-btn-outline" : "amx-btn-accent"}`}
        onClick={toggleVerified}
        disabled={busy}
        style={{ marginTop: 12 }}
      >
        {busy ? "Please wait…" : donationAccount.verified ? "Mark as Unverified" : "Verify Donation Account"}
      </button>
    </div>
  );
}

function MasjidReview() {
  const { id, tab: tabParam } = useParams();
  const navigate = useNavigate();
  // Driven by the URL (not local state) so each tab has its own address and
  // a refresh — or a shared link — lands back on the same tab.
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : "overview";
  const goToTab = (key) => navigate(key === "overview" ? `/admin/masjids/${id}` : `/admin/masjids/${id}/${key}`, { replace: true });

  const [masjid, setMasjid] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [history, setHistory] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [donationAccount, setDonationAccount] = useState(null);
  const [categories, setCategories] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminApi.get(`/masjids/${id}`).then(({ data }) => {
      setMasjid(data.masjid);
      setPhotos(data.photos);
      setHistory(data.history);
      setContacts(data.contacts || []);
      setDonationAccount(data.donationAccount);
    });
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    adminApi.get("/masjid-categories").then(({ data }) => setCategories(data.categories)).catch(() => {});
    adminApi.get("/masjid-contact-designations").then(({ data }) => setDesignations(data.designations)).catch(() => {});
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

  if (!masjid) return <div className="amx-empty"><Icon name="mosque" /><strong>Loading…</strong></div>;

  const cover = photos.find((p) => p.isCover) || photos[0];
  const reviewable = ["submitted", "under_review", "changes_requested"].includes(masjid.status);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Trust &amp; Safety</span>
          <button className="amx-back-link" style={{ display: "block", marginTop: 8 }} onClick={() => navigate("/admin/masjids")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Masjid Management
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
            <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", flexShrink: 0 }}>
              <MediaThumb src={cover ? `${API_ORIGIN}${cover.url}` : null} mediaType={cover?.mediaType} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
                {masjid.name}
                <button className="amx-icon-action" title="Edit Basic Information" onClick={() => goToTab("basic")}><Icon name="edit" size={15} /></button>
              </h1>
              <p style={{ margin: "2px 0 0" }}>ID {masjid.id} · {masjid.category || "Uncategorized"} · {[masjid.city, masjid.country].filter(Boolean).join(", ") || "No location"}</p>
            </div>
          </div>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center", gap: 10 }}>
          {masjid.completion != null && (
            <span className="amx-badge amx-badge-neutral" title="Profile completion">
              <span className="amx-badge-dot" /> {masjid.completion}% Complete
            </span>
          )}
          <StatusBadge status={masjid.status} />
        </div>
      </div>

      {masjid.adminFeedback && (
        <div className="amx-alert-banner warn" style={{ marginBottom: 20 }}>
          <Icon name="info" size={16} /> Latest feedback sent to owner: {masjid.adminFeedback}
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
            <Section title="Basic Information">
              <Row label="Tagline" value={masjid.tagline} />
              <Row label="About" value={masjid.about} />
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
              {contacts.length === 0 ? (
                <p>No contact people added yet.</p>
              ) : (
                <div className="amx-table-wrap">
                  <table className="amx-table">
                    <thead>
                      <tr>
                        <th>Designation</th>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Status</th>
                        <th>Added</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((c) => (
                        <tr key={c.id}>
                          <td style={{ whiteSpace: "nowrap" }}><strong>{c.designation}</strong></td>
                          <td>{c.name}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{c.mobile}</td>
                          <td style={{ whiteSpace: "nowrap" }}><StatusBadge status={c.verified ? "verified" : "pending"} label={c.verified ? "Verified" : "Not Verified"} /></td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(c.createdAt)}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(c.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

            <Section title="Registration History">
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

          <div className="amx-card amx-panel amx-review-actions">
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
              <button className="amx-btn amx-btn-danger" style={{ width: "100%" }} disabled={busy} onClick={() => act(() => adminApi.post(`/masjids/${id}/deactivate`), "Masjid deactivated.")}>
                Deactivate
              </button>
            ) : masjid.status === "inactive" ? (
              <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} disabled={busy} onClick={() => act(() => adminApi.post(`/masjids/${id}/activate`), "Masjid reactivated.")}>
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
      )}

      {tab === "basic" && (
        <BasicInfoTab
          id={id}
          masjid={masjid}
          categories={categories}
          onSaved={(m) => { setMasjid(m); showToast("Basic information updated."); }}
        />
      )}

      {tab === "contact" && (
        <ContactTab id={id} contacts={contacts} setContacts={setContacts} designations={designations} showToast={showToast} />
      )}

      {tab === "photos" && (
        <PhotosTab id={id} photos={photos} setPhotos={setPhotos} showToast={showToast} />
      )}

      {tab === "donation" && (
        <DonationTab id={id} donationAccount={donationAccount} setDonationAccount={setDonationAccount} showToast={showToast} />
      )}

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
