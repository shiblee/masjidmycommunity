import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config.js";
import { Icon } from "../components/Icons.jsx";
import GeometricPattern from "../components/GeometricPattern.jsx";
import { getStoredUser } from "../utils/userAuthStorage.js";

const TOPICS = [
  { key: "general", label: "General Inquiry", icon: "compass" },
  { key: "masjid", label: "Masjid Registration", icon: "mosque" },
  { key: "campaign", label: "Campaign & Fundraising", icon: "flag" },
  { key: "partnership", label: "Partnership", icon: "link" },
  { key: "media", label: "Media & Press", icon: "star" },
  { key: "support", label: "Technical Support", icon: "monitor" },
];

const INFO_CARDS = [
  {
    icon: "mail",
    title: "Email Us",
    desc: "For anything and everything — we read every message ourselves.",
    action: { label: "hello@masjidmycommunity.org", href: "mailto:hello@masjidmycommunity.org" },
  },
  {
    icon: "shieldCheck",
    title: "Trust & Safety",
    desc: "Something about a campaign or committee doesn't seem right?",
    action: { label: "Raise a Concern", to: "/raise-a-concern" },
  },
  {
    icon: "globe",
    title: "Global Reach",
    desc: "Supporting masjids and communities across the world, remotely.",
    action: { label: "1,250+ masjids and counting", static: true },
  },
  {
    icon: "compass",
    title: "Response Time",
    desc: "Every message is reviewed by a person, not just logged.",
    action: { label: "Usually within 48 hours", static: true },
  },
];

const MESSAGE_MAX = 1000;

function Contact() {
  const user = getStoredUser();
  const [topic, setTopic] = useState("general");
  const [form, setForm] = useState({ fullName: user?.fullName || "", email: user?.email || "", message: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 100px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.fullName.trim()) next.fullName = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email so we can reply.";
    if (form.message.trim().length < 10) next.message = "Please share a little more detail.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_BASE}/contact`, { ...form, topic });
      setSubmitted(true);
    } catch (err) {
      setErrors({ form: err.response?.data?.message || "Couldn't send your message. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ fullName: user?.fullName || "", email: user?.email || "", message: "" });
    setTopic("general");
    setErrors({});
    setSubmitted(false);
  };

  return (
    <main className="contact-page">
      <section className="contact-hero on-ink">
        <GeometricPattern className="auth-pattern" />
        <div className="wrap contact-hero-inner">
          <span className="eyebrow">Get in Touch</span>
          <h1>Let's build something meaningful, together.</h1>
          <p>
            Whether you're registering a masjid, launching a campaign, exploring a partnership, or just have a
            question — we'd genuinely like to hear from you.
          </p>
          <div className="contact-hero-chips">
            <span><Icon name="check" size={14} /> Reviewed by a real person</span>
            <span><Icon name="check" size={14} /> Usually within 48 hours</span>
            <span><Icon name="check" size={14} /> Trusted by 1,250+ masjids</span>
          </div>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          <div className="contact-info-grid reveal">
            {INFO_CARDS.map((c) => (
              <div className="contact-info-card" key={c.title}>
                <div className="contact-info-icon">
                  <Icon name={c.icon} size={22} />
                </div>
                <h4>{c.title}</h4>
                <p>{c.desc}</p>
                {c.action.static ? (
                  <span className="contact-info-action static">{c.action.label}</span>
                ) : c.action.to ? (
                  <Link to={c.action.to} className="contact-info-action">
                    {c.action.label} <span className="btn-arrow">→</span>
                  </Link>
                ) : (
                  <a href={c.action.href} className="contact-info-action">
                    {c.action.label} <span className="btn-arrow">→</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          <div className="contact-split reveal">
            <div className="contact-form-panel card">
              {submitted ? (
                <div className="contact-success">
                  <div className="contact-success-icon">
                    <Icon name="check" size={30} />
                  </div>
                  <h2>Message sent.</h2>
                  <p>
                    Thank you for reaching out — we've received your message and will get back to you at{" "}
                    <strong>{form.email}</strong>, usually within 48 hours.
                  </p>
                  <button className="btn btn-outline-ink" onClick={resetForm}>
                    Send another message
                  </button>
                </div>
              ) : (
                <>
                  <span className="eyebrow">What's this about?</span>
                  <div className="contact-topics">
                    {TOPICS.map((t) => (
                      <button
                        type="button"
                        key={t.key}
                        className={`contact-topic-chip${topic === t.key ? " active" : ""}`}
                        onClick={() => setTopic(t.key)}
                      >
                        <Icon name={t.icon} size={16} />
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <form className="contact-form" onSubmit={submit} noValidate>
                    {errors.form && <div className="concern-error" style={{ marginBottom: 4 }}>{errors.form}</div>}

                    <div className="contact-field-row">
                      <div className="contact-field">
                        <label htmlFor="contact-name">Your name</label>
                        <input id="contact-name" type="text" placeholder="Your full name" value={form.fullName} onChange={update("fullName")} />
                        {errors.fullName && <div className="concern-error">{errors.fullName}</div>}
                      </div>
                      <div className="contact-field">
                        <label htmlFor="contact-email">Your email</label>
                        <input id="contact-email" type="text" placeholder="you@example.com" value={form.email} onChange={update("email")} />
                        {errors.email && <div className="concern-error">{errors.email}</div>}
                      </div>
                    </div>

                    <div className="contact-field">
                      <div className="contact-field-head">
                        <label htmlFor="contact-message">Your message</label>
                        <span className="contact-char-count">{form.message.length} / {MESSAGE_MAX}</span>
                      </div>
                      <textarea
                        id="contact-message"
                        placeholder="Tell us what's on your mind…"
                        value={form.message}
                        maxLength={MESSAGE_MAX}
                        onChange={update("message")}
                      />
                      {errors.message && <div className="concern-error">{errors.message}</div>}
                    </div>

                    <button type="submit" className="btn btn-gold" disabled={submitting}>
                      {submitting ? "Sending…" : "Send Message"} {!submitting && <span className="btn-arrow">→</span>}
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="contact-side">
              <div className="contact-side-card">
                <span className="eyebrow">Prefer another way?</span>
                <ul className="contact-side-list">
                  <li>
                    <Link to="/raise-a-concern">
                      <Icon name="shieldCheck" size={16} /> Raise a formal concern
                    </Link>
                  </li>
                  <li>
                    <Link to="/how-it-works">
                      <Icon name="compass" size={16} /> Read how it works
                    </Link>
                  </li>
                  <li>
                    <a href="mailto:hello@masjidmycommunity.org">
                      <Icon name="mail" size={16} /> Email us directly
                    </a>
                  </li>
                </ul>
                <div className="contact-side-social">
                  <a href="#" aria-label="Instagram">
                    <svg viewBox="0 0 24 24">
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="4.2" />
                      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                  <a href="#" aria-label="X (Twitter)">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 4l16 16M20 4L4 20" />
                    </svg>
                  </a>
                  <a href="#" aria-label="YouTube">
                    <svg viewBox="0 0 24 24">
                      <rect x="2" y="5" width="20" height="14" rx="4" />
                      <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                </div>
              </div>

              <div className="contact-quote-card">
                <p className="contact-quote-arabic">مَن دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ</p>
                <p className="contact-quote-translation">"Whoever guides someone to goodness will have a reward like the one who did it."</p>
                <span className="contact-quote-source mono">Sahih Muslim 1893</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Contact;
