import React, { useState } from "react";
import { Link } from "react-router-dom";
import campaignApi from "../../services/campaignApi.js";
import { Icon } from "../Icons.jsx";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// No online payment gateway exists on this platform yet — every donation is
// still a manual bank/UPI transfer. What this modal actually submits is the
// donor's own CLAIM that they sent it. DEMO MODE: submitDonationClaim
// (publicCampaignController.js) currently auto-records every claim
// (status:"recorded") the moment it's submitted, immediately counting it
// toward the public total, rather than leaving it "pending" for an admin to
// confirm first — there's no way to verify a real transfer without a
// gateway, so this demonstrates the end-to-end flow without a manual step
// in between. The "pending" status and admin confirm/decline are still
// fully in place (adminCampaignController.js) for when a real gateway
// replaces this whole flow and auto-recording is reverted.
// Submitting a claim requires sign-in (server-enforced too) so every claim
// is tied to a real account, not just free-text a visitor could fake.
function DonateModal({ campaign, donationAccount, slug, user, onClose }) {
  useBodyScrollLock();
  const { t } = useTranslation();
  const [amount, setAmount] = useState(PRESET_AMOUNTS[1]);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState("amount"); // "amount" | "claim" | "done"
  const [donorEmail, setDonorEmail] = useState(user?.email || "");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const effectiveAmount = custom ? Number(custom) : amount;
  const closeLabel = t("donateModal.close", "Close");
  const sentItLabel = t("donateModal.sentIt", "I've Sent It");

  const submitClaim = async () => {
    setSubmitting(true);
    setError("");
    try {
      await campaignApi.post(`/public/${slug}/donations`, {
        donorEmail: donorEmail.trim() || undefined,
        amount: effectiveAmount,
        method: donationAccount?.upiId ? "upi" : "bank_transfer",
        isAnonymous,
      });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.message || t("donateModal.error", "Couldn't submit this — please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="msj-modal-overlay" onClick={onClose}>
        <div className="msj-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
          <div className="msj-confirm-icon" style={{ margin: "0 auto 16px" }}><Icon name="check" size={28} /></div>
          <h3>{t("donateModal.thankYouTitle", "Thank you!")}</h3>
          <p className="msj-modal-sub">
            {t("donateModal.thankYouBody", "Your ₹{amount} contribution has been recorded and now counts toward this campaign's total.").replace("{amount}", effectiveAmount.toLocaleString("en-IN"))}
          </p>
          <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={onClose} type="button">
            {closeLabel}
          </button>
        </div>
      </div>
    );
  }

  if (step === "claim" && !user) {
    return (
      <div className="msj-modal-overlay" onClick={onClose}>
        <div className="msj-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
          <button className="msj-modal-close" onClick={onClose} aria-label={closeLabel}><Icon name="x" size={16} /></button>
          <div className="msj-confirm-icon" style={{ margin: "0 auto 16px" }}><Icon name="heart" size={26} /></div>
          <h3>{t("donateModal.signInTitle", "Sign in to confirm your donation")}</h3>
          <p className="msj-modal-sub">
            {t("donateModal.signInBody", "Letting the masjid know you've sent ₹{amount} needs an account, so your claim is tied to someone real and not just anonymous text.").replace("{amount}", effectiveAmount.toLocaleString("en-IN"))}
          </p>
          <Link
            to={`/auth?redirect=${encodeURIComponent(`/campaign/${slug}?donate=1`)}`}
            className="btn btn-gold"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {t("donateModal.signIn", "Sign In")}
          </Link>
        </div>
      </div>
    );
  }

  if (step === "claim") {
    return (
      <div className="msj-modal-overlay" onClick={submitting ? undefined : onClose}>
        <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
          {!submitting && <button className="msj-modal-close" onClick={onClose} aria-label={closeLabel}><Icon name="x" size={16} /></button>}
          <h3>{t("donateModal.claimTitle", "Let the masjid know")}</h3>
          <p className="msj-modal-sub">{t("donateModal.claimBody", "Once you've sent ₹{amount}, confirm the claim below.").replace("{amount}", effectiveAmount.toLocaleString("en-IN"))}</p>

          <div className="camp-donate-account" style={{ marginBottom: 16 }}>
            <div><span>{t("donateModal.donatingAs", "Donating as")}</span><strong>{isAnonymous ? t("donateModal.anonymous", "Anonymous") : (user?.fullName || t("donateModal.you", "You"))}</strong></div>
          </div>

          <label className="msj-ack-row" style={{ marginTop: 0, marginBottom: 16 }}>
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} />
            {t("donateModal.anonymousCheckboxLabel", "Donate Anonymously — don't show my name publicly on this campaign's donor list or activity feed. Your account is still kept on file for payment, compliance and audit purposes.")}
          </label>

          <div className="auth-field">
            <label>{t("donateModal.emailLabel", "Email (optional, for follow-up)")}</label>
            <input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} maxLength={180} />
          </div>

          {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep("amount")} disabled={submitting} type="button">
              {t("donateModal.back", "Back")}
            </button>
            <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center" }} onClick={submitClaim} disabled={submitting} type="button">
              {submitting ? t("donateModal.submitting", "Submitting…") : sentItLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label={closeLabel}><Icon name="x" size={16} /></button>
        <h3>{t("donateModal.donateToTitle", "Donate to {title}").replace("{title}", campaign.title)}</h3>
        <p className="msj-modal-sub">{t("donateModal.pickAmountBody", "Pick an amount for your own reference, then transfer it using the masjid's verified details below.")}</p>

        <div className="camp-donate-amounts">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              className={`camp-donate-amount${!custom && amount === a ? " active" : ""}`}
              onClick={() => { setAmount(a); setCustom(""); }}
            >
              ₹{a.toLocaleString("en-IN")}
            </button>
          ))}
        </div>
        <div className="auth-field" style={{ marginTop: 12 }}>
          <label>{t("donateModal.customAmountLabel", "Or enter a custom amount (INR)")}</label>
          <input type="number" min="1" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={t("donateModal.customAmountPlaceholder", "e.g. 7500")} />
        </div>

        {donationAccount ? (
          <div className="camp-donate-account" style={{ marginTop: 16 }}>
            {effectiveAmount > 0 && <p className="msj-note" style={{ marginBottom: 10 }}>{t("donateModal.amountToTransfer", "Amount to transfer:")} <strong>₹{effectiveAmount.toLocaleString("en-IN")}</strong></p>}
            {donationAccount.upiId && <div><span>{t("donationAccount.upiIdLabel", "UPI ID")}</span><strong>{donationAccount.upiId}</strong></div>}
            {donationAccount.upiAccountHolder && <div><span>{t("donationAccount.upiHolderLabel", "UPI Holder")}</span><strong>{donationAccount.upiAccountHolder}</strong></div>}
            {donationAccount.bankName && <div><span>{t("donationAccount.bankLabel", "Bank")}</span><strong>{donationAccount.bankName}</strong></div>}
            {donationAccount.accountHolderName && <div><span>{t("donationAccount.accountHolderLabel", "Account Holder")}</span><strong>{donationAccount.accountHolderName}</strong></div>}
            {donationAccount.accountNumberMasked && <div><span>{t("donationAccount.accountNoLabel", "Account No.")}</span><strong>{donationAccount.accountNumberMasked}</strong></div>}
            {donationAccount.ifscCode && <div><span>{t("donationAccount.ifscLabel", "IFSC")}</span><strong>{donationAccount.ifscCode}</strong></div>}
          </div>
        ) : (
          <p className="msj-note" style={{ marginTop: 16 }}>{t("donateModal.noAccountYet", "This masjid hasn't published verified donation details yet — check back soon.")}</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={onClose} type="button">
            {closeLabel}
          </button>
          {donationAccount && (
            <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center" }} disabled={!(effectiveAmount > 0)} onClick={() => setStep("claim")} type="button">
              {sentItLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DonateModal;
