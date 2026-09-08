import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../Icons.jsx";

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// No online payment gateway exists on this platform yet — every donation is
// still a manual bank/UPI transfer. What this modal actually submits is the
// donor's own CLAIM that they sent it (status:"pending", never counted
// toward the public raised total — see server/src/models/Donation.js) so
// the masjid/admin is notified and can review it, rather than a donor's
// transfer going completely unnoticed until they separately message someone.
// A real payment gateway is a planned future replacement for this whole flow.
function DonateModal({ campaign, donationAccount, slug, onClose }) {
  const [amount, setAmount] = useState(PRESET_AMOUNTS[1]);
  const [custom, setCustom] = useState("");
  const [step, setStep] = useState("amount"); // "amount" | "claim" | "done"
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const effectiveAmount = custom ? Number(custom) : amount;

  const submitClaim = async () => {
    setSubmitting(true);
    setError("");
    try {
      await axios.post(`${API_BASE}/campaigns/public/${slug}/donations`, {
        donorName: donorName.trim() || undefined,
        donorEmail: donorEmail.trim() || undefined,
        amount: effectiveAmount,
        method: donationAccount?.upiId ? "upi" : "bank_transfer",
      });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit this — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <div className="msj-modal-overlay" onClick={onClose}>
        <div className="msj-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
          <div className="msj-confirm-icon" style={{ margin: "0 auto 16px" }}><Icon name="check" size={28} /></div>
          <h3>Thank you!</h3>
          <p className="msj-modal-sub">
            The masjid has been notified of your ₹{effectiveAmount.toLocaleString("en-IN")} transfer. Once they confirm it, your contribution will appear on this campaign's total.
          </p>
          <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    );
  }

  if (step === "claim") {
    return (
      <div className="msj-modal-overlay" onClick={submitting ? undefined : onClose}>
        <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
          {!submitting && <button className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>}
          <h3>Let the masjid know</h3>
          <p className="msj-modal-sub">Once you've sent ₹{effectiveAmount.toLocaleString("en-IN")}, tell us who to look out for — this is optional, but it helps the masjid match your transfer.</p>

          <div className="auth-field">
            <label>Your Name (optional)</label>
            <input value={donorName} onChange={(e) => setDonorName(e.target.value)} placeholder="Anonymous if left blank" maxLength={120} />
          </div>
          <div className="auth-field">
            <label>Email (optional, for follow-up)</label>
            <input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} maxLength={180} />
          </div>

          {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={() => setStep("amount")} disabled={submitting} type="button">
              Back
            </button>
            <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center" }} onClick={submitClaim} disabled={submitting} type="button">
              {submitting ? "Submitting…" : "I've Sent It"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>Donate to {campaign.title}</h3>
        <p className="msj-modal-sub">Pick an amount for your own reference, then transfer it using the masjid's verified details below.</p>

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
          <label>Or enter a custom amount (INR)</label>
          <input type="number" min="1" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. 7500" />
        </div>

        {donationAccount ? (
          <div className="camp-donate-account" style={{ marginTop: 16 }}>
            {effectiveAmount > 0 && <p className="msj-note" style={{ marginBottom: 10 }}>Amount to transfer: <strong>₹{effectiveAmount.toLocaleString("en-IN")}</strong></p>}
            {donationAccount.upiId && <div><span>UPI ID</span><strong>{donationAccount.upiId}</strong></div>}
            {donationAccount.upiAccountHolder && <div><span>UPI Holder</span><strong>{donationAccount.upiAccountHolder}</strong></div>}
            {donationAccount.bankName && <div><span>Bank</span><strong>{donationAccount.bankName}</strong></div>}
            {donationAccount.accountHolderName && <div><span>Account Holder</span><strong>{donationAccount.accountHolderName}</strong></div>}
            {donationAccount.accountNumberMasked && <div><span>Account No.</span><strong>{donationAccount.accountNumberMasked}</strong></div>}
            {donationAccount.ifscCode && <div><span>IFSC</span><strong>{donationAccount.ifscCode}</strong></div>}
          </div>
        ) : (
          <p className="msj-note" style={{ marginTop: 16 }}>This masjid hasn't published verified donation details yet — check back soon.</p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={onClose} type="button">
            Close
          </button>
          {donationAccount && (
            <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center" }} disabled={!(effectiveAmount > 0)} onClick={() => setStep("claim")} type="button">
              I've Sent It
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DonateModal;
