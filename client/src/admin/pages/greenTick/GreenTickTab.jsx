import React, { useEffect, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDateTime } from "../../../utils/formatDateTime.js";
import { maskDocumentNumber } from "../../../utils/mask.js";
import MicButton from "../../../components/MicButton.jsx";

// Values here must be real StatusBadge MAP keys (not literal "danger"/"ok"
// class-name suffixes) — StatusBadge looks the `status` prop up directly,
// falling back to a neutral gray badge for anything it doesn't recognize.
const STATUS_BADGE_CLASS = {
  draft: "neutral", submitted: "warn", under_review: "warn", documents_required: "warn",
  clarification_required: "warn", partially_verified: "warn", verification_failed: "failed",
  approved: "ok", green_tick_issued: "ok", suspended: "suspended", revoked: "rejected",
};

// Same idea, one level down — per-document status (independent of the
// application's own overall status above, since one representative can have
// several documents each at a different stage).
const DOC_STATUS_BADGE_CLASS = {
  pending: "warn", under_review: "warn", approved: "ok", rejected: "failed", replacement_requested: "warn",
};
const DOC_STATUS_LABEL = {
  pending: "Pending Review", under_review: "Under Review", approved: "Verified", rejected: "Rejected", replacement_requested: "Re-upload Required",
};
// Icon + tint for each document's preview tile — no live thumbnail is
// fetched just to render a grid (that's a lot of blob requests up front);
// the file type is enough to tell PDFs, images, and Office docs apart at a
// glance, and clicking the card still opens the real preview.
const DOC_ICON = { "application/pdf": "fileText", "application/msword": "fileText" };
function docIconFor(mimeType) {
  if (mimeType?.startsWith("image/")) return "imageIcon";
  return DOC_ICON[mimeType] || "fileText";
}

function RemarksModal({ title, sub, placeholder, required, onCancel, onSubmit, busy }) {
  const [text, setText] = useState("");
  return (
    <div className="amx-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="amx-modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close" disabled={busy}><Icon name="x" size={16} /></button>
        <h3>{title}</h3>
        {sub && <p className="amx-panel-sub" style={{ marginTop: 4, marginBottom: 4 }}>{sub}</p>}
        <div className="amx-form-group" style={{ marginTop: 16 }}>
          <div className="amx-textarea-mic-wrap">
            <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder || "Remarks (visible to the masjid)"} autoFocus />
            <MicButton onTranscript={(t) => setText(t)} />
          </div>
        </div>
        <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} disabled={busy || (required && !text.trim())} onClick={() => onSubmit(text.trim())}>
          {busy ? "Please wait…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

function DocumentNumber({ value }) {
  const [revealed, setRevealed] = useState(false);
  if (!value) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)" }}>
      #{revealed ? value : maskDocumentNumber(value)}
      <button type="button" className="amx-icon-action" style={{ width: 20, height: 20 }} onClick={() => setRevealed((r) => !r)} title={revealed ? "Hide number" : "Show full number"}>
        <Icon name={revealed ? "eyeOff" : "eye"} size={12} />
      </button>
    </span>
  );
}

function DocumentViewerModal({ doc, blobUrl, onClose, onDownload }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const isImage = doc.mimeType?.startsWith("image/");
  const isPdf = doc.mimeType === "application/pdf";

  return (
    <div className="amx-modal-overlay" onClick={onClose}>
      <div className="amx-modal" style={{ maxWidth: 720, width: "92vw" }} onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3 style={{ marginBottom: 4 }}>{doc.fileName}</h3>
        <p className="amx-panel-sub" style={{ marginBottom: 16 }}>Uploaded {formatDateTime(doc.createdAt)}</p>

        <div style={{ background: "#1a1a1a", borderRadius: 12, overflow: "hidden", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isImage && (
            <img
              src={blobUrl} alt={doc.fileName}
              style={{ maxWidth: "100%", maxHeight: "70vh", transform: `scale(${zoom}) rotate(${rotation}deg)`, transition: "transform .15s" }}
            />
          )}
          {isPdf && <embed src={blobUrl} type="application/pdf" style={{ width: "100%", height: "70vh" }} />}
          {!isImage && !isPdf && (
            <div style={{ padding: 40, textAlign: "center", color: "#fff" }}>
              <Icon name="fileText" size={30} />
              <p style={{ marginTop: 10 }}>This file type can't be previewed here — download it to view.</p>
            </div>
          )}
        </div>

        {isImage && (
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}><Icon name="minus" size={14} /></button>
            <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}><Icon name="plus" size={14} /></button>
            <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => setRotation((r) => r - 90)}><Icon name="rotate" size={14} style={{ transform: "scaleX(-1)" }} /></button>
            <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => setRotation((r) => r + 90)}><Icon name="rotate" size={14} /></button>
          </div>
        )}

        <button type="button" className="amx-btn amx-btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={() => onDownload(doc.id, doc.fileName)}>
          <Icon name="download" size={15} /> Download
        </button>
      </div>
    </div>
  );
}

