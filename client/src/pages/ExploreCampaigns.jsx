import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import Flow from "../components/Flow.jsx";
import SimpleFaqAccordion from "../components/SimpleFaqAccordion.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const STEP_KEYS = [
  { num: "01", icon: "compass", key: "discover" },
  { num: "02", icon: "shieldCheck", key: "verify" },
  { num: "03", icon: "flag", key: "create" },
  { num: "04", icon: "edit", key: "review" },
  { num: "05", icon: "globe", key: "publish" },
  { num: "06", icon: "heart", key: "collect" },
  { num: "07", icon: "check", key: "complete" },
  { num: "08", icon: "wallet", key: "transfer" },
];

const STEP_DEFAULTS = {
  discover: {
    title: "Discover",
    body: "Explore campaigns created by eligible, verified masjids — each one carrying the green verification tick.",
  },
  verify: {
    title: "Verify",
    body: "Before any campaign can be published, its masjid must complete verification — required documentation and KYC checks reviewed by our team.",
  },
  create: {
    title: "Create",
    body: "A verified masjid creates a campaign for a specific need — construction, renovation, education, relief, or another eligible cause.",
  },
  review: {
    title: "Review",
    body: "The internal Masjid My Community team reviews the campaign for completeness and eligibility before it can go live.",
  },
  publish: {
    title: "Publish",
    body: "Once approved, the campaign is published and becomes visible to donors and communities everywhere.",
  },
  collect: {
    title: "Collect Funds",
    body: "Contributions are securely recorded and connected to the relevant masjid and campaign, visible as the campaign progresses.",
  },
  complete: {
    title: "Complete",
    body: "When the campaign reaches its goal or closure stage, its collected funds and status are finalized.",
  },
  transfer: {
    title: "Transfer",
    body: "A 10% platform/service cost is deducted as applicable, and the remaining eligible amount is transferred to the masjid.",
  },
};

const JOURNEY_FLOW_KEYS = [
  { icon: "heart", key: "yourContribution", fallback: "Your Contribution" },
  { icon: "shieldCheck", key: "verifiedMasjid", fallback: "Verified Masjid" },
  { icon: "flag", key: "campaign", fallback: "Campaign" },
  { icon: "chartUp", key: "projectProgress", fallback: "Project Progress" },
  { icon: "people", key: "realImpact", fallback: "Real Impact" },
];

const checks = [
  "The masjid behind the campaign has completed verification",
  "Required documentation and KYC checks have been reviewed",
  "The campaign itself has been reviewed and approved internally",
  "Every contribution is recorded and linked to its campaign",
  "Progress and fund usage stay visible as the campaign moves forward",
  "The eligible amount transferred is clearly reduced by the stated platform cost",
];

