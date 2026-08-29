import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "../Icons.jsx";
import { API_BASE } from "../../config.js";
import masjidApi from "../../services/masjidApi.js";

// The full "controlled masjid deletion" workflow — campaign-dependency gate,
// admin-managed reason selection, final confirmation, success state. Shared
// between My Masjids and anywhere else a masjid can be deleted (e.g. the
// Community Wall's post menu) so the UX and business rules never drift apart.

function CannotDeleteModal({ masjid, onClose }) {
  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Masjid Cannot Be Deleted</h3>
        <p className="msj-modal-sub">
          "{masjid.name}" is currently associated with {masjid.campaignCount} campaign{masjid.campaignCount === 1 ? "" : "s"}. Please
          close/remove the associated campaigns before deleting the masjid.
        </p>
        <Link to={`/account/my-campaigns?masjidId=${masjid.id}`} className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>
          View Associated Campaigns
        </Link>
        <button className="btn btn-outline-ink" style={{ width: "100%", justifyContent: "center" }} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </div>
  );
}

function DeleteReasonModal({ masjid, reasons, onCancel, onSubmit }) {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const needsComment = reason === "Other";
  const canSubmit = reason && (!needsComment || comment.trim());

  return (
    <div className="msj-modal-overlay" onClick={onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Delete Masjid</h3>
        <p className="msj-modal-sub">Please tell us why you would like to delete "{masjid.name}".</p>

        <div className="auth-field">
          <label>Reason for Deletion *</label>
        </div>
        <div className="msj-reason-list">
          {reasons.map((r) => (
            <label className="msj-reason-option" key={r.id}>
              <input
                type="radio"
                name="deletion-reason"
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

function FinalConfirmModal({ masjid, busy, error, onCancel, onConfirm }) {
  return (
    <div className="msj-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        {!busy && <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>}
        <h3>Are you sure you want to delete this masjid?</h3>
        <p className="msj-modal-sub">
          This action will remove "{masjid.name}" from your account. Please confirm that you want to proceed.
        </p>
        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }} onClick={onCancel} disabled={busy} type="button">
            Cancel
          </button>
          <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }} onClick={onConfirm} disabled={busy} type="button">
            {busy ? "Deleting…" : "Yes, Delete Masjid"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ masjidName, onClose }) {
  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <div className="msj-confirm-icon" style={{ margin: "0 auto 16px" }}><Icon name="check" size={28} /></div>
        <h3>Masjid Deleted Successfully</h3>
        <p className="msj-modal-sub">
          "{masjidName}" has been successfully removed from your account. Thank you for keeping your masjid information up to date.
        </p>
        <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={onClose} type="button">
          Close
        </button>
      </div>
    </div>
  );
}

function MasjidDeleteFlow({ masjid, onClose, onDeleted }) {
  const [deletionReasons, setDeletionReasons] = useState([]);
  const [step, setStep] = useState(masjid.campaignCount > 0 ? "blocked" : "reason");
  const [payload, setPayload] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${API_BASE}/masjids/public/deletion-reasons`)
      .then(({ data }) => setDeletionReasons(data.reasons))
      .catch(() => {});
  }, []);

  const submitReason = (p) => {
    setPayload(p);
    setStep("confirm");
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError("");
    try {
      await masjidApi.post(`/${masjid.id}/delete`, payload);
      setStep("success");
      onDeleted?.(masjid.id);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't delete this masjid. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {step === "blocked" && <CannotDeleteModal masjid={masjid} onClose={onClose} />}
      {step === "reason" && <DeleteReasonModal masjid={masjid} reasons={deletionReasons} onCancel={onClose} onSubmit={submitReason} />}
      {step === "confirm" && (
        <FinalConfirmModal masjid={masjid} busy={busy} error={error} onCancel={onClose} onConfirm={confirmDelete} />
      )}
      {step === "success" && <SuccessModal masjidName={masjid.name} onClose={onClose} />}
    </>
  );
}

export default MasjidDeleteFlow;
