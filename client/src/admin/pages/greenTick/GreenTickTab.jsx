import React, { useEffect, useState } from "react";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDateTime } from "../../../utils/formatDateTime.js";
import { maskDocumentNumber } from "../../../utils/mask.js";

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

function RemarksModal({ title, placeholder, required, onCancel, onSubmit, busy }) {
  const [text, setText] = useState("");
  return (
    <div className="amx-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close" disabled={busy}><Icon name="x" size={16} /></button>
        <h3>{title}</h3>
        <div className="amx-form-group" style={{ marginTop: 16 }}>
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder || "Remarks (visible to the masjid)"} />
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
    <span className="amx-cell-sub" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--a-mono, monospace)" }}>
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
          <Icon name="upload" size={15} style={{ transform: "rotate(180deg)" }} /> Download
        </button>
      </div>
    </div>
  );
}

function DocList({ title, docs, representatives, onDecide, onDownload, onOpenViewer }) {
  if (!docs.length) return (
    <div className="amx-panel-head"><h3>{title}</h3><span className="amx-panel-sub">None uploaded yet</span></div>
  );
  return (
    <>
      <div className="amx-panel-head"><h3>{title}</h3></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {docs.map((d) => {
          const rep = representatives?.find((r) => r.id === d.representativeId);
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px", border: "1px solid var(--a-border)", borderRadius: 10 }}>
              <Icon name="fileText" size={16} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => onOpenViewer(d)}>{d.fileName}</button>
                {rep?.contact && <span className="amx-cell-sub">{rep.contact.name} · {rep.contact.designation}</span>}
              </div>
              <DocumentNumber value={d.documentNumber} />
              <span className="amx-cell-sub">Uploaded {formatDateTime(d.createdAt)}</span>
              <StatusBadge status={DOC_STATUS_BADGE_CLASS[d.status] || "neutral"} label={DOC_STATUS_LABEL[d.status] || d.status} />
              {d.reviewerRemarks && <span className="amx-cell-sub" style={{ fontStyle: "italic" }}>"{d.reviewerRemarks}"</span>}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {d.status !== "under_review" && <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => onDecide(d.id, "under_review")}>Mark Under Review</button>}
                <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => onDecide(d.id, "approved")}>Verify</button>
                <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => onDecide(d.id, "rejected")}>Reject</button>
                <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => onDecide(d.id, "replacement_requested")}>Request Re-upload</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function GreenTickTab({ masjidId, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [remarksModal, setRemarksModal] = useState(null); // { title, action } | null

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

  const decideRepresentative = (repId, field, decision) =>
    runAction(
      () => adminApi.patch(`/masjids/${masjidId}/green-tick/representatives/${repId}/${field}`, { decision }),
      `Representative ${field} ${decision}.`
    );

  const decideDocument = (docId, decision) =>
    runAction(() => adminApi.patch(`/masjids/${masjidId}/green-tick/documents/${docId}`, { decision }), `Document ${decision.replaceAll("_", " ")}.`);

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

  const { masjid, application, progress, representatives, documents, timeline } = data;
  const repDocs = documents.filter((d) => d.representativeId != null);
  const masjidDocs = documents.filter((d) => d.representativeId == null && data.documentTypes.find((t) => t.id === d.documentTypeId)?.category === "masjid");
  const propertyDocs = documents.filter((d) => d.representativeId == null && data.documentTypes.find((t) => t.id === d.documentTypeId)?.category === "property");

  return (
    <>
      <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
        <div className="amx-panel-head" style={{ alignItems: "center" }}>
          <div>
            <h3>Green Tick Application</h3>
            <div className="amx-panel-sub">
              {masjid.name} · {masjid.category || "—"} · {masjid.address || "—"} · Masjid status: {masjid.status}
            </div>
          </div>
          <StatusBadge status={STATUS_BADGE_CLASS[application.status]} label={application.statusLabel} />
        </div>
        <p className="amx-panel-sub" style={{ marginBottom: 12 }}>
          Verification ID: <strong>{application.verificationId || "Not yet generated"}</strong> · Progress: {progress.completed} of {progress.total} requirements
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {application.status === "submitted" && <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("under-review")}>Mark Under Review</button>}
          {["submitted", "under_review", "partially_verified"].includes(application.status) && (
            <>
              <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("request-documents")}>Request More Documents</button>
              <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("request-clarification")}>Request Clarification</button>
              <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => openRemarks("verification-failed")}>Mark Verification Failed</button>
              <button className="amx-btn amx-btn-primary amx-btn-sm" onClick={() => openRemarks("approve")}>Approve Application</button>
            </>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {representatives.map((r) => (
              <div key={r.id} style={{ padding: "12px 14px", border: "1px solid var(--a-border)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <strong>{r.contact?.name}</strong>
                    <div className="amx-cell-sub">{r.contact?.designation} · {r.contact?.mobile}</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                    <div>
                      <span className="amx-cell-sub">Identity: </span>
                      <StatusBadge status={r.identityVerificationStatus === "approved" ? "active" : r.identityVerificationStatus === "rejected" ? "inactive" : "pending"} label={r.identityVerificationStatus} />
                      {" "}
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => decideRepresentative(r.id, "identity", "approved")}>Approve</button>
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => decideRepresentative(r.id, "identity", "rejected")}>Reject</button>
                    </div>
                    <div>
                      <span className="amx-cell-sub">Authorization: </span>
                      <StatusBadge status={r.authorizationStatus === "approved" ? "active" : r.authorizationStatus === "rejected" ? "inactive" : "pending"} label={r.authorizationStatus} />
                      {" "}
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => decideRepresentative(r.id, "authorization", "approved")}>Approve</button>
                      <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => decideRepresentative(r.id, "authorization", "rejected")}>Reject</button>
                    </div>
                  </div>
                </div>
                {r.reviewerRemarks && <p className="amx-cell-sub" style={{ marginTop: 8, fontStyle: "italic" }}>"{r.reviewerRemarks}"</p>}
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <DocList title="Identity Documents" docs={repDocs} representatives={representatives} onDecide={decideDocument} onDownload={downloadDocument} onOpenViewer={openViewer} />
        </div>
      </div>

      <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
        <DocList title="Masjid Documents" docs={masjidDocs} onDecide={decideDocument} onDownload={downloadDocument} onOpenViewer={openViewer} />
        <DocList title="Property Verification" docs={propertyDocs} onDecide={decideDocument} onDownload={downloadDocument} onOpenViewer={openViewer} />
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-panel-head"><h3>Verification Timeline</h3></div>
        {timeline.length === 0 ? (
          <p className="amx-panel-sub">No activity recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {timeline.map((t) => (
              <div key={t.id} style={{ fontSize: 13, color: "var(--a-text)", borderBottom: "1px solid var(--a-border)", paddingBottom: 8 }}>
                <strong>{t.action.replaceAll("_", " ")}</strong>
                {t.previousStatus && t.newStatus && <span className="amx-cell-sub"> — {t.previousStatus} → {t.newStatus}</span>}
                {t.remarks && <span> "{t.remarks}"</span>}
                <div className="amx-cell-sub">{t.actorName} ({t.actorType}) · {formatDateTime(t.createdAt)}</div>
              </div>
            ))}
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

      {viewerDoc && (
        <DocumentViewerModal doc={viewerDoc.doc} blobUrl={viewerDoc.blobUrl} onClose={closeViewer} onDownload={downloadDocument} />
      )}
    </>
  );
}

export default GreenTickTab;
