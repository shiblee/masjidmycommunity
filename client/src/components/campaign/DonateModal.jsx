import React, { useState } from "react";
import { Icon } from "../Icons.jsx";

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// No online payment gateway exists on this platform yet — every donation is
// still a manual bank/UPI transfer that an admin later confirms and records
// (see server/src/models/Donation.js). This modal doesn't submit anything;
// the amount picker is purely for the donor's own reference while they
// transfer, and the "I've sent it" step just closes with next-step copy —
// it intentionally never claims to have processed a payment.
function DonateModal({ campaign, donationAccount, onClose }) {
  const [amount, setAmount] = useState(PRESET_AMOUNTS[1]);
  const [custom, setCustom] = useState("");
  const [sent, setSent] = useState(false);
  const effectiveAmount = custom ? Number(custom) : amount;

  if (sent) {
    return (
      <div className="msj-modal-overlay" onClick={onClose}>
        <div className="msj-modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
          <div className="msj-confirm-icon" style={{ margin: "0 auto 16px" }}><Icon name="check" size={28} /></div>
          <h3>Thank you!</h3>
          <p className="msj-modal-sub">
            The masjid has been notified to look out for your transfer. Once they confirm it, your contribution will appear on this campaign.
          </p>
          <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={onClose} type="button">
            Close
          </button>
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
            <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center" }} onClick={() => setSent(true)} type="button">
              I've Sent It
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DonateModal;
