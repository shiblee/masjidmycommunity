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

function ReplyModal({ onCancel, onSubmit }) {
  const [text, setText] = useState("");
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Reply to Sender</h3>
        <p className="amx-modal-sub">This is emailed directly to the sender's address, and moves an open inquiry to In Progress.</p>
        <div className="amx-form-group" style={{ marginTop: 16 }}>
          <label htmlFor="reply-message">Your reply</label>
          <textarea id="reply-message" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your reply…" />
        </div>
        <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} disabled={!text.trim()} onClick={() => onSubmit(text.trim())}>
          <Icon name="mail" size={16} /> Send Reply
        </button>
      </div>
    </div>
  );
}

function CloseModal({ onCancel, onSubmit }) {
  const [remarks, setRemarks] = useState("");
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Close Inquiry</h3>
        <p className="amx-modal-sub">The sender will automatically receive a closing email with these notes, if any.</p>
        <div className="amx-form-group" style={{ marginTop: 16 }}>
          <label htmlFor="close-remarks">Closing notes (optional)</label>
          <textarea id="close-remarks" rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="What was resolved, or why this is being closed…" />
        </div>
        <button className="amx-btn amx-btn-accent" style={{ width: "100%" }} onClick={() => onSubmit(remarks.trim())}>
          <Icon name="check" size={16} /> Close Inquiry
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

function ContactInquiryReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [history, setHistory] = useState([]);
  const [modal, setModal] = useState(null); // null | "reply" | "close" | "note"
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminApi.get(`/contact-inquiries/${id}`).then(({ data }) => {
      setContact(data.contact);
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

  if (!contact) return <div className="amx-empty"><Icon name="mail" /><strong>Loading…</strong></div>;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/contact-inquiries")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Contact Us Inquiries
          </button>
          <h1 style={{ marginTop: 10 }} className="mono">{contact.reference}</h1>
          <p>{contact.topic}</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center" }}>
          <StatusBadge status={contact.status} />
        </div>
      </div>

      <div className="amx-editor-layout">
        <div>
          <Section title="Submitted By">
            <Row label="Name" value={contact.fullName} />
            <Row label="Email" value={contact.email} />
            <Row label="Topic" value={contact.topic} />
            <Row label="Submitted On" value={formatDateTime(contact.createdAt)} />
          </Section>

          <Section title="Message">
            <p style={{ whiteSpace: "pre-wrap" }}>{contact.message}</p>
          </Section>

          {contact.status === "closed" && (
            <Section title="Closure">
              <Row label="Closed By" value={contact.closedBy} />
              <Row label="Closed On" value={contact.closedAt ? formatDateTime(contact.closedAt) : null} />
              <div style={{ marginBottom: 12 }}>
                <span className="amx-panel-sub" style={{ display: "block", marginBottom: 4 }}>Closing Notes</span>
                <p style={{ whiteSpace: "pre-wrap" }}>{contact.closingRemarks || "—"}</p>
              </div>
            </Section>
          )}

          <Section title="Activity History">
            {history.map((h) => (
              <div key={h.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--a-border)" }}>
                <strong style={{ textTransform: "capitalize" }}>{h.action.replace(/_/g, " ")}</strong>
                <span className="amx-panel-sub" style={{ marginLeft: 8 }}>{formatDateTime(h.createdAt)} · {h.actorType === "admin" ? h.actorName : contact.fullName}</span>
                {h.note && <p style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{h.note}</p>}
              </div>
            ))}
            {history.length === 0 && <p>No history yet.</p>}
          </Section>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head"><h3>Actions</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => setModal("reply")}>
              <Icon name="mail" size={16} /> Reply to Sender
            </button>

            {contact.status === "open" && (
              <button
                className="amx-btn amx-btn-outline"
                disabled={busy}
                onClick={() => act(() => adminApi.post(`/contact-inquiries/${id}/in-progress`, {}), "Marked as in progress.")}
              >
                Mark In Progress
              </button>
            )}
            {contact.status !== "closed" && (
              <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => setModal("close")}>
                Close Inquiry
              </button>
            )}
            {contact.status === "closed" && (
              <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => act(() => adminApi.post(`/contact-inquiries/${id}/reopen`, {}), "Inquiry reopened.")}>
                Reopen Inquiry
              </button>
            )}
          </div>

          <div className="amx-dropdown-sep" style={{ margin: "18px 0" }} />
          <button className="amx-btn amx-btn-outline" disabled={busy} style={{ width: "100%" }} onClick={() => setModal("note")}>
            <Icon name="edit" size={15} /> Add Internal Note
          </button>
        </div>
      </div>

      {modal === "reply" && (
        <ReplyModal
          onCancel={() => setModal(null)}
          onSubmit={(message) => act(() => adminApi.post(`/contact-inquiries/${id}/reply`, { message }), "Reply sent.")}
        />
      )}

      {modal === "close" && (
        <CloseModal
          onCancel={() => setModal(null)}
          onSubmit={(note) => act(() => adminApi.post(`/contact-inquiries/${id}/close`, { note }), "Inquiry closed.")}
        />
      )}

      {modal === "note" && (
        <NoteModal
          title="Add Internal Note"
          placeholder="Add a note for the team's reference…"
          onCancel={() => setModal(null)}
          onSubmit={(note) => act(() => adminApi.post(`/contact-inquiries/${id}/notes`, { note }), "Note added.")}
        />
      )}

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default ContactInquiryReview;
