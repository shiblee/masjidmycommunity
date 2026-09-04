import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import Flow from "../components/Flow.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const STEP_KEYS = [
  { num: "01", icon: "book", key: "register" },
  { num: "02", icon: "shieldCheck", key: "masjidVerification" },
  { num: "03", icon: "search", key: "kycReview" },
  { num: "04", icon: "star", key: "verificationBadge" },
  { num: "05", icon: "flag", key: "createCampaign" },
  { num: "06", icon: "edit", key: "internalReview" },
  { num: "07", icon: "globe", key: "campaignLive" },
  { num: "08", icon: "heart", key: "communitySupports" },
  { num: "09", icon: "check", key: "campaignCompletion" },
  { num: "10", icon: "wallet", key: "fundSettlement" },
];

const STEP_DEFAULTS = {
  register: {
    title: "Register / Join",
    body: "A masjid registers on the platform — or a donor simply creates a free account to start supporting causes they care about.",
  },
  masjidVerification: {
    title: "Masjid Verification",
    body: "The masjid submits its details and required documentation — location, committee information, contact details and supporting records.",
  },
  kycReview: {
    title: "KYC & Review",
    body: "The Masjid My Community team verifies the submitted information, including KYC checks, before any campaign can be created.",
  },
  verificationBadge: {
    title: "Verification Badge",
    body: "Once successfully verified, the masjid receives the green verification tick — visible on its profile and every campaign it runs.",
  },
  createCampaign: {
    title: "Create Campaign",
    body: "A verified masjid can create an eligible campaign — construction, renovation, education, relief, or another community need.",
  },
  internalReview: {
    title: "Internal Review",
    body: "Every campaign is reviewed by our internal team for completeness and eligibility before it's approved to go live.",
  },
  campaignLive: {
    title: "Campaign Goes Live",
    body: "Once approved, the campaign becomes visible to the community — discoverable by donors around the world.",
  },
  communitySupports: {
    title: "Community Supports",
    body: "Donors contribute toward the campaign, with every contribution recorded and connected to the relevant masjid and campaign.",
  },
  campaignCompletion: {
    title: "Campaign Completion",
    body: "When a campaign reaches its goal or closure stage, its collected funds and status are finalized.",
  },
  fundSettlement: {
    title: "Fund Settlement",
    body: "A 10% platform/service cost is deducted as applicable, and the remaining eligible amount is transferred to the masjid.",
  },
};

const trustPoints = [
  { icon: "shieldCheck", title: "Authenticity", desc: "Every masjid is confirmed as a real, active community before it can raise funds." },
  { icon: "heart", title: "Trust", desc: "Donors give with confidence, knowing who they're supporting and why." },
  { icon: "chartUp", title: "Transparency", desc: "Fund usage and progress are visible at every stage, not just at the start." },
  { icon: "people", title: "Accountability", desc: "Masjids report back to their community of supporters with real updates." },
];

const ECOSYSTEM_FLOW_KEYS = [
  { icon: "mosque", key: "masjid", fallback: "Masjid" },
  { icon: "people", key: "community", fallback: "Community" },
  { icon: "heart", key: "support", fallback: "Support" },
  { icon: "chartUp", key: "empowerment", fallback: "Empowerment" },
  { icon: "globe", key: "impact", fallback: "Impact" },
];

