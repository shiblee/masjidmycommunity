import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/Icons.jsx";
import { Field } from "../../components/masjid/ContactPersonForm.jsx";

function emptyForm() {
  return { upiId: "", upiAccountHolder: "", bankName: "", accountHolderName: "", accountNumber: "", ifscCode: "", branchName: "" };
}

// Owner-facing counterpart to the admin's read-only "verify" toggle on this
// same data (MasjidReview.jsx) — this is the only place these details can
// actually be entered. Reused by the campaign donation flow (DonateModal)
// once set, which is what unlocks the "I've Sent It" step and, downstream,
// the anonymous-donation checkbox on it.
function DonationAccountSection({ basePath, api }) {
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(null);
  const [editable, setEditable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`${basePath}/donation-account`)
      .then(({ data }) => {
        setSaved(data.donationAccount);
        setEditable(data.editable);
        if (data.donationAccount) {
          setForm({
            upiId: data.donationAccount.upiId || "",
            upiAccountHolder: data.donationAccount.upiAccountHolder || "",
            bankName: data.donationAccount.bankName || "",
            accountHolderName: data.donationAccount.accountHolderName || "",
            accountNumber: "",
            ifscCode: data.donationAccount.ifscCode || "",
            branchName: data.donationAccount.branchName || "",
          });
        }
      })
      .catch(() => setError("Couldn't load donation account details."))
      .finally(() => setLoading(false));
  }, [api, basePath]);

  useEffect(() => { load(); }, [load]);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(`${basePath}/donation-account`, form);
      setSaved(data.donationAccount);
      setEditing(false);
      setNotice("Donation account saved. It's now shown on your campaigns.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save donation account.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="msj-summary-block"><p>Loading donation account…</p></div>;

  return (
    <div className="msj-summary-block msj-donation-account-section">
      <div className="msj-summary-head">
        <h4><Icon name="wallet" size={15} /> Donation Account</h4>
        {editable && saved && !editing && <button type="button" onClick={() => setEditing(true)}>Edit</button>}
      </div>

      {!editable && (
        <p className="msj-note">Donation details can't be edited while this masjid's submission is under review.</p>
      )}

      {editable && !editing && !saved && (
        <>
          <p>
            Add a UPI ID or bank account so donors have somewhere to send funds. Until this is set, the Donate button
            on your campaigns can't move past picking an amount.
          </p>
          <button type="button" className="btn btn-gold" onClick={() => setEditing(true)}>Add Donation Account</button>
        </>
      )}

      {editable && !editing && saved && (
        <div className="camp-donate-account">
          {saved.verified ? (
            <span className="acct-status-pill" style={{ marginBottom: 10 }}><Icon name="check" size={12} /> Verified by admin</span>
          ) : (
            <span className="acct-status-pill pending_verification" style={{ marginBottom: 10 }}>Pending admin verification</span>
          )}
          {saved.upiId && <div><span>UPI ID</span><strong>{saved.upiId}</strong></div>}
          {saved.upiAccountHolder && <div><span>UPI Holder</span><strong>{saved.upiAccountHolder}</strong></div>}
          {saved.bankName && <div><span>Bank</span><strong>{saved.bankName}</strong></div>}
          {saved.accountHolderName && <div><span>Account Holder</span><strong>{saved.accountHolderName}</strong></div>}
          {saved.accountNumberMasked && <div><span>Account No.</span><strong>{saved.accountNumberMasked}</strong></div>}
          {saved.ifscCode && <div><span>IFSC</span><strong>{saved.ifscCode}</strong></div>}
        </div>
      )}

      {editable && editing && (
        <form onSubmit={save} className="msj-donation-account-form">
          <p className="msj-note" style={{ marginBottom: 12 }}>Provide either a UPI ID, bank details, or both.</p>
          {error && <span className="auth-field-error" style={{ display: "block", marginBottom: 10 }}>{error}</span>}

          <div className="contact-field-row">
            <Field label="UPI ID"><input type="text" value={form.upiId} onChange={update("upiId")} placeholder="name@okhdfcbank" /></Field>
            <Field label="UPI Account Holder Name"><input type="text" value={form.upiAccountHolder} onChange={update("upiAccountHolder")} /></Field>
          </div>
          <div className="contact-field-row">
            <Field label="Bank Name"><input type="text" value={form.bankName} onChange={update("bankName")} /></Field>
            <Field label="Account Holder Name"><input type="text" value={form.accountHolderName} onChange={update("accountHolderName")} /></Field>
          </div>
          <div className="contact-field-row">
            <Field label="Account Number" hint={saved?.accountNumberMasked ? `Currently ${saved.accountNumberMasked} — leave blank to keep it` : undefined}>
              <input type="text" value={form.accountNumber} onChange={update("accountNumber")} placeholder={saved?.accountNumberMasked || "9–18 digits"} />
            </Field>
            <Field label="IFSC Code"><input type="text" value={form.ifscCode} onChange={update("ifscCode")} placeholder="HDFC0001234" /></Field>
          </div>
          <Field label="Branch Name (optional)"><input type="text" value={form.branchName} onChange={update("branchName")} /></Field>

          <div className="msj-prayer-savebar">
            <button type="button" className="btn btn-outline-ink" onClick={() => { setEditing(false); setError(""); load(); }} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? "Saving…" : "Save Donation Account"}</button>
          </div>
        </form>
      )}

      {notice && <span className="msj-prayer-notice">{notice}</span>}
    </div>
  );
}

export default DonationAccountSection;
