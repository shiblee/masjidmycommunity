import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import masjidApi from "../../services/masjidApi.js";
import { WizardShell, WizardStepper } from "../../components/wizard/WizardShell.jsx";

const STEPS = [
  { key: "info", label: "Masjid Information", icon: "mosque" },
  { key: "representatives", label: "Representatives", icon: "people" },
  { key: "identity", label: "Verify Identities", icon: "shieldCheck" },
  { key: "masjid-docs", label: "Masjid Documents", icon: "fileText" },
  { key: "property-docs", label: "Property Documents", icon: "building" },
  { key: "review", label: "Review", icon: "sparkle" },
  { key: "submit", label: "Submit", icon: "check" },
];

const STATUS_LABEL = {
  pending: "Pending Review", approved: "Approved", rejected: "Rejected", replacement_requested: "Replacement Requested",
};

function DocRow({ doc, onDelete, editable, busy }) {
  return (
    <div className="msj-greentick-doc-row">
      <Icon name="fileText" size={15} />
      <span className="msj-greentick-doc-name">{doc.fileName}</span>
      <span className={`msj-greentick-doc-status msj-greentick-doc-status-${doc.status}`}>{STATUS_LABEL[doc.status]}</span>
      {doc.reviewerRemarks && <span className="msj-greentick-doc-remarks">"{doc.reviewerRemarks}"</span>}
      {editable && (
        <button type="button" className="msj-greentick-doc-remove" onClick={() => onDelete(doc.id)} disabled={busy} aria-label="Remove document">
          <Icon name="trash" size={13} />
        </button>
      )}
    </div>
  );
}

function DocUploader({ type, existing, onUpload, onDelete, editable, busy, representativeId }) {
  const [file, setFile] = useState(null);
  const [documentNumber, setDocumentNumber] = useState("");

  const handleUpload = async () => {
    if (!file) return;
    await onUpload(file, { documentTypeId: type.id, representativeId, documentNumber });
    setFile(null);
    setDocumentNumber("");
  };

  return (
    <div className="msj-greentick-doctype">
      <div className="msj-greentick-doctype-head">
        <strong>{type.name}</strong>
        {type.isRequired && <span className="msj-required">*</span>}
        {type.description && <span className="msj-greentick-doctype-desc">{type.description}</span>}
      </div>
      {existing.map((doc) => <DocRow key={doc.id} doc={doc} onDelete={onDelete} editable={editable} busy={busy} />)}
      {editable && (
        <div className="msj-greentick-upload-row">
          <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input type="text" placeholder="Document number (optional)" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
          <button type="button" className="btn btn-outline-ink" onClick={handleUpload} disabled={!file || busy}>Upload</button>
        </div>
      )}
    </div>
  );
}

function GreenTickWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [masjid, setMasjid] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const doSubmit = async () => {
    setBusy(true);
    setError("");
    try {
      await masjidApi.post(`/${id}/green-tick/submit`);
      setSubmitted(true);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your application.");
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length));
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  if (loading) return <WizardShell><p>Loading…</p></WizardShell>;
  if (!data) {
    return (
      <WizardShell>
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
      <WizardShell>
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

  return (
    <WizardShell>
      <Link to={`/account/my-masjids/${id}`} className="msj-back-link"><Icon name="chevronLeft" size={16} /> Back to My Masjid</Link>

      <div className="msj-wizard-center">
        <div className="section-head" style={{ marginTop: 16, maxWidth: "none" }}>
          <span className="eyebrow">Green Tick Application</span>
          <h2>{masjid?.name || "Apply for the Green Tick"}</h2>
        </div>

        <div className="msj-greentick-progress">
          <div className="msj-greentick-progress-bar"><div className="msj-greentick-progress-fill" style={{ width: `${(progress.completed / progress.total) * 100}%` }} /></div>
          <span>Verification Progress: {progress.completed} of {progress.total} requirements completed</span>
        </div>

        <WizardStepper steps={STEPS} current={step} />
        <p className="msj-stepper-current">Step {step} of {STEPS.length} — {STEPS[step - 1].label}</p>

        {error && <div className="auth-alert" style={{ marginBottom: 20 }}><Icon name="info" size={17} />{error}</div>}

        <div className="card msj-step-card msj-step-card-wide">
          {step === 1 && masjid && (
            <>
              <h3>Masjid Information</h3>
              <p className="msj-greentick-info-row"><strong>Name:</strong> {masjid.name}</p>
              <p className="msj-greentick-info-row"><strong>Category:</strong> {masjid.category || "—"}</p>
              <p className="msj-greentick-info-row"><strong>Address:</strong> {[masjid.address, masjid.city, masjid.state, masjid.country].filter(Boolean).join(", ")}</p>
              <p className="msj-greentick-info-row"><strong>Tagline:</strong> {masjid.tagline || "—"}</p>
              <p className="amx-panel-sub" style={{ marginTop: 16 }}>
                This is the information Masjid My Community already has on file for your masjid. If anything here is
                incorrect, update it from your masjid's registration page before continuing.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h3>Add Representatives</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 16 }}>
                At least 3 verified office bearers must be added as representatives. Only contact people whose mobile
                number is already verified can be added — verify them first from Contact &amp; Verification if needed.
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
              {editable && eligibleContacts.length === 0 && representatives.length < 3 && (
                <p className="amx-panel-sub">
                  No more verified contacts available. Add and verify more office bearers from Contact &amp;
                  Verification, then come back here.
                </p>
              )}
            </>
          )}

          {step === 3 && (
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
                      editable={editable}
                      busy={busy}
                      representativeId={r.id}
                    />
                  ))}
                </div>
              ))}
            </>
          )}

          {step === 4 && (
            <>
              <h3>Upload Masjid Documents</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 16 }}>Registration, trust/committee, and authorization documents for the masjid itself.</p>
              {masjidDocTypes.map((type) => (
                <DocUploader key={type.id} type={type} existing={docsFor(type.id, null)} onUpload={uploadDocument} onDelete={deleteDocument} editable={editable} busy={busy} representativeId={null} />
              ))}
            </>
          )}

          {step === 5 && (
            <>
              <h3>Upload Property/Supporting Documents</h3>
              <p className="amx-panel-sub" style={{ marginBottom: 16 }}>Property or land ownership documents relevant to the masjid.</p>
              {propertyDocTypes.map((type) => (
                <DocUploader key={type.id} type={type} existing={docsFor(type.id, null)} onUpload={uploadDocument} onDelete={deleteDocument} editable={editable} busy={busy} representativeId={null} />
              ))}
            </>
          )}

          {step === 6 && (
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
              <button type="button" className="btn btn-gold" onClick={doSubmit} disabled={busy}>
                {busy ? "Submitting…" : "Submit for Verification"} <span className="btn-arrow">→</span>
              </button>
            </>
          )}
        </div>

        <div className="msj-step-actions">
          <div>{step > 1 && <button className="btn btn-outline-ink" onClick={goBack} type="button"><Icon name="chevronLeft" size={16} /> Back</button>}</div>
          <div>{step < STEPS.length && <button className="btn btn-gold" onClick={goNext} type="button">Next <span className="btn-arrow">→</span></button>}</div>
        </div>
      </div>
    </WizardShell>
  );
}

export default GreenTickWizard;
