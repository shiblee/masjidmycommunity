import React, { useState } from "react";
import { Link } from "react-router-dom";

const concernTypes = [
  "Donation issue",
  "Fundraising campaign concern",
  "Masjid verification issue",
  "Fund utilization concern",
  "Account-related issue",
  "Platform misuse",
  "Something else",
];

const steps = [
  { num: "01", title: "You submit", body: "Your report reaches our trust & safety team, along with a reference number for your records." },
  { num: "02", title: "We review", body: "We look into the concern, and may reach out to you or the masjid committee for more information." },
  { num: "03", title: "We follow up", body: "You'll hear back at the email you provide, typically within 48 hours, with the outcome or next steps." },
];

function makeReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CONCERN-${code}`;
}

function RaiseConcern() {
  const [form, setForm] = useState({ type: "", reference: "", email: "", details: "" });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null }));
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.type) next.type = "Please choose the type of concern.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email so we can follow up.";
    if (form.details.trim().length < 20) next.details = "Please provide at least a few sentences of detail.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitted(makeReference());
  };

  const resetForm = () => {
    setForm({ type: "", reference: "", email: "", details: "" });
    setErrors({});
    setSubmitted(null);
  };

  return (
    <main className="wrap legal-page">
      <div className="legal-head">
        <span className="eyebrow">Support</span>
        <h1>Raise a Concern</h1>
        <p className="legal-intro">
          If something about a campaign, a committee, or how funds are being used doesn't seem right, tell us. Every
          report is reviewed by a person, not just logged.
        </p>
      </div>

      <div className="concern-steps">
        {steps.map((s) => (
          <div className="concern-step" key={s.num}>
            <span className="num mono">{s.num}</span>
            <h4>{s.title}</h4>
            <p>{s.body}</p>
          </div>
        ))}
      </div>

      {submitted ? (
        <div className="concern-success">
          <span className="eyebrow" style={{ justifyContent: "center" }}>
            Report received
          </span>
          <h2 style={{ marginTop: "12px", fontSize: "26px", color: "var(--text-on-paper)" }}>Thank you for speaking up.</h2>
          <p style={{ marginTop: "10px", color: "var(--text-on-paper-dim)" }}>
            Your reference number is
          </p>
          <div className="ref mono">{submitted}</div>
          <p style={{ marginTop: "14px", color: "var(--text-on-paper-dim)", maxWidth: "440px", marginLeft: "auto", marginRight: "auto" }}>
            We'll follow up at the email you provided within 48 hours. Keep your reference number for your records.
          </p>
          <button className="btn btn-outline-ink" style={{ marginTop: "24px" }} onClick={resetForm}>
            Submit another concern
          </button>
        </div>
      ) : (
        <form className="concern-form" onSubmit={submit} noValidate>
          <div className="concern-field">
            <label htmlFor="concern-type">Type of concern</label>
            <select id="concern-type" value={form.type} onChange={update("type")}>
              <option value="">Select one...</option>
              {concernTypes.map((t) => (
                <option value={t} key={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.type && <div className="concern-error">{errors.type}</div>}
          </div>

          <div className="concern-field">
            <label htmlFor="concern-reference">Related campaign or masjid (optional)</label>
            <input
              id="concern-reference"
              type="text"
              placeholder="e.g. Masjid Al-Noor, Casablanca"
              value={form.reference}
              onChange={update("reference")}
            />
          </div>

          <div className="concern-field">
            <label htmlFor="concern-email">Your email</label>
            <input id="concern-email" type="text" placeholder="you@example.com" value={form.email} onChange={update("email")} />
            {errors.email && <div className="concern-error">{errors.email}</div>}
          </div>

          <div className="concern-field">
            <label htmlFor="concern-details">What happened?</label>
            <textarea
              id="concern-details"
              placeholder="Share as much detail as you can — dates, amounts, and anything else that would help us look into this."
              value={form.details}
              onChange={update("details")}
            />
            {errors.details && <div className="concern-error">{errors.details}</div>}
          </div>

          <div>
            <button type="submit" className="btn btn-gold">
              Submit Report
            </button>
          </div>
        </form>
      )}

      <Link to="/" className="legal-back">
        ← Back to home
      </Link>
    </main>
  );
}

export default RaiseConcern;