function HowItWorks() {
  const { t } = useTranslation();
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

  const spineFillPct = maxRevealedStep < 0 ? 0 : ((maxRevealedStep + 1) / STEP_KEYS.length) * 100;

  return (
    <main className="hw-page">
      <section className="hw-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">{t("howItWorksPage.hero.eyebrow", "How It Works")}</span>
          <h1>{t("howItWorksPage.hero.title", "From a masjid's need to a community's impact.")}</h1>
          <p>
            {t(
              "howItWorksPage.hero.intro",
              "Masjid My Community connects verified masjids with donors and supporters worldwide — through a simple, transparent journey from registration to fund settlement. Here's exactly how it works."
            )}
          </p>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("howItWorksPage.journey.eyebrow", "The journey")}</span>
            <h2>{t("howItWorksPage.journey.title", "Ten steps, one transparent journey")}</h2>
          </div>

          <div className="hw-timeline">
            <div className="hw-spine" aria-hidden="true">
              <div className="hw-spine-fill" style={{ height: `${spineFillPct}%` }} />
            </div>
            {STEP_KEYS.map((s, i) => (
              <div className={`hw-step reveal${i % 2 === 1 ? " hw-step-right" : ""}`} key={s.num} data-step-idx={i}>
                <div className="hw-step-node">
                  <Icon name={s.icon} size={24} />
                </div>
                <div className="hw-step-card">
                  <span className="hw-step-ghost" aria-hidden="true">{s.num}</span>
                  <h3>{t(`howItWorksPage.step.${s.key}.title`, STEP_DEFAULTS[s.key].title)}</h3>
                  <p>{t(`howItWorksPage.step.${s.key}.body`, STEP_DEFAULTS[s.key].body)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="info-callout reveal">
            <span className="info-callout-icon">
              <Icon name="wallet" size={18} />
            </span>
            <div>
              <h4>{t("howItWorksPage.feeNote.title", "About the platform cost")}</h4>
              <p>
                {t(
                  "howItWorksPage.feeNote.body",
                  "A 10% platform/service cost is deducted, as applicable, before the remaining eligible amount is transferred to the masjid — covering verification, review, and running the platform."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py cat-strip hw-trust-section">
        <div className="wrap">
          <div className="section-head on-ink center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("howItWorksPage.trust.eyebrow", "Why verification matters")}</span>
            <h2>{t("howItWorksPage.trust.title", "Built on authenticity, trust, transparency and accountability")}</h2>
          </div>
          <div className="hw-seal-row reveal">
            {trustPoints.map((tp, i) => (
              <div className="hw-seal" style={{ transitionDelay: `${i * 0.1}s` }} key={tp.title}>
                <div className="hw-seal-badge">
                  <span className="hw-seal-ring" aria-hidden="true" />
                  <Icon name={tp.icon} size={28} />
                </div>
                <div className="hw-seal-title">{t(`howItWorksPage.trust.point.${tp.title.toLowerCase()}.title`, tp.title)}</div>
                <div className="hw-seal-desc">{t(`howItWorksPage.trust.point.${tp.title.toLowerCase()}.desc`, tp.desc)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py py-tight-b">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("howItWorksPage.ecosystem.eyebrow", "The ecosystem")}</span>
            <h2>{t("howItWorksPage.ecosystem.title", "Masjid → Community → Support → Empowerment → Impact")}</h2>
            <p>{t("howItWorksPage.ecosystem.body", "Every campaign moves through the same connected journey — this is what makes the platform work.")}</p>
          </div>
          <div className="hw-flow-wrap reveal">
            <Flow nodes={ECOSYSTEM_FLOW_KEYS.map((n) => ({ icon: n.icon, label: t(`howItWorksPage.ecosystem.node.${n.key}`, n.fallback) }))} />
          </div>
        </div>
      </section>

      <section className="py py-tight-t">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("howItWorksPage.more.eyebrow", "Go deeper")}</span>
            <h2>{t("howItWorksPage.more.title", "Two things worth understanding next")}</h2>
          </div>
          <div className="pagelink-row reveal">
            <Link to="/explore-campaigns" className="pagelink-card">
              <span className="pagelink-card-icon"><Icon name="flag" size={20} /></span>
              <h4>{t("howItWorksPage.link.campaigns.title", "How a campaign moves from idea to funded")}</h4>
              <p>{t("howItWorksPage.link.campaigns.body", "See the complete campaign lifecycle — from discovery to fund transfer.")}</p>
              <span className="pagelink-cta">{t("howItWorksPage.link.campaigns.cta", "Explore Campaigns")} <span className="btn-arrow">→</span></span>
            </Link>
            <Link to="/verified-masjid" className="pagelink-card">
              <span className="pagelink-card-icon"><Icon name="shieldCheck" size={20} /></span>
              <h4>{t("howItWorksPage.link.verified.title", "What the green tick actually means")}</h4>
              <p>{t("howItWorksPage.link.verified.body", "Understand exactly what's checked before a masjid is verified.")}</p>
              <span className="pagelink-cta">{t("howItWorksPage.link.verified.cta", "Verified Masjid")} <span className="btn-arrow">→</span></span>
            </Link>
          </div>
        </div>
      </section>

      <section className="final-cta hw-final-quote">
        <div className="wrap">
          <span className="eyebrow">{t("howItWorksPage.quote.eyebrow", "The bigger picture")}</span>
          <span className="hw-quote-mark" aria-hidden="true">"</span>
          <h2>
            {t("howItWorksPage.quote.line1", "When a masjid is")} <em>{t("howItWorksPage.quote.empowered", "empowered")}</em>, {t("howItWorksPage.quote.line2", "its community becomes")} <em>{t("howItWorksPage.quote.stronger", "stronger")}</em>.
            <br className="hw-quote-break" />
            {t("howItWorksPage.quote.line3", "When communities become stronger, the impact can reach")} <em>{t("howItWorksPage.quote.theWorld", "the world")}</em>.
          </h2>
          <div className="ctas">
            <a href="/#register" className="btn btn-gold">
              {t("howItWorksPage.cta.register", "Register Your Masjid")} <span className="btn-arrow">→</span>
            </a>
            <a href="/explore-campaigns" className="btn btn-outline-paper">
              {t("howItWorksPage.cta.explore", "Explore Campaigns")} <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default HowItWorks;
