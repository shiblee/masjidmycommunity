import React, { useEffect, useState } from "react";
import { Icon } from "../Icons.jsx";
import communityApi from "../../services/communityApi.js";

// Mirrors MasjidDeleteFlow.jsx's reason -> confirm -> success shape exactly,
// minus its "blocked" step (a Reel has no campaign-style dependency to
// clear first).

function DeleteReasonModal({ reasons, onCancel, onSubmit }) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const needsComment = reason === "Other";
  const canSubmit = reason && (!needsComment || comment.trim());

  return (
    <div className="msj-modal-overlay" onClick={onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Delete Reel</h3>
        <p className="msj-modal-sub">Please tell us why you would like to delete this Reel.</p>

        <div className="auth-field">
          <label>Reason for Deletion *</label>
        </div>
        <div className="msj-reason-list">
          {reasons.map((r) => (
            <label className="msj-reason-option" key={r.id}>
              <input
                type="radio"
                name="reel-deletion-reason"
                value={r.name}
                checked={reason === r.name}
                onChange={() => {
                  setReason(r.name);
                  if (r.name !== "Other") setComment("");
                }}
              />
              {r.name}
            </label>
          ))}
        </div>

        {needsComment && (
          <div className="auth-field">
            <label>Other Reason / Additional Comments<span className="msj-required">*</span></label>
            <textarea rows={6} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add any additional detail…" />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="btn btn-gold"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={!canSubmit}
            onClick={() => onSubmit({ reason, comment: comment.trim() })}
            type="button"
          >
            Submit Delete Request
          </button>
        </div>
      </div>
    </div>
  );
}

function FinalConfirmModal({ busy, error, onCancel, onConfirm }) {
  return (
    <div className="msj-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        {!busy && <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>}
        <h3>Are you sure you want to delete this Reel?</h3>
        <p className="msj-modal-sub">This will remove it from your account and the public Reels feed. Please confirm that you want to proceed.</p>
        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }} onClick={onCancel} disabled={busy} type="button">
            Cancel
          </button>
          <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }} onClick={onConfirm} disabled={busy} type="button">
            {busy ? "Deleting…" : "Yes, Delete Reel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ onClose }) {
  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <div className="msj-confirm-icon" style={{ margin: "0 auto 16px" }}><Icon name="check" size={28} /></div>
        <h3>Reel Deleted</h3>
        <p className="msj-modal-sub">Your Reel has been removed. Thank you for keeping your content up to date.</p>
        <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </div>
  );
}

function ReelDeleteFlow({ activityId, onClose, onDeleted }) {
  const [reasons, setReasons] = useState([]);
  const [step, setStep] = useState("reason");
  const [payload, setPayload] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    communityApi.get("/reel-deletion-reasons").then(({ data }) => setReasons(data.reasons)).catch(() => {});
  }, []);

  const submitReason = (p) => {
    setPayload(p);
    setStep("confirm");
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError("");
    try {
      await communityApi.delete(`/reels/${activityId}`, { data: payload });
      setStep("success");
      onDeleted?.(activityId);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete this Reel. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {step === "reason" && <DeleteReasonModal reasons={reasons} onCancel={onClose} onSubmit={submitReason} />}
      {step === "confirm" && <FinalConfirmModal busy={busy} error={error} onCancel={onClose} onConfirm={confirmDelete} />}
      {step === "success" && <SuccessModal onClose={onClose} />}
    </>
  );
}

export default ReelDeleteFlow;