// Fetches and shows the actual uploaded image as a real thumbnail — an
// admin reviewing documents needs to see the document, not just its
// (often meaningless, camera-generated) filename. Only images get a live
// preview; PDFs/DOC/DOCX fall back to a plain type icon since there's no
// cheap way to rasterize those client-side.
function DocumentThumb({ doc, masjidId, onOpenViewer }) {
  const [src, setSrc] = useState(null);
  const isImage = doc.mimeType?.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    let active = true;
    let objectUrl;
    adminApi
      .get(`/masjids/${masjidId}/green-tick/documents/${doc.id}/file`, { responseType: "blob" })
      .then((res) => {
        if (!active) return;
        objectUrl = window.URL.createObjectURL(res.data);
        setSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id, doc.mimeType, isImage, masjidId]);

  return (
    <button type="button" className="amx-doc-preview" onClick={() => onOpenViewer(doc)} aria-label={`View ${doc.fileName}`}>
      {isImage && src ? (
        <img src={src} alt={doc.fileName} />
      ) : (
        <div className="amx-doc-icon">
          <Icon name={docIconFor(doc.mimeType)} size={22} />
        </div>
      )}
    </button>
  );
}

function DocumentCard({ doc, typeName, masjidId, onDecide, onOpenViewer, onDownload }) {
  return (
    <div className="amx-doc-card">
      <div style={{ position: "relative" }}>
        <DocumentThumb doc={doc} masjidId={masjidId} onOpenViewer={onOpenViewer} />
        <button
          type="button"
          className="amx-doc-download-btn"
          title="Download this document"
          onClick={(e) => { e.stopPropagation(); onDownload(doc.id, doc.fileName); }}
        >
          <Icon name="download" size={14} />
        </button>
      </div>

      <div className="amx-doc-card-top">
        <div className="amx-doc-card-title">
          <strong>{typeName}</strong>
          <span className="amx-doc-card-filename">{doc.fileName}</span>
        </div>
        <StatusBadge status={DOC_STATUS_BADGE_CLASS[doc.status] || "neutral"} label={DOC_STATUS_LABEL[doc.status] || doc.status} />
      </div>

      <div className="amx-doc-meta">
        {doc.documentNumber && <DocumentNumber value={doc.documentNumber} />}
        <span>Uploaded {formatDateTime(doc.createdAt)}</span>
      </div>

      {doc.reviewerRemarks && <div className="amx-doc-remark">"{doc.reviewerRemarks}"</div>}

      <div className="amx-doc-actions">
        <div className="amx-doc-actions-row">
          <button type="button" className="amx-btn amx-btn-accent amx-btn-sm" onClick={() => onDecide(doc, "approved")}>Verify</button>
          <button type="button" className="amx-btn amx-btn-danger amx-btn-sm" onClick={() => onDecide(doc, "rejected")}>Reject</button>
        </div>
        <div className="amx-doc-actions-row">
          {doc.status !== "under_review" && (
            <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => onDecide(doc, "under_review")}>Under Review</button>
          )}
          <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => onDecide(doc, "replacement_requested")}>Request Re-upload</button>
        </div>
      </div>
    </div>
  );
}

function DocGrid({ title, docs, documentTypes, masjidId, onDecide, onOpenViewer, onDownload }) {
  const typeName = (id) => documentTypes.find((t) => t.id === id)?.name || "Document";
  return (
    <>
      {title && <div className="amx-panel-head"><h3>{title}</h3></div>}
      {docs.length === 0 ? (
        <div className="amx-panel-sub">None uploaded yet.</div>
      ) : (
        <div className="amx-doc-grid">
          {docs.map((d) => (
            <DocumentCard key={d.id} doc={d} typeName={typeName(d.documentTypeId)} masjidId={masjidId} onDecide={onDecide} onOpenViewer={onOpenViewer} onDownload={onDownload} />
          ))}
        </div>
      )}
    </>
  );
}

