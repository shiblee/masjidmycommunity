import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config.js";
import { getStoredUser } from "../utils/userAuthStorage.js";

const steps = [
  { num: "01", title: "You submit", body: "Your report reaches our trust & safety team, along with a reference number for your records." },
  { num: "02", title: "We review", body: "We look into the concern, and may reach out to you or the masjid committee for more information." },
  { num: "03", title: "We follow up", body: "You'll hear back at the email you provide, typically within 48 hours, with the outcome or next steps." },
];

function RaiseConcern() {
  const user = getStoredUser();
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    concernType: "",
    subject: "",
    relatedReference: "",
    description: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_BASE}/concerns/public/types`)
      .then(({ data }) => setTypes([...data.types].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {});
  }, []);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email so we can follow up.";
    if (!form.concernType) next.concernType = "Please choose the type of concern.";
    if (!form.subject.trim()) next.subject = "Please give this a short subject.";
    if (form.description.trim().length < 20) next.description = "Please provide at least a few sentences of detail.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_BASE}/concerns/public`, form);
      setSubmitted(data.concern.reference);
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Couldn't submit your concern. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ fullName: user?.fullName || "", email: user?.email || "", concernType: "", subject: "", relatedReference: "", description: "" });
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
            We've also sent a confirmation to your email. We'll follow up there within 48 hours — keep your reference number for your records.
          </p>
          <button className="btn btn-outline-ink" style={{ marginTop: "24px" }} onClick={resetForm}>
            Submit another concern
          </button>
        </div>
      ) : (
        <form className="concern-form" onSubmit={submit} noValidate>
          {errors.form && <div className="concern-error" style={{ marginBottom: 8 }}>{errors.form}</div>}

          <div className="concern-field">
            <label htmlFor="concern-name">Your name</label>
            <input id="concern-name" type="text" placeholder="Your full name" value={form.fullName} onChange={update("fullName")} />
            {errors.fullName && <div className="concern-error">{errors.fullName}</div>}
          </div>

          <div className="concern-field">
            <label htmlFor="concern-type">Type of concern</label>
            <select id="concern-type" value={form.concernType} onChange={update("concernType")}>
              <option value="">Select one...</option>
              {types.map((t) => (
                <option value={t.name} key={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {errors.concernType && <div className="concern-error">{errors.concernType}</div>}
          </div>

          <div className="concern-field">
            <label htmlFor="concern-subject">Subject</label>
            <input id="concern-subject" type="text" placeholder="A short summary of your concern" value={form.subject} onChange={update("subject")} />
            {errors.subject && <div className="concern-error">{errors.subject}</div>}
          </div>

          <div className="concern-field">
            <label htmlFor="concern-reference">Related campaign or masjid (optional)</label>
            <input
              id="concern-reference"
              type="text"
              placeholder="e.g. Masjid Al-Noor, Casablanca"
              value={form.relatedReference}
              onChange={update("relatedReference")}
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
              value={form.description}
              onChange={update("description")}
            />
            {errors.description && <div className="concern-error">{errors.description}</div>}
          </div>

          <div>
            <button type="submit" className="btn btn-gold" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit Report"}
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
