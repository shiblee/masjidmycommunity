import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/Icons.jsx";
import { Field } from "../../components/masjid/ContactPersonForm.jsx";

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function emptyForm() {
  return { upiId: "", upiAccountHolder: "", bankId: "", accountHolderName: "", accountNumber: "" };
}

// Owner-facing counterpart to the admin's read-only "verify" toggle on this
// same data (MasjidReview.jsx) — this is the only place these details can
// actually be entered. Reused by the campaign donation flow (DonateModal)
// once set, which is what unlocks the "I've Sent It" step and, downstream,
// the anonymous-donation checkbox on it.
//
// Bank is a dropdown sourced from the admin-managed Bank master list, and
// IFSC is verified live against that specific bank (via the shared
// verifyIfscForBank check in ifscLookupService.js) before Branch Name is
// auto-filled — the owner can never type a mismatched or fake IFSC/branch,
// and the same check runs again server-side on save so this can't be
// bypassed by calling the API directly.
function DonationAccountSection({ basePath, api }) {
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [ifscInput, setIfscInput] = useState("");
  const [saved, setSaved] = useState(null);
  const [editable, setEditable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState("");

  const [verifyState, setVerifyState] = useState("idle"); // idle | checking | verified | failed
  const [verifiedBranch, setVerifiedBranch] = useState(null); // { branchName, address, city, state }

  useEffect(() => {
    api.get("/public/banks").then(({ data }) => setBanks(data.banks)).catch(() => {});
  }, [api]);

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
            bankId: data.donationAccount.bankId || "",
            accountHolderName: data.donationAccount.accountHolderName || "",
            accountNumber: "",
          });
          setIfscInput(data.donationAccount.ifscCode || "");
          if (data.donationAccount.branchName) {
            setVerifiedBranch({
              branchName: data.donationAccount.branchName,
              city: data.donationAccount.branchCity,
              state: data.donationAccount.branchState,
              address: data.donationAccount.branchAddress,
            });
          }
        }
      })
      .catch(() => setError("Couldn't load donation account details."))
      .finally(() => setLoading(false));
  }, [api, basePath]);

  useEffect(() => { load(); }, [load]);

  // Debounced live verification — fires whenever both a bank and a
  // full-length IFSC are present, and resets to idle the moment either
  // changes so a stale "verified" state can never survive editing.
  useEffect(() => {
    setVerifyState("idle");
    setVerifiedBranch(null);
    setFieldErrors((f) => ({ ...f, ifscCode: null, bankId: null }));
    const ifsc = ifscInput.trim().toUpperCase();
    if (!form.bankId || !IFSC_RE.test(ifsc)) return undefined;

    const handle = setTimeout(() => {
      setVerifyState("checking");
      api
        .get(`${basePath}/donation-account/verify-ifsc`, { params: { ifsc, bankId: form.bankId } })
        .then(({ data }) => {
          setVerifyState("verified");
          setVerifiedBranch({ branchName: data.branchName, address: data.address, city: data.city, state: data.state });
        })
        .catch((err) => {
          setVerifyState("failed");
          const resp = err.response?.data;
          setFieldErrors((f) => ({ ...f, [resp?.field || "ifscCode"]: resp?.message || "Couldn't verify this IFSC." }));
        });
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.bankId, ifscInput]);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((f) => ({ ...f, [field]: null }));
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (form.accountNumber.trim() && verifyState !== "verified") {
      setError("Verify the IFSC code before saving.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`${basePath}/donation-account`, {
        upiId: form.upiId,
        upiAccountHolder: form.upiAccountHolder,
        bankId: form.bankId || undefined,
        accountHolderName: form.accountHolderName,
        accountNumber: form.accountNumber,
        ifscCode: ifscInput,
      });
      setSaved(data.donationAccount);
      setEditing(false);
      setNotice("Donation account saved. It's now shown on your campaigns.");
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.field) setFieldErrors((f) => ({ ...f, [resp.field]: resp.message }));
      else setError(resp?.message || "Couldn't save donation account.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="msj-summary-block"><p>Loading donation account…</p></div>;

  const bankName = (id) => banks.find((b) => String(b.id) === String(id))?.name;

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
          {saved.branchName && <div><span>Branch</span><strong>{saved.branchName}{saved.branchCity ? `, ${saved.branchCity}` : ""}</strong></div>}
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
            <Field label="Bank Name" error={fieldErrors.bankId}>
              <select value={form.bankId} onChange={update("bankId")}>
                <option value="">Select a bank…</option>
                {banks.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Account Holder Name"><input type="text" value={form.accountHolderName} onChange={update("accountHolderName")} /></Field>
          </div>

          <div className="contact-field-row">
            <Field
              label="Account Number"
              hint={saved?.accountNumberMasked ? `Currently ${saved.accountNumberMasked} — leave blank to keep it` : undefined}
            >
              <input type="text" value={form.accountNumber} onChange={update("accountNumber")} placeholder={saved?.accountNumberMasked || "9–18 digits"} />
            </Field>
            <Field
              label="IFSC Code"
              error={fieldErrors.ifscCode}
              hint={!fieldErrors.ifscCode && !form.bankId ? "Select a bank first" : undefined}
              labelExtra={
                verifyState === "checking" ? <span className="msj-donation-verify-status checking">Verifying…</span> :
                verifyState === "verified" ? <span className="msj-donation-verify-status ok"><Icon name="check" size={12} /> Verified</span> :
                null
              }
            >
              <input
                type="text"
                value={ifscInput}
                onChange={(e) => setIfscInput(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                maxLength={11}
                disabled={!form.bankId}
              />
            </Field>
          </div>

          <Field label="Branch Name">
            <input type="text" value={verifiedBranch?.branchName || ""} placeholder="Auto-filled once the IFSC is verified" readOnly disabled />
          </Field>
          {verifiedBranch?.address && (
            <p className="msj-field-hint" style={{ marginTop: -8, marginBottom: 14 }}>
              {[verifiedBranch.address, verifiedBranch.city, verifiedBranch.state].filter(Boolean).join(", ")}
            </p>
          )}

          <div className="msj-prayer-savebar">
            <button type="button" className="btn btn-outline-ink" onClick={() => { setEditing(false); setError(""); setFieldErrors({}); load(); }} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? "Saving…" : "Save Donation Account"}</button>
          </div>
        </form>
      )}

      {notice && <span className="msj-prayer-notice">{notice}</span>}
    </div>
  );
}

export default DonationAccountSection;