// Every timeline entry's action string is matched by keyword to a feed
// color/icon — new action names (a future admin action, a new document
// status) fall back to the neutral look with no code change needed.
function feedStyleFor(action) {
  if (/reject|failed|revoked/.test(action)) return { bg: "var(--a-danger-bg)", fg: "var(--a-danger)", icon: "x" };
  if (/approved|verified|issued/.test(action)) return { bg: "var(--a-ok-bg)", fg: "var(--a-green-deep)", icon: "check" };
  if (/requested|review|clarification|suspended/.test(action)) return { bg: "var(--a-warn-bg)", fg: "var(--a-warn)", icon: "clock" };
  if (/uploaded/.test(action)) return { bg: "var(--a-bg)", fg: "var(--a-navy-soft)", icon: "upload" };
  if (/added|confirmed|submitted/.test(action)) return { bg: "var(--a-bg)", fg: "var(--a-navy-soft)", icon: "info" };
  return { bg: "var(--a-bg)", fg: "var(--a-navy-soft)", icon: "activity" };
}

function GreenTickTab({ masjidId, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [remarksModal, setRemarksModal] = useState(null); // application-level: { key, title, success }
  const [decisionModal, setDecisionModal] = useState(null); // document/representative-level: { kind, id, field?, decision, title, sub }

  const load = () => {
    setLoading(true);
    adminApi
      .get(`/masjids/${masjidId}/green-tick`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [masjidId]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (fn, successMessage) => {
    setBusy(true);
    try {
      await fn();
      load();
      showToast?.(successMessage);
    } catch (err) {
      showToast?.(err.response?.data?.message || "Couldn't complete this action.");
    } finally {
      setBusy(false);
    }
  };

  const decideRepresentative = (repId, field, decision, remarks) =>
    runAction(
      () => adminApi.patch(`/masjids/${masjidId}/green-tick/representatives/${repId}/${field}`, { decision, remarks }),
      `Representative ${field} ${decision}.`
    );

  const decideDocument = (docId, decision, remarks) =>
    runAction(() => adminApi.patch(`/masjids/${masjidId}/green-tick/documents/${docId}`, { decision, remarks }), `Document ${decision.replaceAll("_", " ")}.`);

  // Rejecting or asking for a re-upload always needs a reason — that's the
  // one thing the masjid actually needs from the admin to fix anything.
  // Verifying or just marking something under review doesn't.
  const REMARKS_REQUIRED_DECISIONS = new Set(["rejected", "replacement_requested"]);

  const openDocDecision = (doc, decision) => {
    if (REMARKS_REQUIRED_DECISIONS.has(decision)) {
      setDecisionModal({
        kind: "document", id: doc.id, decision,
        title: decision === "rejected" ? "Reject Document" : "Request Re-upload",
        sub: "Tell the masjid exactly what's wrong — this is emailed to them automatically.",
      });
      return;
    }
    decideDocument(doc.id, decision);
  };

  const openRepDecision = (rep, field, decision) => {
    if (decision === "rejected") {
      setDecisionModal({
        kind: "representative", id: rep.id, field, decision,
        title: `Reject ${field === "identity" ? "Identity" : "Authorization"}`,
        sub: `Tell ${rep.contact?.name || "the representative"}'s masjid what needs to be corrected.`,
      });
      return;
    }
    decideRepresentative(rep.id, field, decision);
  };

  const submitDecisionModal = (remarks) => {
    const m = decisionModal;
    setDecisionModal(null);
    if (m.kind === "document") decideDocument(m.id, m.decision, remarks);
    else decideRepresentative(m.id, m.field, m.decision, remarks);
  };

  const downloadDocument = async (docId, fileName) => {
    try {
      const res = await adminApi.get(`/masjids/${masjidId}/green-tick/documents/${docId}/file`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast?.("Couldn't download this document.");
    }
  };

  const [downloadingAll, setDownloadingAll] = useState(false);
  const downloadAllDocuments = async () => {
    setDownloadingAll(true);
    try {
      const res = await adminApi.get(`/masjids/${masjidId}/green-tick/documents/download-all`, { responseType: "blob" });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `${data.masjid.name.replace(/[^a-z0-9]+/gi, "_")}-green-tick-documents.zip`; a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast?.("Couldn't download the documents.");
    } finally {
      setDownloadingAll(false);
    }
  };

  const [viewerDoc, setViewerDoc] = useState(null); // { doc, blobUrl } | null
  const openViewer = async (doc) => {
    try {
      const res = await adminApi.get(`/masjids/${masjidId}/green-tick/documents/${doc.id}/file`, { responseType: "blob" });
      setViewerDoc({ doc, blobUrl: window.URL.createObjectURL(res.data) });
    } catch {
      showToast?.("Couldn't open this document.");
    }
  };
  const closeViewer = () => {
    if (viewerDoc) window.URL.revokeObjectURL(viewerDoc.blobUrl);
    setViewerDoc(null);
  };

  const transitions = {
    "under-review": { title: "Mark Under Review", success: "Marked under review." },
    "request-documents": { title: "Request More Documents", success: "Requested more documents." },
    "request-clarification": { title: "Request Clarification", success: "Requested clarification." },
    "verification-failed": { title: "Mark Verification Failed", success: "Marked verification failed." },
    approve: { title: "Approve Application", success: "Application approved." },
    issue: { title: "Issue Green Tick", success: "Green Tick issued!" },
    suspend: { title: "Suspend Green Tick", success: "Green Tick suspended." },
    revoke: { title: "Revoke Green Tick", success: "Green Tick revoked." },
  };

  const openRemarks = (key) => setRemarksModal({ key, ...transitions[key] });
  const submitRemarks = (remarks) => {
    const { key, success } = remarksModal;
    setRemarksModal(null);
    runAction(() => adminApi.post(`/masjids/${masjidId}/green-tick/${key}`, { remarks }), success);
  };

  if (loading) return <div className="amx-card amx-panel"><div className="amx-empty"><Icon name="shieldCheck" /><strong>Loading Green Tick application…</strong></div></div>;
  if (!data) return <div className="amx-card amx-panel"><div className="amx-empty"><Icon name="shieldCheck" /><strong>Couldn't load this application</strong></div></div>;

  const { masjid, application, progress, representatives, documents, timeline, documentTypes } = data;
  const masjidDocs = documents.filter((d) => d.representativeId == null && documentTypes.find((t) => t.id === d.documentTypeId)?.category === "masjid");
  const propertyDocs = documents.filter((d) => d.representativeId == null && documentTypes.find((t) => t.id === d.documentTypeId)?.category === "property");

  return (
    <>
      <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
        <div className="amx-panel-head" style={{ alignItems: "flex-start" }}>
          <div>
            <h3>Green Tick Application</h3>
            <div className="amx-panel-sub">
              {masjid.name} · {masjid.category || "—"} · {masjid.address || "—"}
            </div>
            <div className="amx-panel-sub" style={{ marginTop: 6 }}>
              Verification ID: <strong style={{ color: "var(--a-text)" }}>{application.verificationId || "Not yet generated"}</strong>
            </div>
          </div>
          <StatusBadge status={STATUS_BADGE_CLASS[application.status]} label={application.statusLabel} />
        </div>

        <div className="msj-greentick-progress" style={{ margin: "0 0 10px" }}>
          <div className="msj-greentick-progress-bar"><div className="msj-greentick-progress-fill" style={{ width: `${(progress.completed / progress.total) * 100}%` }} /></div>
          <span>{progress.completed} of {progress.total} requirements completed</span>
        </div>
        <div className="msj-greentick-checklist" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "4px 16px", marginBottom: 18 }}>
          {progress.checklist.map((c) => (
            <div key={c.key} className={`msj-greentick-checklist-row${c.done ? " done" : ""}`} style={{ fontSize: 12.5 }}>
              <Icon name={c.done ? "check" : "x"} size={13} />
              <span>{c.label}</span>
            </div>
          ))}
        </div>

        {documents.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={downloadAllDocuments} disabled={downloadingAll}>
              <Icon name="download" size={14} /> {downloadingAll ? "Preparing…" : `Download All Documents (${documents.length})`}
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {application.status === "submitted" && <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("under-review")}>Mark Under Review</button>}
          {["submitted", "under_review", "partially_verified"].includes(application.status) && (
            <>
              <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("request-documents")}>Request More Documents</button>
              <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("request-clarification")}>Request Clarification</button>
              <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("verification-failed")}>Mark Verification Failed</button>
            </>
          )}
          {/* Representatives/documents can be verified individually at any
              time, independent of the application's own bounce-back status —
              so Approve stays available from documents_required/
              clarification_required too, once everything actually checks
              out, matching the backend's own allowedFrom list. */}
          {["submitted", "under_review", "partially_verified", "documents_required", "clarification_required"].includes(application.status) && (
            <button className="amx-btn amx-btn-primary amx-btn-sm" onClick={() => openRemarks("approve")}>Approve Application</button>
          )}
          {application.status === "approved" && <button className="amx-btn amx-btn-primary amx-btn-sm" onClick={() => openRemarks("issue")}>Issue Green Tick</button>}
          {application.status === "green_tick_issued" && <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("suspend")}>Suspend Green Tick</button>}
          {["green_tick_issued", "suspended"].includes(application.status) && <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("revoke")}>Revoke Green Tick</button>}
        </div>
      </div>

      <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
        <div className="amx-panel-head"><h3>Representatives</h3></div>
        {representatives.length === 0 ? (
          <p className="amx-panel-sub">No representatives added yet.</p>
        ) : (
          representatives.map((r) => {
            const repDocs = documents.filter((d) => d.representativeId === r.id);
            return (
              <div key={r.id} className="amx-rep-card">
                <div className="amx-rep-head">
                  <div>
                    <div className="amx-rep-name">{r.contact?.name}</div>
                    <div className="amx-panel-sub">{r.contact?.designation} · {r.contact?.mobile}</div>
                  </div>
                  <div className="amx-rep-checks">
                    <div className="amx-rep-check-row">
                      <span className="amx-rep-check-label">Identity</span>
                      <StatusBadge status={r.identityVerificationStatus === "approved" ? "active" : r.identityVerificationStatus === "rejected" ? "inactive" : "pending"} label={r.identityVerificationStatus} />
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRepDecision(r, "identity", "approved")}>Approve</button>
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRepDecision(r, "identity", "rejected")}>Reject</button>
                    </div>
                    <div className="amx-rep-check-row">
                      <span className="amx-rep-check-label">Authorization</span>
                      <StatusBadge status={r.authorizationStatus === "approved" ? "active" : r.authorizationStatus === "rejected" ? "inactive" : "pending"} label={r.authorizationStatus} />
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRepDecision(r, "authorization", "approved")}>Approve</button>
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRepDecision(r, "authorization", "rejected")}>Reject</button>
                    </div>
                  </div>
                </div>
                {r.reviewerRemarks && <div className="amx-rep-remark">"{r.reviewerRemarks}"</div>}
                <DocGrid docs={repDocs} documentTypes={documentTypes} masjidId={masjidId} onDecide={openDocDecision} onOpenViewer={openViewer} onDownload={downloadDocument} />
              </div>
            );
          })
        )}
      </div>

      <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
        <DocGrid title="Masjid Documents" docs={masjidDocs} documentTypes={documentTypes} masjidId={masjidId} onDecide={openDocDecision} onOpenViewer={openViewer} onDownload={downloadDocument} />
      </div>
      <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
        <DocGrid title="Property Verification" docs={propertyDocs} documentTypes={documentTypes} masjidId={masjidId} onDecide={openDocDecision} onOpenViewer={openViewer} onDownload={downloadDocument} />
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-panel-head"><h3>Verification Timeline</h3></div>
        {timeline.length === 0 ? (
          <p className="amx-panel-sub">No activity recorded yet.</p>
        ) : (
          <div className="amx-feed">
            {timeline.map((t) => {
              const s = feedStyleFor(t.action);
              return (
                <div className="amx-feed-item" key={t.id}>
                  <div className="amx-feed-icon" style={{ background: s.bg, color: s.fg }}>
                    <Icon name={s.icon} />
                  </div>
                  <div>
                    <p>
                      <strong>{t.action.replaceAll("_", " ")}</strong>
                      {t.previousStatus && t.newStatus && ` — ${t.previousStatus} → ${t.newStatus}`}
                      {t.remarks && ` "${t.remarks}"`}
                    </p>
                    <time>{t.actorName} ({t.actorType}) · {formatDateTime(t.createdAt)}</time>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {remarksModal && (
        <RemarksModal
          title={remarksModal.title}
          required={["request-documents", "request-clarification", "verification-failed", "suspend", "revoke"].includes(remarksModal.key)}
          busy={busy}
          onCancel={() => setRemarksModal(null)}
          onSubmit={submitRemarks}
        />
      )}

      {decisionModal && (
        <RemarksModal
          title={decisionModal.title}
          sub={decisionModal.sub}
          required
          busy={busy}
          onCancel={() => setDecisionModal(null)}
          onSubmit={submitDecisionModal}
        />
      )}

      {viewerDoc && (
        <DocumentViewerModal doc={viewerDoc.doc} blobUrl={viewerDoc.blobUrl} onClose={closeViewer} onDownload={downloadDocument} />
      )}
    </>
  );
}

export default GreenTickTab;
