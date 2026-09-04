import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import SimpleFaqAccordion from "../components/SimpleFaqAccordion.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const STEP_KEYS = [
  { num: "01", icon: "book", key: "registration" },
  { num: "02", icon: "upload", key: "documentation" },
  { num: "03", icon: "search", key: "kyc" },
  { num: "04", icon: "edit", key: "internalReview" },
  { num: "05", icon: "shieldCheck", key: "verification" },
  { num: "06", icon: "check", key: "greenTick" },
];

const STEP_DEFAULTS = {
  registration: {
    title: "Masjid Registration",
    body: "A masjid or an authorized representative registers on the platform, providing location, committee information and contact details.",
  },
  documentation: {
    title: "Documentation",
    body: "The masjid provides required supporting documentation to confirm it's a real, active community.",
  },
  kyc: {
    title: "KYC",
    body: "KYC information is collected and reviewed as part of confirming who is responsible for the masjid's account.",
  },
  internalReview: {
    title: "Internal Review",
    body: "Our team validates everything submitted — checking it's complete, consistent and matches what's required.",
  },
  verification: {
    title: "Verification",
    body: "Once the review is complete and everything checks out, the masjid is marked as verified.",
  },
  greenTick: {
    title: "Green Tick",
    body: "The masjid receives the green verification tick — shown on its profile and on every campaign it runs.",
  },
};

const includesItems = [
  "Masjid information (location, capacity, committee details)",
  "Contact details for the masjid and its representatives",
  "Required supporting documentation",
  "KYC information",
  "Internal verification and review by our team",
  "Validation of the information submitted",
];

const whyItMatters = [
  { icon: "heart", title: "Builds trust", desc: "Donors know they're supporting a real, reviewed community." },
  { icon: "search", title: "Helps you identify verified masjids", desc: "The green tick is easy to spot, everywhere it appears." },
  { icon: "chartUp", title: "Improves transparency", desc: "You can see which masjids have completed our review process." },
  { icon: "shieldCheck", title: "Ties campaigns to verified masjids", desc: "Only a verified masjid can publish a campaign." },
];

