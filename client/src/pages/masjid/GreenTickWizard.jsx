import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "../../components/Icons.jsx";
import masjidApi from "../../services/masjidApi.js";
import { API_BASE } from "../../config.js";
import { WizardShell, WizardStepper } from "../../components/wizard/WizardShell.jsx";
import { ContactPersonForm } from "../../components/masjid/ContactPersonForm.jsx";
import DocumentEditorModal from "../../components/masjid/DocumentEditorModal.jsx";
import { maskDocumentNumber } from "../../utils/mask.js";

const STEPS = [
  { key: "representatives", label: "Representatives", icon: "people" },
  { key: "identity", label: "Verify Identities", icon: "shieldCheck" },
  { key: "masjid-docs", label: "Masjid Documents", icon: "fileText" },
  { key: "property-docs", label: "Property Documents", icon: "building" },
  { key: "review", label: "Review", icon: "sparkle" },
  { key: "submit", label: "Submit", icon: "check" },
];

const STATUS_LABEL = {
  pending: "Pending Review", under_review: "Under Review", approved: "Verified", rejected: "Rejected", replacement_requested: "Re-upload Required",
};

// The full journey, shown on the wizard's introductory overview screen — not
// just the 6 form-filling steps above, but the whole path through to
// certification, so an owner sees the complete picture (including what
// happens after they submit) before starting. `checklistKeys` points at the
// matching entries in the backend's own progress.checklist (the single
// source of truth for "done"), so this never drifts out of sync with it.
const JOURNEY_STAGES = [
  { key: "representatives", label: "Add Representatives", desc: "Add at least 3 verified office bearers who can represent your masjid.", checklistKeys: ["representatives_added"] },
  { key: "identity", label: "Verify Identities & Authorization", desc: "Each representative's identity document is reviewed, and their authority to represent the masjid is separately confirmed.", checklistKeys: ["identity_verified", "authorization_verified"] },
  { key: "masjid-docs", label: "Masjid Documents", desc: "Upload your masjid's registration, trust/committee, or authorization documents.", checklistKeys: ["masjid_documents"] },
  { key: "property-docs", label: "Property Documents", desc: "Upload property or land ownership documents relevant to the masjid.", checklistKeys: ["property_documents"] },
  { key: "submitted", label: "Submit for Verification", desc: "Send your completed application to Masjid My Community for review.", checklistKeys: ["submitted"] },
  { key: "reviewed", label: "Admin Review", desc: "Our team reviews every representative and document you've submitted.", checklistKeys: ["reviewed"] },
  { key: "issued", label: "Green Tick Issued", desc: "Once everything checks out, your Green Tick is issued and shown publicly on your masjid's page.", checklistKeys: ["issued"] },
];

function DocRow({ doc, onDelete, onView, editable, busy }) {
  return (
    <div className="msj-greentick-doc-row">
      <Icon name="fileText" size={15} />
      <div className="msj-greentick-doc-card-body">
        <span className="msj-greentick-doc-name">{doc.fileName}</span>
        {doc.documentNumber && <span className="msj-greentick-doc-number">No. {maskDocumentNumber(doc.documentNumber)}</span>}
      </div>
      <span className={`msj-greentick-doc-status msj-greentick-doc-status-${doc.status}`}>{STATUS_LABEL[doc.status]}</span>
      {doc.reviewerRemarks && <span className="msj-greentick-doc-remarks">"{doc.reviewerRemarks}"</span>}
      <button type="button" className="msj-greentick-doc-view" onClick={() => onView(doc)}>View</button>
      {editable && (
        <button type="button" className="msj-greentick-doc-remove" onClick={() => onDelete(doc.id)} disabled={busy} aria-label="Remove document">
          <Icon name="trash" size={13} />
        </button>
      )}
    </div>
  );
}

