import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config.js";
import { Icon } from "../components/Icons.jsx";
import { getStoredUser } from "../utils/userAuthStorage.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const DETAILS_MAX = 1000;

const STEP_DEFAULTS = [
  { num: "01", key: "step1", title: "You submit", body: "Your report reaches our trust & safety team, along with a reference number for your records." },
  { num: "02", key: "step2", title: "We review", body: "We look into the concern, and may reach out to you or the masjid committee for more information." },
  { num: "03", key: "step3", title: "We follow up", body: "You'll hear back at the email you provide, typically within 48 hours, with the outcome or next steps." },
];

function RaiseConcern() {
  const { t } = useTranslation();
  const steps = STEP_DEFAULTS.map((s) => ({
    num: s.num,
    title: t(`concern.${s.key}.title`, s.title),
    body: t(`concern.${s.key}.body`, s.body),
  }));
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
    if (!form.fullName.trim()) next.fullName = t("concern.err.fullName", "Please enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = t("concern.err.email", "Enter a valid email so we can follow up.");
    if (!form.concernType) next.concernType = t("concern.err.concernType", "Please choose the type of concern.");
    if (!form.subject.trim()) next.subject = t("concern.err.subject", "Please give this a short subject.");
    if (form.description.trim().length < 20) next.description = t("concern.err.description", "Please provide at least a few sentences of detail.");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API_BASE}/concerns/public`, form);
      setSubmitted(data.concern.reference);
    } catch (err) {
      setErrors({ form: err.response?.data?.message || t("concern.err.submitFailed", "Couldn't submit your concern. Please try again.") });
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
        <span className="eyebrow">{t("concern.eyebrow", "Support")}</span>
        <h1>{t("concern.title", "Raise a Concern")}</h1>
        <p className="legal-intro">
          {t(
            "concern.intro",
            "If something about a campaign, a committee, or how funds are being used doesn't seem right, tell us. Every report is reviewed by a person, not just logged."
          )}
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

      <div className="contact-split concern-split">
        <div className="contact-form-panel card">
          {submitted ? (
            <div className="contact-success">
              <div className="contact-success-icon">
                <Icon name="check" size={30} />
              </div>
              <h2>{t("concern.success.title", "Thank you for speaking up.")}</h2>
              <p style={{ marginBottom: 6 }}>{t("concern.success.refLabel", "Your reference number is")}</p>
              <div className="concern-ref-badge mono">{submitted}</div>
              <p>
                {t(
                  "concern.success.followUp",
                  "We've also sent a confirmation to your email. We'll follow up there within 48 hours — keep your reference number for your records."
                )}
              </p>
              <button className="btn btn-outline-ink" onClick={resetForm}>
                {t("concern.success.another", "Submit another concern")}
              </button>
            </div>
          ) : (
            <>
              <span className="eyebrow">
                <Icon name="shieldCheck" size={14} /> {t("concern.form.eyebrow", "Report Details")}
              </span>

              <form className="concern-form" onSubmit={submit} noValidate>
                {errors.form && <div className="concern-error" style={{ marginBottom: 4 }}>{errors.form}</div>}

                <div className="contact-field-row">
                  <div className="concern-field">
                    <label htmlFor="concern-name">{t("concern.form.name.label", "Your name")}</label>
                    <input
                      id="concern-name"
                      type="text"
                      placeholder={t("concern.form.name.placeholder", "Your full name")}
                      value={form.fullName}
                      onChange={update("fullName")}
                    />
                    {errors.fullName && <div className="concern-error">{errors.fullName}</div>}
                  </div>

                  <div className="concern-field">
                    <label htmlFor="concern-email">{t("concern.form.email.label", "Your email")}</label>
                    <input
                      id="concern-email"
                      type="text"
                      placeholder={t("concern.form.email.placeholder", "you@example.com")}
                      value={form.email}
                      onChange={update("email")}
                    />
                    {errors.email && <div className="concern-error">{errors.email}</div>}
                  </div>
                </div>

                <div className="contact-field-row">
                  <div className="concern-field">
                    <label htmlFor="concern-type">{t("concern.form.type.label", "Type of concern")}</label>
                    <select id="concern-type" value={form.concernType} onChange={update("concernType")}>
                      <option value="">{t("concern.form.type.placeholder", "Select one...")}</option>
                      {types.map((ct) => (
                        <option value={ct.name} key={ct.id}>
                          {t(`concernType.${ct.id}`, ct.name)}
                        </option>
                      ))}
                    </select>
                    {errors.concernType && <div className="concern-error">{errors.concernType}</div>}
                  </div>

                  <div className="concern-field">
                    <label htmlFor="concern-reference">{t("concern.form.reference.label", "Related campaign or masjid (optional)")}</label>
                    <input
                      id="concern-reference"
                      type="text"
                      placeholder={t("concern.form.reference.placeholder", "e.g. Masjid Al-Noor, Casablanca")}
                      value={form.relatedReference}
                      onChange={update("relatedReference")}
                    />
                  </div>
                </div>

                <div className="concern-field">
                  <label htmlFor="concern-subject">{t("concern.form.subject.label", "Subject")}</label>
                  <input
                    id="concern-subject"
                    type="text"
                    placeholder={t("concern.form.subject.placeholder", "A short summary of your concern")}
                    value={form.subject}
                    onChange={update("subject")}
                  />
                  {errors.subject && <div className="concern-error">{errors.subject}</div>}
                </div>

                <div className="concern-field">
                  <div className="contact-field-head">
                    <label htmlFor="concern-details">{t("concern.form.details.label", "What happened?")}</label>
                    <span className="contact-char-count">
                      {form.description.length.toLocaleString()} / {DETAILS_MAX.toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    id="concern-details"
                    placeholder={t(
                      "concern.form.details.placeholder",
                      "Share as much detail as you can — dates, amounts, and anything else that would help us look into this."
                    )}
                    value={form.description}
                    maxLength={DETAILS_MAX}
                    onChange={update("description")}
                  />
                  {errors.description && <div className="concern-error">{errors.description}</div>}
                </div>

                <button type="submit" className="btn btn-gold" disabled={submitting}>
                  {submitting ? t("concern.form.submitting", "Submitting…") : t("concern.form.submit", "Submit Report")}{" "}
                  {!submitting && <span className="btn-arrow">→</span>}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="contact-side">
          <div className="contact-side-card">
            <span className="eyebrow">{t("concern.side.eyebrow", "Other ways to reach us")}</span>
            <ul className="contact-side-list">
              <li>
                <Link to="/contact">
                  <Icon name="compass" size={16} /> {t("concern.side.generalQuestion", "Have a general question instead?")}
                </Link>
              </li>
              <li>
                <a href="mailto:hello@masjidmycommunity.org">
                  <Icon name="mail" size={16} /> {t("concern.side.emailDirectly", "Email us directly")}
                </a>
              </li>
              <li>
                <Link to="/how-it-works">
                  <Icon name="shieldCheck" size={16} /> {t("concern.side.howItWorks", "How the review process works")}
                </Link>
              </li>
            </ul>
          </div>

          <div className="contact-quote-card">
            <p className="contact-quote-arabic">مَنْ رَأَى مِنْكُمْ مُنْكَرًا فَلْيُغَيِّرْهُ بِيَدِهِ، فَإِنْ لَمْ يَسْتَطِعْ فَبِلِسَانِهِ</p>
            <p className="contact-quote-translation">
              {t(
                "concern.side.quoteTranslation",
                "“Whoever among you sees a wrong, let him change it with his hand; if he cannot, then with his tongue.”"
              )}
            </p>
            <span className="contact-quote-source mono">Sahih Muslim 49</span>
          </div>
        </div>
      </div>

      <Link to="/" className="legal-back">
        {t("legalCommon.backToHome", "← Back to home")}
      </Link>
    </main>
  );
}

export default RaiseConcern;