function VerifiedMasjid() {
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
      q: t("verifiedMasjidPage.faq.q1", "Does the green tick mean a campaign is guaranteed or endorsed?"),
      a: t(
        "verifiedMasjidPage.faq.q1a",
        "No. The green tick reflects the specific checks Masjid My Community has completed on the masjid — it isn't a guarantee, endorsement, or promise about any individual campaign's outcome."
      ),
    },
    {
      q: t("verifiedMasjidPage.faq.q2", "How long does verification take?"),
      a: t("verifiedMasjidPage.faq.q2a", "It depends on how complete the submitted information and documentation are — our team reviews each masjid individually rather than on a fixed timetable."),
    },
    {
      q: t("verifiedMasjidPage.faq.q3", "Can a masjid lose its verified status?"),
      a: t("verifiedMasjidPage.faq.q3a", "Verification reflects what was reviewed at the time it was granted. Our team can revisit a masjid's status if something material changes."),
    },
    {
      q: t("verifiedMasjidPage.faq.q4", "Where will I see the green tick?"),
      a: t("verifiedMasjidPage.faq.q4a", "On the masjid's own profile page, and on every campaign it publishes — so you always know who's behind it."),
    },
  ];

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <div className="hw-seal-badge" style={{ width: 96, height: 96, margin: "0 auto 22px" }}>
            <span className="hw-seal-ring" aria-hidden="true" />
            <Icon name="shieldCheck" size={40} />
          </div>
          <span className="eyebrow">{t("verifiedMasjidPage.hero.eyebrow", "Verified Masjid")}</span>
          <h1>{t("verifiedMasjidPage.hero.title", "What the green tick actually means.")}</h1>
          <p>
            {t(
              "verifiedMasjidPage.hero.intro",
              "A green verification tick means that the masjid has been reviewed and verified by Masjid My Community, based on the required information and verification process."
            )}
          </p>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("verifiedMasjidPage.process.eyebrow", "The verification process")}</span>
            <h2>{t("verifiedMasjidPage.process.title", "Six steps to the green tick")}</h2>
            <div className="lifecycle-strip">
              {STEP_KEYS.map((s, i) => (
                <React.Fragment key={s.key}>
                  <span className="lifecycle-chip">{t(`verifiedMasjidPage.step.${s.key}.title`, STEP_DEFAULTS[s.key].title)}</span>
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
                  <h3>{t(`verifiedMasjidPage.step.${s.key}.title`, STEP_DEFAULTS[s.key].title)}</h3>
                  <p>{t(`verifiedMasjidPage.step.${s.key}.body`, STEP_DEFAULTS[s.key].body)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py cat-strip">
        <div className="wrap">
          <div className="section-head on-ink center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("verifiedMasjidPage.includes.eyebrow", "What verification may include")}</span>
            <h2>{t("verifiedMasjidPage.includes.title", "The checks behind every green tick")}</h2>
          </div>
          <div className="check-grid reveal">
            {includesItems.map((c, i) => (
              <div className="check-grid-item" key={i}>
                <Icon name="check" size={16} />
                <span>{t(`verifiedMasjidPage.includes.item${i + 1}`, c)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py py-tight-b">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("verifiedMasjidPage.why.eyebrow", "Why verification matters")}</span>
            <h2>{t("verifiedMasjidPage.why.title", "Confidence, built on real checks")}</h2>
          </div>
          <div className="hw-seal-row reveal">
            {whyItMatters.map((w, i) => (
              <div className="hw-seal" style={{ transitionDelay: `${i * 0.1}s` }} key={w.title}>
                <div className="hw-seal-badge">
                  <span className="hw-seal-ring" aria-hidden="true" />
                  <Icon name={w.icon} size={26} />
                </div>
                <div className="hw-seal-title" style={{ color: "var(--text-on-paper)" }}>{t(`verifiedMasjidPage.why.point${i + 1}.title`, w.title)}</div>
                <div className="hw-seal-desc" style={{ color: "var(--text-on-paper-dim)" }}>{t(`verifiedMasjidPage.why.point${i + 1}.desc`, w.desc)}</div>
              </div>
            ))}
          </div>

          <div className="info-callout warn reveal" style={{ marginTop: 56 }}>
            <span className="info-callout-icon">
              <Icon name="shieldCheck" size={18} />
            </span>
            <div>
              <h4>{t("verifiedMasjidPage.disclaimer.title", "What verification does not mean")}</h4>
              <p>
                {t(
                  "verifiedMasjidPage.disclaimer.body",
                  "The green tick represents the specific checks Masjid My Community has actually completed. It does not guarantee, endorse, or promise a risk-free outcome for any masjid or campaign — please use your own judgment before contributing."
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py py-tight-t py-tight-b">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 44px" }}>
            <span className="eyebrow">{t("verifiedMasjidPage.faq.eyebrow", "Common questions")}</span>
            <h2>{t("verifiedMasjidPage.faq.title", "Verification, answered simply")}</h2>
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
              <h4>{t("verifiedMasjidPage.link.howItWorks.title", "See the full platform journey")}</h4>
              <p>{t("verifiedMasjidPage.link.howItWorks.body", "From registration to fund settlement — the complete ecosystem.")}</p>
              <span className="pagelink-cta">{t("verifiedMasjidPage.link.howItWorks.cta", "How It Works")} <span className="btn-arrow">→</span></span>
            </Link>
            <Link to="/explore-campaigns" className="pagelink-card">
              <span className="pagelink-card-icon"><Icon name="flag" size={20} /></span>
              <h4>{t("verifiedMasjidPage.link.campaigns.title", "How a campaign moves from idea to funded")}</h4>
              <p>{t("verifiedMasjidPage.link.campaigns.body", "See the complete campaign lifecycle — from discovery to fund transfer.")}</p>
              <span className="pagelink-cta">{t("verifiedMasjidPage.link.campaigns.cta", "Explore Campaigns")} <span className="btn-arrow">→</span></span>
            </Link>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <span className="eyebrow">{t("verifiedMasjidPage.cta.eyebrow", "See it for yourself")}</span>
          <h2>{t("verifiedMasjidPage.cta.title", "Browse masjids that have completed verification.")}</h2>
          <div className="ctas">
            <Link to="/explore-masjids" className="btn btn-gold">
              {t("verifiedMasjidPage.cta.explore", "Explore Verified Masjids")} <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default VerifiedMasjid;
