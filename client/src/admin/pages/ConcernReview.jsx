import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

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

function ResolveModal({ onCancel, onSubmit }) {
  const [remarks, setRemarks] = useState("");
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Mark as Resolved</h3>
        <p className="amx-modal-sub">The submitter will automatically receive a closure email with these remarks, if any.</p>
        <div className="amx-form-group" style={{ marginTop: 16 }}>
          <label htmlFor="resolve-remarks">Resolution remarks (optional)</label>
          <textarea id="resolve-remarks" rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="What was found, and how it was resolved…" />
        </div>
        <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} onClick={() => onSubmit(remarks.trim())}>
          <Icon name="check" size={16} /> Mark as Resolved
        </button>
      </div>
    </div>
  );
}

function NoteModal({ title, placeholder, onCancel, onSubmit }) {
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

function ConcernReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [concern, setConcern] = useState(null);
  const [history, setHistory] = useState([]);
  const [modal, setModal] = useState(null); // null | "resolve" | "note" | "close"
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminApi.get(`/concerns/${id}`).then(({ data }) => {
      setConcern(data.concern);
      setHistory(data.history);
    });
  };

  useEffect(() => { load(); }, [id]);

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

  if (!concern) return <div className="amx-empty"><Icon name="shield" /><strong>Loading…</strong></div>;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/concerns")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Raise a Concern
          </button>
          <h1 style={{ marginTop: 10 }} className="mono">{concern.reference}</h1>
          <p>{concern.subject}</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center" }}>
          <StatusBadge status={concern.status} />
        </div>
      </div>

      <div className="amx-editor-layout">
        <div>
          <Section title="Submitted By">
            <Row label="Name" value={concern.fullName} />
            <Row label="Email" value={concern.email} />
            <Row label="Account" value={concern.userId ? `Registered user (#${concern.userId})` : "Guest submission"} />
          </Section>

          <Section title="Concern Details">
            <Row label="Concern Type" value={concern.concernType} />
            <Row label="Subject" value={concern.subject} />
            <Row label="Related Campaign / Masjid" value={concern.relatedReference} />
            <Row label="Submitted On" value={formatDateTime(concern.createdAt)} />
            <div style={{ marginBottom: 12 }}>
              <span className="amx-panel-sub" style={{ display: "block", marginBottom: 4 }}>Description</span>
              <p style={{ whiteSpace: "pre-wrap" }}>{concern.description}</p>
            </div>
          </Section>

          {concern.status !== "open" && (
            <Section title="Resolution">
              <Row label="Resolved By" value={concern.resolvedBy} />
              <Row label="Resolved On" value={concern.resolvedAt ? formatDateTime(concern.resolvedAt) : null} />
              <div style={{ marginBottom: 12 }}>
                <span className="amx-panel-sub" style={{ display: "block", marginBottom: 4 }}>Admin Remarks</span>
                <p style={{ whiteSpace: "pre-wrap" }}>{concern.adminRemarks || "—"}</p>
              </div>
            </Section>
          )}

          <Section title="Activity History">
            {history.map((h) => (
              <div key={h.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--a-border)" }}>
                <strong style={{ textTransform: "capitalize" }}>{h.action.replace(/_/g, " ")}</strong>
                <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{formatDateTime(h.createdAt)} · {h.actorType === "admin" ? h.actorName : concern.fullName}</span>
                {h.note && <p style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{h.note}</p>}
              </div>
            ))}
            {history.length === 0 && <p>No history yet.</p>}
          </Section>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head"><h3>Actions</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {concern.status === "open" && (
              <>
                <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => setModal("resolve")}>
                  <Icon name="check" size={16} /> Mark as Resolved
                </button>
                <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => act(() => adminApi.post(`/concerns/${id}/close`, {}), "Concern closed.")}>
                  Close Concern
                </button>
              </>
            )}
            {concern.status === "resolved" && (
              <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => act(() => adminApi.post(`/concerns/${id}/close`, {}), "Concern closed.")}>
                Close Concern
              </button>
            )}
            {concern.status === "closed" && (
              <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => act(() => adminApi.post(`/concerns/${id}/reopen`, {}), "Concern reopened.")}>
                Reopen Concern
              </button>
            )}
          </div>

          <div className="amx-dropdown-sep" style={{ margin: "18px 0" }} />
          <button className="amx-btn amx-btn-outline" disabled={busy} style={{ width: "100%" }} onClick={() => setModal("note")}>
            <Icon name="edit" size={15} /> Add Internal Note
          </button>
        </div>
      </div>

      {modal === "resolve" && (
        <ResolveModal
          onCancel={() => setModal(null)}
          onSubmit={(remarks) => act(() => adminApi.post(`/concerns/${id}/resolve`, { remarks }), "Concern marked as resolved.")}
        />
      )}

      {modal === "note" && (
        <NoteModal
          title="Add Internal Note"
          placeholder="Add a note for the team's reference…"
          onCancel={() => setModal(null)}
          onSubmit={(note) => act(() => adminApi.post(`/concerns/${id}/notes`, { note }), "Note added.")}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default ConcernReview;
