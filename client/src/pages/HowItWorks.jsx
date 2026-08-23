import React, { useEffect, useState } from "react";
import { Icon } from "../components/Icons.jsx";
import Flow from "../components/Flow.jsx";

const steps = [
  {
    num: "01",
    icon: "book",
    title: "Masjid Registration",
    body: "A masjid or an authorized representative registers on the platform, providing details such as location, capacity, committee information and current needs. This establishes the masjid's identity on Masjid My Community.",
  },
  {
    num: "02",
    icon: "shieldCheck",
    title: "Verification",
    body: "Every submission goes through our verification process — reviewing registration documents, committee details and, where possible, community references — before a masjid is approved and badged as verified.",
  },
  {
    num: "03",
    icon: "flag",
    title: "Create a Campaign",
    body: "Once verified, the masjid can launch fundraising campaigns for specific needs — construction, renovation, education, solar energy, water facilities, digital infrastructure, community welfare and more.",
  },
  {
    num: "04",
    icon: "globe",
    title: "Share With the Community",
    body: "The campaign becomes discoverable to donors and communities around the world, connecting the masjid's story to people who want to help — Masjids → Communities → Supporters → Impact.",
  },
  {
    num: "05",
    icon: "heart",
    title: "Secure Contribution",
    body: "Supporters contribute toward the campaign through secure, encrypted payment processing — with every donation tagged and recorded clearly for both the donor and the masjid.",
  },
  {
    num: "06",
    icon: "chartUp",
    title: "Track Progress and Impact",
    body: "Everyone can follow the journey from goal to fund collection, to project implementation, to progress updates, all the way through to completed impact — with photos and expense reports along the way.",
  },
  {
    num: "07",
    icon: "people",
    title: "Empower Communities",
    body: "When a masjid is empowered, its community becomes stronger. When communities become stronger, the impact can reach the world.",
  },
];

const trustPoints = [
  { icon: "shieldCheck", title: "Authenticity", desc: "Every masjid is confirmed as a real, active community before it can raise funds." },
  { icon: "heart", title: "Trust", desc: "Donors give with confidence, knowing who they're supporting and why." },
  { icon: "chartUp", title: "Transparency", desc: "Fund usage and progress are visible at every stage, not just at the start." },
  { icon: "people", title: "Accountability", desc: "Masjids report back to their community of supporters with real updates." },
];

const ecosystemFlow = [
  { icon: "mosque", label: "Masjid" },
  { icon: "people", label: "Community" },
  { icon: "heart", label: "Support" },
  { icon: "chartUp", label: "Empowerment" },
  { icon: "globe", label: "Impact" },
];

function HowItWorks() {
  const [maxRevealedStep, setMaxRevealedStep] = useState(-1);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            if (entry.target.dataset.stepIdx !== undefined) {
              setMaxRevealedStep((m) => Math.max(m, Number(entry.target.dataset.stepIdx)));
            }
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 100px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const spineFillPct = maxRevealedStep < 0 ? 0 : ((maxRevealedStep + 1) / steps.length) * 100;

  return (
    <main className="hw-page">
      <section className="hw-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">How It Works</span>
          <h1>From a masjid's need to a community's impact.</h1>
          <p>
            Masjid My Community connects verified masjids with donors and supporters worldwide — through a simple,
            transparent journey from registration to real-world impact. Here's exactly how it works.
          </p>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">The journey</span>
            <h2>Seven steps, one connected ecosystem</h2>
          </div>

          <div className="hw-timeline">
            <div className="hw-spine" aria-hidden="true">
              <div className="hw-spine-fill" style={{ height: `${spineFillPct}%` }} />
            </div>
            {steps.map((s, i) => (
              <div
                className={`hw-step reveal${i % 2 === 1 ? " hw-step-right" : ""}`}
                key={s.num}
                data-step-idx={i}
              >
                <div className="hw-step-node">
                  <Icon name={s.icon} size={24} />
                </div>
                <div className="hw-step-card">
                  <span className="hw-step-ghost" aria-hidden="true">{s.num}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py cat-strip hw-trust-section">
        <div className="wrap">
          <div className="section-head on-ink center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">Why verification matters</span>
            <h2>Built on authenticity, trust, transparency and accountability</h2>
          </div>
          <div className="hw-seal-row reveal">
            {trustPoints.map((t, i) => (
              <div className="hw-seal" style={{ transitionDelay: `${i * 0.1}s` }} key={t.title}>
                <div className="hw-seal-badge">
                  <span className="hw-seal-ring" aria-hidden="true" />
                  <Icon name={t.icon} size={28} />
                </div>
                <div className="hw-seal-title">{t.title}</div>
                <div className="hw-seal-desc">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">The ecosystem</span>
            <h2>Masjid → Community → Support → Empowerment → Impact</h2>
            <p>Every campaign moves through the same connected journey — this is what makes the platform work.</p>
          </div>
          <div className="hw-flow-wrap reveal">
            <Flow nodes={ecosystemFlow} />
          </div>
        </div>
      </section>

      <section className="final-cta hw-final-quote">
        <div className="wrap">
          <span className="eyebrow">The bigger picture</span>
          <span className="hw-quote-mark" aria-hidden="true">“</span>
          <h2>
            When a masjid is <em>empowered</em>, its community becomes <em>stronger</em>.
            <br className="hw-quote-break" />
            When communities become stronger, the impact can reach <em>the world</em>.
          </h2>
          <div className="ctas">
            <a href="/#register" className="btn btn-gold">
              Register Your Masjid <span className="btn-arrow">→</span>
            </a>
            <a href="/#campaigns" className="btn btn-outline-paper">
              Explore Campaigns <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HowItWorks;
