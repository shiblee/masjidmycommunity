import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";
import { API_ORIGIN } from "../../config.js";
import MicButton from "../../components/MicButton.jsx";

const FIELD_LABEL = { name: "Name", category: "Category", location: "Location", photos: "Photos", contact: "Contact Details", other: "Other" };
const REQUEST_STATUS_LABEL = { pending: "Pending Review", partially_approved: "Partially Approved", approved: "Approved", rejected: "Rejected" };
const FIELD_STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected", modified_approved: "Modified & Approved" };

function Section({ title, children }) {
  return (
    <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
      <div className="amx-panel-head"><h3>{title}</h3></div>
      {children}
    </div>
  );
}

function ValueDisplay({ fieldKey, value }) {
  if (value == null) return <span className="amx-panel-sub">—</span>;
  if (fieldKey === "contact") {
    if (Array.isArray(value.contacts)) {
      if (value.contacts.length === 0) return <span className="amx-panel-sub">No contact on file</span>;
      return <>{value.contacts.map((c, i) => <div key={i}>{c.designation}: {c.name}</div>)}</>;
    }
    return <div>{value.designation}: {value.name} ({value.mobile})</div>;
  }
  if (fieldKey === "photos") {
    if ("coverPhotoUrl" in value) {
      return value.coverPhotoUrl
        ? <img src={`${API_ORIGIN}${value.coverPhotoUrl}`} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
        : <span className="amx-panel-sub">No photo yet ({value.photoCount || 0} on file)</span>;
    }
    return (
      <div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: value.caption ? 6 : 0 }}>
          {(value.photoUrls || []).map((url, i) => (
            <img key={i} src={`${API_ORIGIN}${url}`} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
          ))}
        </div>
        {value.caption && <span className="amx-panel-sub">"{value.caption}"</span>}
      </div>
    );
  }
  return <span>{value.text}</span>;
}

function EditDraftInputs({ fieldKey, draft, setDraft }) {
  if (fieldKey === "contact") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input value={draft.designation || ""} onChange={(e) => setDraft({ ...draft, designation: e.target.value })} placeholder="Designation" />
        <input value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" />
        <input value={draft.mobile || ""} onChange={(e) => setDraft({ ...draft, mobile: e.target.value })} placeholder="Mobile" />
      </div>
    );
  }
  if (fieldKey === "photos") {
    return <input value={draft.caption || ""} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} placeholder="Caption" />;
  }
  return (
    <div className="amx-textarea-mic-wrap">
      <textarea rows={2} value={draft.text || ""} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
      <MicButton onTranscript={(t) => setDraft({ ...draft, text: t })} />
    </div>
  );
}

function FieldCard({ field, requestId, onDecided }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.suggestedValue || {});
  const [busy, setBusy] = useState(false);

  const act = async (action, finalValue) => {
    setBusy(true);
    try {
      const { data } = await adminApi.post(`/masjid-corrections/${requestId}/fields/${field.id}/action`, { action, finalValue });
      onDecided(data.field, data.requestStatus);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || "Couldn't update that field.");
    } finally {
      setBusy(false);
    }
  };

  const decided = field.status !== "pending";

  return (
    <div className="amx-card amx-panel" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{FIELD_LABEL[field.fieldKey]}</h3>
        <StatusBadge status={field.status === "modified_approved" ? "ok" : field.status} label={FIELD_STATUS_LABEL[field.status]} />
      </div>

      <div className="amx-editor-layout" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <span className="amx-panel-sub" style={{ display: "block", marginBottom: 4 }}>Current</span>
          <ValueDisplay fieldKey={field.fieldKey} value={field.currentValue} />
        </div>
        <div>
          <span className="amx-panel-sub" style={{ display: "block", marginBottom: 4 }}>Suggested</span>
          <ValueDisplay fieldKey={field.fieldKey} value={field.suggestedValue} />
        </div>
      </div>

      {decided && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--a-border)" }}>
          <span className="amx-panel-sub" style={{ display: "block", marginBottom: 4 }}>Final</span>
          <ValueDisplay fieldKey={field.fieldKey} value={field.finalValue} />
          <span className="amx-panel-sub" style={{ display: "block", marginTop: 8 }}>
            {field.decidedByAdminName} · {formatDateTime(field.decidedAt)}
          </span>
        </div>
      )}

      {!decided && (
        <div style={{ marginTop: 14 }}>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <EditDraftInputs fieldKey={field.fieldKey} draft={draft} setDraft={setDraft} />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="amx-btn amx-btn-sm amx-btn-outline" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
                <button className="amx-btn amx-btn-sm amx-btn-accent" disabled={busy} onClick={() => act("edit_approve", draft)}>Confirm Edit &amp; Approve</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button className="amx-btn amx-btn-sm amx-btn-outline" style={{ color: "#C24B3F", borderColor: "#C24B3F" }} disabled={busy} onClick={() => act("reject")}>Reject</button>
              {field.fieldKey !== "photos" && (
                <button className="amx-btn amx-btn-sm amx-btn-outline" disabled={busy} onClick={() => setEditing(true)}>Edit &amp; Approve</button>
              )}
              <button className="amx-btn amx-btn-sm amx-btn-accent" disabled={busy} onClick={() => act("approve")}>Approve</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MasjidCorrectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);

  const load = () => {
    adminApi.get(`/masjid-corrections/${id}`).then(({ data }) => setRequest(data.request)).catch(() => setRequest(null));
  };

  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDecided = (updatedField, requestStatus) => {
    setRequest((r) => ({
      ...r,
      status: requestStatus,
      fields: r.fields.map((f) => (f.id === updatedField.id ? updatedField : f)),
    }));
  };

  if (!request) return <div className="amx-empty"><Icon name="fileText" /><strong>Loading…</strong></div>;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/masjid-corrections")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Correction Requests
          </button>
          <h1 style={{ marginTop: 10 }}>{request.masjid?.name}</h1>
          <p>Submitted by {request.submitter?.fullName || "Unknown"} · {formatDateTime(request.createdAt)}</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center" }}>
          <StatusBadge status={request.status === "partially_approved" ? "warn" : request.status} label={REQUEST_STATUS_LABEL[request.status]} />
        </div>
      </div>

      {request.fields.map((field) => (
        <FieldCard key={field.id} field={field} requestId={request.id} onDecided={handleDecided} />
      ))}
    </>
  );
}

export default MasjidCorrectionDetail;