function ExploreCampaigns() {
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

  const faqItems = [
    {
      q: t("exploreCampaignsPage.faq.q1", "Where does my contribution actually go?"),
      a: t(
        "exploreCampaignsPage.faq.a1",
        "It's recorded against the specific campaign you contributed to, which is tied to a verified masjid. Once the campaign completes, the eligible collected amount — after the stated platform cost — is transferred to that masjid."
      ),
    },
    {
      q: t("exploreCampaignsPage.faq.q2", "What does the green verification tick mean?"),
      a: t(
        "exploreCampaignsPage.faq.a2",
        "It means the masjid has completed our verification process — required documentation and KYC checks reviewed by our team. It reflects the specific checks completed, not a guarantee or endorsement of any individual campaign."
      ),
    },
    {
      q: t("exploreCampaignsPage.faq.q3", "Why is a platform cost deducted?"),
      a: t(
        "exploreCampaignsPage.faq.a3",
        "A 10% platform/service cost, as applicable, helps cover verification, campaign review, and running the platform itself, so we can keep doing this work responsibly."
      ),
    },
    {
      q: t("exploreCampaignsPage.faq.q4", "Can any masjid publish a campaign?"),
      a: t(
        "exploreCampaignsPage.faq.a4",
        "No — a masjid must first complete verification. Every campaign is also reviewed and approved by our internal team before it becomes visible to the community."
      ),
    },
  ];

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow">{t("exploreCampaignsPage.hero.eyebrow", "Explore Campaigns")}</span>
          <h1>{t("exploreCampaignsPage.hero.title", "From a verified masjid's need to real, tracked impact.")}</h1>
          <p>
            {t(
              "exploreCampaignsPage.hero.intro",
              "Every campaign on Masjid My Community follows the same transparent journey. Here's exactly what happens at each stage — and where your contribution goes."
            )}
          </p>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("exploreCampaignsPage.journey.eyebrow", "The campaign lifecycle")}</span>
            <h2>{t("exploreCampaignsPage.journey.title", "Eight steps, one transparent journey")}</h2>
            <div className="lifecycle-strip">
              {STEP_KEYS.map((s, i) => (
                <React.Fragment key={s.key}>
                  <span className="lifecycle-chip">{t(`exploreCampaignsPage.step.${s.key}.title`, STEP_DEFAULTS[s.key].title)}</span>
                  {i < STEP_KEYS.length - 1 && <span className="lifecycle-arrow">→</span>}
                </React.Fragment>
              ))}
            </div>
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
                  <h3>{t(`exploreCampaignsPage.step.${s.key}.title`, STEP_DEFAULTS[s.key].title)}</h3>
                  <p>{t(`exploreCampaignsPage.step.${s.key}.body`, STEP_DEFAULTS[s.key].body)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="info-callout warn reveal">
            <span className="info-callout-icon">
              <Icon name="wallet" size={18} />
            </span>
            <div>
              <h4>{t("exploreCampaignsPage.feeNote.title", "About the platform cost")}</h4>
              <p>
                {t(
                  "exploreCampaignsPage.feeNote.body",
                  "A 10% platform/service cost is deducted, as applicable, before the remaining eligible amount is transferred to the masjid. This is disclosed here so you always know where your contribution goes."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py cat-strip">
        <div className="wrap">
          <div className="section-head on-ink center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("exploreCampaignsPage.flow.eyebrow", "Where your contribution goes")}</span>
            <h2>{t("exploreCampaignsPage.flow.title", "A direct, traceable line from you to the project")}</h2>
          </div>
          <div className="hw-flow-wrap reveal">
            <Flow nodes={JOURNEY_FLOW_KEYS.map((n) => ({ icon: n.icon, label: t(`exploreCampaignsPage.flow.node.${n.key}`, n.fallback) }))} onInk />
          </div>
        </div>
      </section>

      <section className="py py-tight-b">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("exploreCampaignsPage.checks.eyebrow", "Built-in safeguards")}</span>
            <h2>{t("exploreCampaignsPage.checks.title", "What's checked before you ever see a campaign")}</h2>
          </div>
          <div className="check-grid reveal">
            {checks.map((c, i) => (
              <div className="check-grid-item" key={i}>
                <Icon name="check" size={16} />
                <span>{t(`exploreCampaignsPage.checks.item${i + 1}`, c)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py py-tight-t py-tight-b">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("exploreCampaignsPage.faq.eyebrow", "Common questions")}</span>
            <h2>{t("exploreCampaignsPage.faq.title", "Campaigns, answered simply")}</h2>
          </div>
          <div className="reveal">
            <SimpleFaqAccordion items={faqItems} />
          </div>
        </div>
      </section>

      <section className="py py-tight-t">
        <div className="wrap">
          <div className="pagelink-row reveal">
            <Link to="/how-it-works" className="pagelink-card">
              <span className="pagelink-card-icon"><Icon name="compass" size={20} /></span>
              <h4>{t("exploreCampaignsPage.link.howItWorks.title", "See the full platform journey")}</h4>
              <p>{t("exploreCampaignsPage.link.howItWorks.body", "From registration to fund settlement — the complete ecosystem.")}</p>
              <span className="pagelink-cta">{t("exploreCampaignsPage.link.howItWorks.cta", "How It Works")} <span className="btn-arrow">→</span></span>
            </Link>
            <Link to="/verified-masjid" className="pagelink-card">
              <span className="pagelink-card-icon"><Icon name="shieldCheck" size={20} /></span>
              <h4>{t("exploreCampaignsPage.link.verified.title", "What the green tick actually means")}</h4>
              <p>{t("exploreCampaignsPage.link.verified.body", "Understand exactly what's checked before a masjid is verified.")}</p>
              <span className="pagelink-cta">{t("exploreCampaignsPage.link.verified.cta", "Verified Masjid")} <span className="btn-arrow">→</span></span>
            </Link>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <span className="eyebrow">{t("exploreCampaignsPage.cta.eyebrow", "Ready to support a cause?")}</span>
          <h2>{t("exploreCampaignsPage.cta.title", "Every verified masjid has a story worth supporting.")}</h2>
          <div className="ctas">
            <a href="/#campaigns" className="btn btn-gold">
              {t("exploreCampaignsPage.cta.explore", "Explore Live Campaigns")} <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ExploreCampaigns;
