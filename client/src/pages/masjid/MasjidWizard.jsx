import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { Icon } from "../../components/Icons.jsx";
import masjidApi from "../../services/masjidApi.js";
import AddressAutocomplete from "../../components/AddressAutocomplete.jsx";
import LocationMap from "../../components/LocationMap.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import MicButton from "../../components/MicButton.jsx";
import PrayerRosterSection from "./PrayerRosterSection.jsx";
import EngagementRow from "../../components/masjid/EngagementRow.jsx";
import { WizardShell, WizardStepper } from "../../components/wizard/WizardShell.jsx";
import { ContactPersonForm, Field } from "../../components/masjid/ContactPersonForm.jsx";

// Must match server/src/utils/contentModeration.js's RESTRICTED_CONTENT_MESSAGE
// exactly — used to tell "this field is currently flagged" apart from any
// other kind of field error when clearing a stale restricted-content flag.
const RESTRICTED_CONTENT_MESSAGE = "This content contains restricted or inappropriate language. Please modify the content and try again.";

const STEPS = [
  { key: "basic", label: "Basic Info", icon: "mosque" },
  { key: "contact", label: "Contact & Verification", icon: "shieldCheck" },
  { key: "photos", label: "Photos & Media", icon: "camera" },
  { key: "review", label: "Review & Submit", icon: "sparkle" },
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
    formattedAddress: "", latitude: null, longitude: null, placeId: "",
  };
}

const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", approved: "Approved", rejected: "Rejected", inactive: "Inactive", deleted: "Deleted",
};

