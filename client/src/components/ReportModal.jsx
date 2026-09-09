import React, { useState } from "react";
import { Icon } from "./Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

// Generic "report this content" modal — used for Wall posts and, per the
// same moderation model, comments/replies. `title` swaps the heading only;
// everything else (reasons, Other textbox, success state) is shared.
function ReportModal({ title, reasons, busy, error, success, onCancel, onSubmit }) {
  const { t } = useTranslation();
  const resolvedTitle = title || t("reportModal.defaultTitle", "Report Content");
  const closeLabel = t("reportModal.close", "Close");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const needsComment = reason === "Other";
  const canSubmit = reason && (!needsComment || comment.trim());

  if (success) {
    return (
      <div className="msj-modal-overlay" onClick={onCancel}>
        <div className="msj-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
          <div className="msj-confirm-icon" style={{ margin: "0 auto 16px" }}><Icon name="check" size={28} /></div>
          <h3>{t("reportModal.successTitle", "Report Submitted Successfully")}</h3>
          <p className="msj-modal-sub">
            {t("reportModal.successBody", "Thank you for helping us keep our community safe. The reported content will be reviewed by our administration team.")}
          </p>
          <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={onCancel} type="button">
            {closeLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="msj-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        {!busy && <button className="msj-modal-close" onClick={onCancel} aria-label={closeLabel}><Icon name="x" size={16} /></button>}
        <h3>{resolvedTitle}</h3>
        <p className="msj-modal-sub">{t("reportModal.reasonPrompt", "Why are you reporting this?")}</p>

        <div className="msj-reason-list">
          {reasons.map((r) => (
            <label className="msj-reason-option" key={r.id}>
              <input
                type="radio"
                name="report-reason"
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
            <label>{t("reportModal.otherReasonLabel", "Other Reason")}<span className="msj-required">*</span></label>
            <textarea rows={6} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("reportModal.otherReasonPlaceholder", "Tell us more…")} />
          </div>
        )}

        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel} disabled={busy} type="button">
            {t("reportModal.cancel", "Cancel")}
          </button>
          <button
            className="btn btn-gold"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={busy || !canSubmit}
            onClick={() => onSubmit({ reason, comment: comment.trim() })}
            type="button"
          >
            {busy ? t("reportModal.submitting", "Submitting…") : t("reportModal.submit", "Submit Report")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