function DocUploader({ type, existing, onUpload, onDelete, onView, editable, busy, representativeId }) {
  const [documentNumber, setDocumentNumber] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [numberError, setNumberError] = useState("");

  const numberMissing = type.documentNumberRequired && !documentNumber.trim();
  const allowedFormats = type.allowedFormats ? type.allowedFormats.split(",").map((f) => f.trim().toLowerCase()) : null;

  const openEditor = () => {
    if (numberMissing) {
      setNumberError("Enter the document number before uploading.");
      return;
    }
    setNumberError("");
    setEditorOpen(true);
  };

  const handleSave = async (file) => {
    setUploading(true);
    try {
      await onUpload(file, { documentTypeId: type.id, representativeId, documentNumber });
      setDocumentNumber("");
      setEditorOpen(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="msj-greentick-doctype">
      <div className="msj-greentick-doctype-head">
        <strong>{type.name}</strong>
        {type.isRequired && <span className="msj-required">*</span>}
      </div>
      {type.description && <p className="msj-greentick-doctype-desc">{type.description}</p>}
      {existing.map((doc) => <DocRow key={doc.id} doc={doc} onDelete={onDelete} onView={onView} editable={editable} busy={busy} />)}
      {editable && (
        <div className="msj-greentick-upload-row">
          <div className="msj-greentick-number-field">
            <input
              type="text"
              placeholder={type.documentNumberRequired ? "Document number (required)" : "Document number (optional)"}
              value={documentNumber}
              onChange={(e) => { setDocumentNumber(e.target.value); setNumberError(""); }}
            />
            {documentNumber.trim() && (
              <span className="msj-greentick-number-hint">
                Please ensure that the document number entered above exactly matches the number shown on your uploaded document.
              </span>
            )}
            {numberError && <span className="auth-field-error">{numberError}</span>}
          </div>
          <button type="button" className="btn btn-outline-ink" onClick={openEditor} disabled={busy}>
            <Icon name="upload" size={15} /> Upload Document
          </button>
        </div>
      )}
      {editorOpen && (
        <DocumentEditorModal
          allowedFormats={allowedFormats}
          saving={uploading}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function GreenTickWizard({ embedded }) {
  const { id } = useParams();
  const navigate = useNavigate();
  // Step 0 is the introductory journey overview — outside STEPS/the visible
  // stepper, since it's not a form to fill in. 1..STEPS.length are the real
  // form steps, same as before.
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [masjid, setMasjid] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [designations, setDesignations] = useState([]);
  // Adding a brand-new representative (rather than picking an already
  // verified contact) reuses the exact same name/designation/mobile + OTP
  // form as the masjid's own Contact & Verification step.
  const [addingNew, setAddingNew] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const load = () => {
    masjidApi
      .get(`/${id}/green-tick`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load your Green Tick application."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
    masjidApi.get(`/${id}`).then(({ data }) => setMasjid(data.masjid)).catch(() => {});
    axios.get(`${API_BASE}/masjids/public/contact-designations`).then(({ data }) => setDesignations(data.designations || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const withBusy = (fn) => async (...args) => {
    setBusy(true);
    setError("");
    try {
      await fn(...args);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const addRepresentative = withBusy((contactPersonId) => masjidApi.post(`/${id}/green-tick/representatives`, { contactPersonId }));
  const handleNewContactSaved = async (contact) => {
    if (!contact.verified) {
      setError("Please verify this person's mobile number before adding them as a representative.");
      return;
    }
    setAddingNew(false);
    await addRepresentative(contact.id);
  };
  const removeRepresentative = withBusy((repId) => masjidApi.delete(`/${id}/green-tick/representatives/${repId}`));
  const deleteDocument = withBusy((docId) => masjidApi.delete(`/${id}/green-tick/documents/${docId}`));
  const uploadDocument = withBusy((file, { documentTypeId, representativeId, documentNumber }) => {
    const fd = new FormData();
    fd.append("documents", file);
    fd.append("documentTypeId", documentTypeId);
    if (representativeId) fd.append("representativeId", representativeId);
    if (documentNumber) fd.append("documentNumber", documentNumber);
    return masjidApi.post(`/${id}/green-tick/documents`, fd);
  });

  const viewDocument = async (doc) => {
    try {
      const res = await masjidApi.get(`/${id}/green-tick/documents/${doc.id}/file`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      window.open(url, "_blank", "noopener");
    } catch {
      setError("Couldn't open this document.");
    }
  };

  const doSubmit = async () => {
    setBusy(true);
    setError("");
    try {
      await masjidApi.post(`/${id}/green-tick/submit`, { confirmed: true });
      setSubmitted(true);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your application.");
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  if (loading) return <WizardShell embedded={embedded}><p>Loading…</p></WizardShell>;
  if (!data) {
    return (
      <WizardShell embedded={embedded}>
        <Link to={`/account/my-masjids/${id}`} className="msj-back-link"><Icon name="chevronLeft" size={16} /> Back</Link>
        <div className="auth-alert" style={{ marginTop: 20 }}><Icon name="info" size={17} />{error || "Couldn't load this application."}</div>
      </WizardShell>
    );
  }

  // The wizard itself stays open while the application is editable — draft,
  // or bounced back with documents_required/clarification_required. Once
  // it's genuinely out of the owner's hands (submitted, under review,
  // issued, etc.) — or was JUST submitted this visit — show a status
  // summary instead of step forms with nothing left to do.
  if (submitted || !data.editable) {
    const { application, progress } = data;
    return (
      <WizardShell embedded={embedded}>
        <Link to={`/account/my-masjids/${id}`} className="msj-back-link"><Icon name="chevronLeft" size={16} /> Back to My Masjid</Link>
        <div className="msj-wizard-center">
          <div className="msj-confirm">
            <div className="msj-confirm-icon"><Icon name="check" size={32} /></div>
            <h1>Your Green Tick application is {application.status === "green_tick_issued" ? "issued!" : "with Masjid My Community"}</h1>
            <p>
              Verification ID: <strong>{application.verificationId || "Pending"}</strong><br />
              Current status: <strong>{application.status.replaceAll("_", " ")}</strong><br />
              Progress: {progress.completed} of {progress.total} requirements completed.
            </p>
            <Link to={`/account/my-masjids/${id}`} className="btn btn-gold">Back to My Masjid <span className="btn-arrow">→</span></Link>
          </div>
        </div>
      </WizardShell>
    );
  }

  const { application, progress, documentTypes, representatives, documents, eligibleContacts, editable } = data;
  const masjidDocTypes = documentTypes.filter((t) => t.category === "masjid");
  const propertyDocTypes = documentTypes.filter((t) => t.category === "property");
  const representativeDocTypes = documentTypes.filter((t) => t.category === "representative");
  const docsFor = (typeId, repId = null) => documents.filter((d) => d.documentTypeId === typeId && d.representativeId === repId);

  const checklistDone = Object.fromEntries(progress.checklist.map((c) => [c.key, c.done]));
  const journeyDone = JOURNEY_STAGES.map((s) => s.checklistKeys.every((k) => checklistDone[k]));
  const journeyCurrentIndex = journeyDone.findIndex((done) => !done);

  // The Representatives step (1) is the one place a user can click Next
  // without actually meeting the requirement yet — every other step just
  // collects optional/required documents with nothing to gate here. Blocking
  // it with a clear message beats silently advancing to a step that then
  // looks broken, or silently doing nothing.
  const handleNext = () => {
    if (step === 1 && !checklistDone.representatives_added) {
      setError("Please add at least 3 representatives before continuing.");
      return;
    }
    setError("");
    goNext();
  };

  return (
    <WizardShell embedded={embedded}>
      <Link to={`/account/my-masjids/${id}`} className="msj-back-link"><Icon name="chevronLeft" size={16} /> Back to My Masjid</Link>

      <div className="msj-wizard-center">
        <div className="section-head" style={{ marginTop: 16, marginBottom: 20, maxWidth: "none" }}>
          <span className="eyebrow">Green Tick Application</span>
          <h2>{masjid?.name || "Apply for the Green Tick"}</h2>
          {masjid && (
            <p className="msj-greentick-header-sub">
              {[masjid.category, [masjid.address, masjid.city, masjid.state, masjid.country].filter(Boolean).join(", ")]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        <div className="msj-greentick-progress">
          <div className="msj-greentick-progress-bar"><div className="msj-greentick-progress-fill" style={{ width: `${(progress.completed / progress.total) * 100}%` }} /></div>
          <span>Verification Progress: {progress.completed} of {progress.total} requirements completed</span>
        </div>

        {step > 0 && (
          <>
            <WizardStepper steps={STEPS} current={step} />
            <p className="msj-stepper-current">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>
          </>
        )}

        {error && <div className="auth-alert" style={{ marginBottom: 20 }}><Icon name="info" size={17} />{error}</div>}

        <div className="card msj-step-card msj-step-card-wide">
          {step === 0 && (
            <>
              <h3>Your Green Tick Verification Journey</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 20 }}>
                Here's the complete process from start to certification, and exactly where your application stands
                right now. Complete each requirement, then submit for review.
              </p>
              <div className="msj-greentick-journey">
                {JOURNEY_STAGES.map((s, i) => {
                  const done = journeyDone[i];
                  const isCurrent = !done && i === journeyCurrentIndex;
                  const state = done ? "done" : isCurrent ? "current" : "upcoming";
                  return (
                    <div key={s.key} className={`msj-greentick-journey-row ${state}`}>
                      <span className="msj-greentick-journey-marker">{done ? <Icon name="check" size={14} /> : i + 1}</span>
                      <div className="msj-greentick-journey-body">
                        <strong>{s.label}</strong>
                        <span>{s.desc}</span>
                      </div>
                      <span className={`msj-greentick-journey-status ${state}`}>
                        {done ? "Done" : isCurrent ? "Up Next" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h3>Add Representatives</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 16 }}>
                At least 3 verified office bearers must be added as representatives — pick from your masjid's already
                verified contacts, or add someone new below (their mobile number will need to be verified first).
              </p>
              {representatives.length > 0 && (
                <div className="msj-greentick-rep-list">
                  {representatives.map((r) => (
                    <div className="msj-greentick-rep-row" key={r.id}>
                      <div>
                        <strong>{r.contact?.name}</strong>
                        <span className="amx-cell-sub">{r.contact?.designation} · {r.contact?.mobile}</span>
                      </div>
                      <div className="msj-greentick-rep-status">
                        <span className={`msj-greentick-doc-status msj-greentick-doc-status-${r.identityVerificationStatus}`}>Identity: {STATUS_LABEL[r.identityVerificationStatus]}</span>
                        <span className={`msj-greentick-doc-status msj-greentick-doc-status-${r.authorizationStatus}`}>Authorization: {STATUS_LABEL[r.authorizationStatus]}</span>
                      </div>
                      {editable && (
                        <button type="button" className="btn btn-outline-ink" onClick={() => removeRepresentative(r.id)} disabled={busy}>Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {editable && eligibleContacts.length > 0 && (
                <div className="msj-greentick-eligible">
                  <p className="amx-panel-sub">Verified contacts you can add:</p>
                  {eligibleContacts.map((c) => (
                    <div className="msj-greentick-rep-row" key={c.id}>
                      <div>
                        <strong>{c.name}</strong>
                        <span className="amx-cell-sub">{c.designation} · {c.mobile}</span>
                      </div>
                      <button type="button" className="btn btn-gold" onClick={() => addRepresentative(c.id)} disabled={busy}>Add as Representative</button>
                    </div>
                  ))}
                </div>
              )}
              {editable && !addingNew && (
                <button type="button" className="btn btn-outline-ink" onClick={() => setAddingNew(true)} style={{ marginTop: 8 }}>
                  <Icon name="plus" size={15} /> Add Someone Else
                </button>
              )}
              {editable && addingNew && (
                <ContactPersonForm
                  masjidId={id}
                  designations={designations}
                  onCancel={() => setAddingNew(false)}
                  onSaved={handleNewContactSaved}
                  onRemoved={() => setAddingNew(false)}
                />
              )}
            </>
          )}

          {step === 2 && (
            <>
              <h3>Verify Representative Identities</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 16 }}>Upload an identity document for each representative — Masjid My Community will review it.</p>
              {representatives.length === 0 && <p className="amx-panel-sub">Add representatives in the previous step first.</p>}
              {representatives.map((r) => (
                <div key={r.id} className="msj-greentick-rep-block">
                  <h4>{r.contact?.name} <span className="amx-cell-sub">({r.contact?.designation})</span></h4>
                  {representativeDocTypes.map((type) => (
                    <DocUploader
                      key={type.id}
                      type={type}
                      existing={docsFor(type.id, r.id)}
                      onUpload={uploadDocument}
                      onDelete={deleteDocument}
                      onView={viewDocument}
                      editable={editable}
                      busy={busy}
                      representativeId={r.id}
                    />
                  ))}
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <h3>Upload Masjid Documents</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 16 }}>Registration, trust/committee, and authorization documents for the masjid itself.</p>
              {masjidDocTypes.map((type) => (
                <DocUploader key={type.id} type={type} existing={docsFor(type.id, null)} onUpload={uploadDocument} onDelete={deleteDocument} onView={viewDocument} editable={editable} busy={busy} representativeId={null} />
              ))}
            </>
          )}

          {step === 4 && (
            <>
              <h3>Upload Property/Supporting Documents</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 16 }}>Property or land ownership documents relevant to the masjid.</p>
              {propertyDocTypes.map((type) => (
                <DocUploader key={type.id} type={type} existing={docsFor(type.id, null)} onUpload={uploadDocument} onDelete={deleteDocument} onView={viewDocument} editable={editable} busy={busy} representativeId={null} />
              ))}
            </>
          )}

          {step === 5 && (
            <>
              <h3>Review Application</h3>
              <div className="msj-greentick-checklist">
                {progress.checklist.map((c) => (
                  <div key={c.key} className={`msj-greentick-checklist-row${c.done ? " done" : ""}`}>
                    <Icon name={c.done ? "check" : "x"} size={14} />
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === STEPS.length && (
            <>
              <h3>Submit for Verification</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 16 }}>
                Once submitted, your application will be reviewed by Masjid My Community. You won't be able to add or
                remove representatives or documents while it's under review.
              </p>
              <label className="msj-greentick-confirm-row">
                <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                <span>
                  I confirm that the documents uploaded above are my valid and genuine documents, the information
                  provided is accurate, and every document number entered matches the document. I authorize Masjid My
                  Community to use these documents solely for the purpose of Green Tick verification.
                </span>
              </label>
              <button type="button" className="btn btn-gold" onClick={doSubmit} disabled={busy || !confirmed}>
                {busy ? "Submitting…" : "Submit for Verification"} <span className="btn-arrow">→</span>
              </button>
            </>
          )}
        </div>

        <div className="msj-step-actions">
          <div>{step > 0 && <button className="btn btn-outline-ink" onClick={goBack} type="button"><Icon name="chevronLeft" size={16} /> Back</button>}</div>
          <div>
            {step < STEPS.length && (
              <button className="btn btn-gold" onClick={handleNext} type="button">
                {step === 0 ? "Get Started" : "Next"} <span className="btn-arrow">→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </WizardShell>
  );
}

export default GreenTickWizard;