function ContactPeopleSection({ masjidId, contacts, setContacts, designations }) {
  const [formTarget, setFormTarget] = useState(null); // null | "new" | contact object | { designation } prefill
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // contact pending a delete confirmation
  const [deleteError, setDeleteError] = useState("");

  const requiredDesignations = designations.filter((d) => d.isRequired);
  // Only these — the designations an admin hasn't marked mandatory — are
  // "subjective" entries the masjid added on its own; a required role
  // (Imam/Mutawalli/Secretary by default) can be edited but never deleted
  // outright, since the wizard always needs a row to add/verify that role.
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

  const confirmDelete = async () => {
    const contact = deleteConfirm;
    if (!contact) return;
    setDeletingId(contact.id);
    setDeleteError("");
    try {
      await masjidApi.delete(`/${masjidId}/contacts/${contact.id}`);
      setContacts((cs) => cs.filter((c) => c.id !== contact.id));
      setDeleteConfirm(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Couldn't remove this person.");
    } finally {
      setDeletingId(null);
    }
  };

  if (formTarget) {
    const editing = formTarget !== "new" && formTarget.id ? formTarget : null;
    const prefill = formTarget !== "new" && !editing ? formTarget.designation : undefined;
    // A required designation's row always represents that specific role
    // (Imam, Mutawalli, Secretary, ...) — the dropdown is locked so it can't
    // be repurposed into a different role out from under that requirement.
    // Adding/editing an optional person keeps the designation freely
    // choosable, since those roles are the masjid's own to define.
    const lockDesignation = requiredDesignations.some((d) => d.name === (editing?.designation ?? prefill));
    return (
      <ContactPersonForm
        masjidId={masjidId}
        designations={designations}
        contact={editing}
        initialDesignation={prefill}
        lockDesignation={lockDesignation}
        onCancel={() => setFormTarget(null)}
        onSaved={upsert}
        onRemoved={removed}
      />
    );
  }

  return (
    <>
      <div className="msj-contact-progress">
        <div className="msj-contact-progress-top">
          <strong>Mandatory Verification: {verifiedCount} of {requiredDesignations.length} Completed</strong>
          <div className="msj-contact-progress-bar">
            <div className="msj-contact-progress-fill" style={{ width: `${requiredDesignations.length ? (verifiedCount / requiredDesignations.length) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="msj-contact-checklist">
          {requiredDesignations.map((d) => {
            const c = contacts.find((c) => c.designation === d.name);
            const isDone = !!c?.verified;
            return (
              <span key={d.id} className={`msj-contact-check-item ${isDone ? "done" : "pending"}`}>
                <Icon name={isDone ? "check" : "info"} size={14} />
                {d.name} — {isDone ? "Verified" : c ? "Verification Required" : "Not Added"}
              </span>
            );
          })}
        </div>
      </div>

      <p className="msj-note" style={{ marginBottom: 16 }}>
        Please add the key people responsible for this masjid. At least an Imam, Mutawalli, and Secretary must be added and their mobile numbers verified.
      </p>

      <div className="msj-contact-table-wrap">
        <table className="msj-contact-table">
          <thead>
            <tr><th>Designation</th><th>Name</th><th>Mobile</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {requiredDesignations.map((d) => {
              const c = contacts.find((c) => c.designation === d.name);
              return (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td className={c ? "" : "msj-contact-muted"}>{c?.name || "—"}</td>
                  <td className={c ? "" : "msj-contact-muted"}>{c?.mobile || "—"}</td>
                  <td>
                    {c?.verified ? (
                      <span className="acct-status-pill active"><Icon name="check" size={12} /> Verified</span>
                    ) : (
                      <span className="acct-status-pill changes_requested"><Icon name="info" size={12} /> {c ? "Not Verified" : "Required"}</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" className="btn btn-outline-ink" onClick={() => setFormTarget(c || { designation: d.name })}>
                      {c ? "Edit" : "Add"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {optionalContacts.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.designation}</strong></td>
                <td>{c.name}</td>
                <td>{c.mobile}</td>
                <td>
                  {c.verified ? (
                    <span className="acct-status-pill active"><Icon name="check" size={12} /> Verified</span>
                  ) : (
                    <span className="acct-status-pill changes_requested"><Icon name="info" size={12} /> Not Verified</span>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" className="btn btn-outline-ink" onClick={() => setFormTarget(c)}>Edit</button>
                    <button
                      type="button"
                      className="msj-icon-btn-danger"
                      title="Remove this person"
                      aria-label={`Remove ${c.name}`}
                      onClick={() => setDeleteConfirm(c)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="btn btn-outline-ink" onClick={() => setFormTarget("new")}>
        <Icon name="plus" size={16} /> Add More Person
      </button>

      {deleteConfirm && (
        <div className="msj-modal-overlay" onClick={() => (deletingId ? null : setDeleteConfirm(null))}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setDeleteConfirm(null)} aria-label="Close" disabled={!!deletingId}>
              <Icon name="x" size={16} />
            </button>
            <h3>Remove {deleteConfirm.name}?</h3>
            <p className="msj-modal-sub">
              This removes {deleteConfirm.name} ({deleteConfirm.designation}) from this masjid's contact people. This can't be undone —
              you can always add them back later.
            </p>
            {deleteError && <span className="auth-field-error">{deleteError}</span>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="btn btn-outline-ink" style={{ flex: 1 }} type="button" onClick={() => setDeleteConfirm(null)} disabled={!!deletingId}>
                Cancel
              </button>
              <button className="btn btn-gold" style={{ flex: 1 }} type="button" onClick={confirmDelete} disabled={!!deletingId}>
                {deletingId ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
  const [engagement, setEngagement] = useState(null);
  const [greenTick, setGreenTick] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [categories, setCategories] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [uploadCategory, setUploadCategory] = useState("exterior");
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(!!id);
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

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
    axios
      .get(`${API_BASE}/masjids/public/contact-designations`)
      .then(({ data }) => setDesignations(data.designations || []))
      .catch(() => {});
  }, []);

  // `overwriteAddress` defaults to false: when a search suggestion is
  // picked, Google's own address_components frequently omit informal
  // house/flat/plot numbers (e.g. "264/146") that don't map to a proper
  // street_number component — reconstructing the Address line from them
  // would silently drop exactly what the user typed and already sees in
  // the box. Only the map-pin-drag flow (nothing was ever typed there)
  // opts in to overwriting it.
  const applyResolvedAddress = (fields, { overwriteAddress = false } = {}) => {
    setForm((f) => ({
      ...f,
      address: overwriteAddress ? fields.address || f.address : f.address,
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
      placeId: fields.placeId || f.placeId,
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
      setContacts([]);
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
        setEngagement({ id: m.id, likeCount: m.likeCount, likedByMe: m.likedByMe, avgRating: m.avgRating, reviewCount: m.reviewCount });
        setGreenTick({ status: m.greenTickStatus, verificationId: m.verificationId, isGreenTick: m.isGreenTick });
        setForm({
          name: m.name || "", tagline: m.tagline || "", about: m.about || "", category: m.category || "",
          address: m.address || "", area: m.area || "", city: m.city || "", district: m.district || "", state: m.state || "", country: m.country || "",
          postalCode: m.postalCode || "", mapLink: m.mapLink || "",
          formattedAddress: m.formattedAddress || "",
          latitude: m.latitude != null ? Number(m.latitude) : null,
          longitude: m.longitude != null ? Number(m.longitude) : null,
          placeId: m.placeId || "",
        });
        setContacts(m.contacts || []);
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

  // Real-time restricted-word check (Meta → Review Restricted Words) —
  // debounced so it fires once typing pauses, not on every keystroke. The
  // same check runs again server-side on save/submit regardless, so this is
  // purely an early-feedback nicety, not the actual enforcement point.
  useEffect(() => {
    if (!form.name && !form.tagline && !form.about) return undefined;
    const t = setTimeout(() => {
      masjidApi
        .post("/check-content", { name: form.name, tagline: form.tagline, about: form.about })
        .then(({ data }) => {
          setErrors((er) => {
            const next = { ...er };
            ["name", "tagline", "about"].forEach((k) => {
              if (data.field === k) next[k] = data.message;
              else if (er[k] === RESTRICTED_CONTENT_MESSAGE) next[k] = null;
            });
            return next;
          });
        })
        .catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [form.name, form.tagline, form.about]);

  const missingMandatoryContacts = () =>
    designations
      .filter((d) => d.isRequired)
      .filter((d) => !contacts.some((c) => c.designation === d.name && c.verified));

  const validateStep = () => {
    if (step === 1) {
      const flaggedField = ["name", "tagline", "about"].find((k) => errors[k] === RESTRICTED_CONTENT_MESSAGE);
      if (flaggedField) return false;

      const requiredFields = {
        name: "Masjid Name",
        tagline: "Tagline / Short Description",
        category: "Masjid Category",
        about: "About the Masjid",
        address: "Address",
      };
      const missing = {};
      for (const [key, label] of Object.entries(requiredFields)) {
        if (!form[key]?.trim()) missing[key] = `${label} is required.`;
      }
      if (Object.keys(missing).length) {
        setErrors((er) => ({ ...er, ...missing }));
        return false;
      }
    }
    if (step === 2) {
      const missing = missingMandatoryContacts();
      if (missing.length) {
        setErrors({
          form: `Masjid verification cannot continue. Please add and verify the mobile number${missing.length > 1 ? "s" : ""} of the ${missing.map((d) => d.name).join(", ")}.`,
        });
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

  const onDropFiles = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles({ target: { files: e.dataTransfer.files } });
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
        <div className="msj-wizard-center">
          <div className="section-head" style={{ marginTop: 16, maxWidth: "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <span className="eyebrow">{form.name}</span>
              <span className={`acct-status-pill ${status}`}>{STATUS_LABEL[status]}</span>
            </div>
            <h2>Registration Details</h2>
            {status === "approved" && engagement && (
              <EngagementRow masjid={engagement} variant="detail" className="msj-wizard-engagement" />
            )}
          </div>
          {adminFeedback && (
            <div className="msj-feedback-banner">
              <strong>{status === "rejected" ? "Reason for rejection" : "Admin feedback"}</strong>
              <p>{adminFeedback}</p>
            </div>
          )}
          <MasjidSummary form={form} photos={photos} contacts={contacts} />
          <PrayerRosterSection basePath={`/${masjidId}`} api={masjidApi} />

          {status === "approved" && greenTick && (
            <div className="card msj-greentick-cta">
              {greenTick.isGreenTick ? (
                <>
                  <div className="msj-greentick-cta-icon"><Icon name="shieldCheck" size={22} /></div>
                  <div>
                    <h4>Green Tick Issued</h4>
                    <p className="amx-panel-sub">Verification ID: {greenTick.verificationId}</p>
                  </div>
                  <Link to={`/account/my-masjids/${masjidId}/green-tick`} className="btn btn-outline-ink">View Application</Link>
                </>
              ) : (
                <>
                  <div className="msj-greentick-cta-icon"><Icon name="shieldCheck" size={22} /></div>
                  <div>
                    <h4>Green Tick Verification</h4>
                    <p className="amx-panel-sub">
                      {greenTick.status && greenTick.status !== "draft"
                        ? `Application status: ${greenTick.status.replaceAll("_", " ")}`
                        : "Get your masjid formally verified by Masjid My Community."}
                    </p>
                  </div>
                  <Link to={`/account/my-masjids/${masjidId}/green-tick`} className="btn btn-gold">
                    {greenTick.status && greenTick.status !== "draft" ? "View Application" : "Apply for Green Tick"} <span className="btn-arrow">→</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
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

        <div className={`card msj-step-card${step === 2 || step === 3 || step === STEPS.length ? " msj-step-card-wide" : ""}`}>
          {step === 1 && (
            <>
              <Field label="Masjid Name" required error={errors.name}><input value={form.name} onChange={setField("name")} placeholder="e.g. Al-Noor Masjid" maxLength={255} /></Field>
              <div className="msj-field-row">
                <Field label="Tagline / Short Description" required error={errors.tagline}>
                  <input value={form.tagline} onChange={setField("tagline")} placeholder="A brief line that captures your masjid" maxLength={255} />
                </Field>
                <Field label="Masjid Category" required error={errors.category}>
                  <select value={form.category} onChange={setField("category")}>
                    <option value="">Select a category</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field
                label="About the Masjid"
                required
                error={errors.about}
                labelExtra={<span className="pf-char-counter">{form.about.length}/{ABOUT_MAX}</span>}
              >
                <div className="msj-about-wrap">
                  <textarea rows={5} maxLength={ABOUT_MAX} value={form.about} onChange={setField("about")} placeholder="Share the masjid's history, community, and mission" />
                  <MicButton
                    onTranscript={(text) => {
                      setForm((f) => ({ ...f, about: text.slice(0, ABOUT_MAX) }));
                      setErrors((er) => ({ ...er, about: null }));
                    }}
                    className="msj-about-mic"
                  />
                </div>
              </Field>
              <Field label="Address" required error={errors.address} hint={!errors.address ? "Search for the masjid by name or address — the rest of the location details fill in automatically." : undefined}>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(v) => { setForm((f) => ({ ...f, address: v })); setErrors((er) => ({ ...er, address: null })); }}
                  onResolved={applyResolvedAddress}
                  placeholder="e.g. Jama Masjid, Delhi"
                />
              </Field>
              <LocationMap
                latitude={form.latitude}
                longitude={form.longitude}
                onPinMoved={(fields) => applyResolvedAddress(fields, { overwriteAddress: true })}
              />
            </>
          )}

          {step === 2 && (
            <ContactPeopleSection
              masjidId={masjidId}
              contacts={contacts}
              setContacts={setContacts}
              designations={designations}
            />
          )}

          {step === 3 && (
            <>
              <div
                className={`msj-dropzone${dragOver ? " drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDropFiles}
              >
                <label className="msj-dropzone-inner">
                  <span className="msj-dropzone-icon"><Icon name="upload" size={22} /></span>
                  <strong>Drag &amp; drop, or click to upload</strong>
                  <span>Photos: JPG, PNG, WEBP up to 5MB · Videos: MP4, WEBM, MOV up to 50MB</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple hidden onChange={handleFiles} />
                </label>
                <div className="msj-dropzone-category">
                  <label htmlFor="msj-upload-category">Category</label>
                  <select id="msj-upload-category" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                    {PHOTO_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
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

          {step === STEPS.length && (
            <>
              <MasjidSummary
                form={form} photos={photos} contacts={contacts}
                onEdit={setStep}
              />
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
        </div>
    </WizardShell>
  );
}

function MasjidSummary({ form, photos, contacts, onEdit }) {
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
        {contacts.length === 0 ? (
          <p>No contact people added yet.</p>
        ) : (
          contacts.map((c) => (
            <p key={c.id}>
              {c.designation}: {c.name} — {c.mobile} {c.verified ? "(verified)" : "(not verified)"}
            </p>
          ))
        )}
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
