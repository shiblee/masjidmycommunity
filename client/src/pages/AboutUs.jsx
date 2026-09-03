import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const quickLinks = [
  { key: "vision", icon: "compass", title: "Our Vision", desc: "A world where every masjid stands strong, self-sufficient and well-run.", href: "#our-vision", label: "Read our vision" },
  { key: "impact", icon: "chartUp", title: "Sustainable Impact", desc: "Helping masjids build income that lasts, not just one-time gifts.", static: true, label: "Our core focus" },
  { key: "reach", icon: "globe", title: "Global Reach", desc: "Connecting masjids and donors across the world, remotely.", static: true, label: "1,250+ masjids and counting" },
  { key: "involved", icon: "heart", title: "Get Involved", desc: "Register your masjid, or support one that matters to you.", href: "/#register", label: "Register Your Masjid" },
];

const quickFacts = [
  { key: "verified", icon: "shieldCheck", label: "Every masjid is verified before it can fundraise" },
  { key: "reports", icon: "wallet", label: "Itemized expense reports on every campaign" },
  { key: "languages", icon: "globe", label: "Available in English, Hindi, Urdu and Arabic" },
  { key: "community", icon: "people", label: "Built around community, not just donations" },
  { key: "revenue", icon: "chartUp", label: "Focused on income that lasts, not one-time gifts" },
];

const visionPillars = [
  { key: "selfSufficient", text: "Financially self-sufficient, not dependent on one-time gifts" },
  { key: "governed", text: "Openly and transparently governed" },
  { key: "connected", text: "Actively connected to its community" },
  { key: "equipped", text: "Equipped with modern, easy-to-use tools" },
  { key: "lasting", text: "A lasting resource for generations to come" },
];

const mission = [
  { key: "manage", text: "Help masjids manage their operations and finances clearly." },
  { key: "transparent", text: "Make fundraising transparent, so donors can give with confidence." },
  { key: "income", text: "Help masjids build steady, sustainable income — not just one-time donations." },
  { key: "closer", text: "Bring communities closer to their local masjid." },
  { key: "support", text: "Support education, welfare, and community development projects." },
  { key: "measurable", text: "Show the real, measurable impact of every masjid we work with." },
  { key: "connect", text: "Connect masjids and communities around the world." },
];

const empoweringPillars = [
  { key: "management", icon: "building", title: "Better Management", desc: "Simple tools to organize masjid records, committee members, and day-to-day operations in one place." },
  { key: "governance", icon: "shieldCheck", title: "Governance & Transparency", desc: "Clear processes and open reporting that build trust between a masjid and the people it serves." },
  { key: "participation", icon: "people", title: "Community Participation", desc: "Easy ways for community members to stay informed, get involved, and support their masjid." },
  { key: "resources", icon: "wallet", title: "Resource Management", desc: "Track funds, donations, and expenses clearly, so every contribution is accounted for." },
  { key: "revenue", icon: "chartUp", title: "Sustainable Revenue", desc: "Tools to help masjids build steady, long-term income, not just rely on one-time donations.", featured: true },
  { key: "digital", icon: "monitor", title: "Digital Transformation", desc: "Bringing masjid operations online, so they are easier to run and easier to trust." },
];

const historicalRoles = [
  { key: "worship", icon: "mosque", title: "Worship & Spiritual Development", desc: "The masjid's first and central purpose — a house of prayer and remembrance." },
  { key: "learning", icon: "book", title: "Learning & Education", desc: "Historically, masjids housed lessons, libraries and centers of Islamic scholarship." },
  { key: "gathering", icon: "people", title: "Community Gathering", desc: "A place where neighbors, families and travelers came together as one body." },
  { key: "social", icon: "heart", title: "Social Support", desc: "A source of care for those in need — food, shelter and comfort for the community." },
  { key: "guidance", icon: "compass", title: "Guidance", desc: "Where communities turned for direction, counsel and shared wisdom." },
  { key: "knowledge", icon: "bulb", title: "Knowledge Sharing", desc: "An open space for teaching, discussion and the exchange of ideas." },
  { key: "charity", icon: "heart", title: "Charity & Welfare", desc: "A hub for organizing zakat, sadaqah and support for the vulnerable." },
  { key: "cooperation", icon: "link", title: "Community Cooperation", desc: "A meeting point for collective decisions and shared responsibility." },
];

const helpCards = [
  { key: "find", icon: "search", title: "Find Verified Masjids", desc: "Browse masjids that have been checked and verified, so your support reaches the right place.", audience: "donors" },
  { key: "give", icon: "wallet", title: "Give With Confidence", desc: "Donate to campaigns knowing exactly where your money goes and how it will be used.", audience: "donors" },
  { key: "track", icon: "chartUp", title: "Track Real Progress", desc: "See campaign updates and expense reports, so you can follow the impact of your support.", audience: "donors" },
  { key: "register", icon: "flag", title: "Register & Grow", desc: "Masjids can register, launch campaigns, and reach supporters near and far.", audience: "masjids" },
  { key: "concern", icon: "shieldCheck", title: "Raise a Concern", desc: "A simple way to report an issue and have it reviewed and resolved quickly.", audience: "everyone" },
  { key: "language", icon: "globe", title: "Use Your Own Language", desc: "The platform works in multiple languages, so more people can take part.", audience: "everyone" },
];

const references = [
  { key: "hadithMasjid", type: "Hadith", arabic: "مَنْ بَنَى مَسْجِدًا لِلَّهِ بَنَى اللَّهُ لَهُ بَيْتًا فِي الْجَنَّةِ", translation: "Whoever builds a masjid for the sake of Allah, Allah will build for him a house in Paradise.", source: "Sahih Muslim 533" },
  { key: "quranSeed", type: "Qur'an", arabic: "مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ", translation: "The example of those who spend their wealth in the way of Allah is like a seed which grows seven spikes; in each spike is a hundred grains.", source: "Surah Al-Baqarah 2:261" },
  { key: "quranRope", type: "Qur'an", arabic: "وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا", translation: "And hold firmly to the rope of Allah, all together, and do not become divided.", source: "Surah Ali 'Imran 3:103" },
];

const approachItems = [
  { key: "people", icon: "people", label: "People-focused" },
  { key: "grassroots", icon: "link", label: "Grassroots-led" },
  { key: "reported", icon: "shieldCheck", label: "Openly reported" },
  { key: "technology", icon: "monitor", label: "Technology-enabled" },
  { key: "lasting", icon: "drop", label: "Built to last" },
];

const values = [
  { key: "trust", icon: "shieldCheck", title: "Trust", desc: "Building confidence through responsible systems and verified information." },
  { key: "transparency", icon: "chartUp", title: "Transparency", desc: "Helping supporters understand how campaigns and projects progress." },
  { key: "community", icon: "people", title: "Community", desc: "Encouraging collective participation and shared responsibility." },
  { key: "empowerment", icon: "bulb", title: "Empowerment", desc: "Providing masjids and communities with the tools and opportunities to grow." },
  { key: "impact", icon: "globe", title: "Impact", desc: "Focusing on meaningful, measurable and visible outcomes." },
  { key: "unity", icon: "link", title: "Unity", desc: "Connecting people, masjids and communities around shared positive goals." },
];

function AboutUs() {
  const { t, language } = useTranslation();

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

  const audienceLabels = {
    donors: t("aboutUs.help.audience.donors", "For Donors"),
    masjids: t("aboutUs.help.audience.masjids", "For Masjids"),
    everyone: t("aboutUs.help.audience.everyone", "For Everyone"),
  };

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow">{t("aboutUs.hero.eyebrow", "About Us")}</span>
          <h1>
            {language === "en" ? (
              <>
                The masjid is <span className="accent">more</span> than a place of worship.
              </>
            ) : (
              t("aboutUs.hero.title", "The masjid is more than a place of worship.")
            )}
          </h1>
          <p>
            {t(
              "aboutUs.hero.intro",
              "It has always been a center of faith, learning, community, guidance and support. Masjid My Community exists to help every masjid reconnect with that fuller role — and become a stronger, more self-reliant center for the people it serves."
            )}
          </p>
          <div className="hero-ctas">
            <a href="/#register" className="btn btn-gold">
              {t("aboutUs.hero.ctaRegister", "Register Your Masjid")} <span className="btn-arrow">→</span>
            </a>
            <Link to="/our-impact" className="btn btn-outline-paper">
              {t("aboutUs.hero.ctaImpact", "See Our Impact")}
            </Link>
          </div>
        </div>
      </section>

      <section className="py py-tight-b">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto 8px" }}>
            <span className="eyebrow">{t("aboutUs.glance.eyebrow", "At a glance")}</span>
            <h2>{t("aboutUs.glance.title", "A quick orientation before the full story.")}</h2>
          </div>
          <div className="contact-info-grid reveal">
            {quickLinks.map((c) => (
              <div className="contact-info-card" key={c.key}>
                <div className="contact-info-icon">
                  <Icon name={c.icon} size={22} />
                </div>
                <h4>{t(`aboutUs.quickLinks.${c.key}.title`, c.title)}</h4>
                <p>{t(`aboutUs.quickLinks.${c.key}.desc`, c.desc)}</p>
                {c.static ? (
                  <span className="contact-info-action static">{t(`aboutUs.quickLinks.${c.key}.label`, c.label)}</span>
                ) : (
                  <a href={c.href} className="contact-info-action">
                    {t(`aboutUs.quickLinks.${c.key}.label`, c.label)} <span className="btn-arrow">→</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py py-tight-t" id="what-is">
        <div className="wrap about-split-intro reveal">
          <div>
            <span className="eyebrow">{t("aboutUs.whatIs.eyebrow", "What is Masjid My Community?")}</span>
            <h2>{t("aboutUs.whatIs.title", "A simple platform built to help masjids grow stronger.")}</h2>
            <p>
              {t(
                "aboutUs.whatIs.p1",
                "Masjid My Community is an online platform that connects masjids with the people who support them. Masjids can register, share what they need, and raise funds for construction, repairs, education, and community programs."
              )}
            </p>
            <blockquote className="about-pullquote">
              {t("aboutUs.whatIs.pullquote", "Donors find masjids they trust, give with confidence, and see exactly how their support is used.")}
            </blockquote>
            <p>
              {t(
                "aboutUs.whatIs.p2",
                "We built this platform because many masjids are run by a small number of dedicated volunteers, often without the tools they need to manage funds, reach their community, or plan for the future. Masjid My Community brings all of that together in one simple, trusted place — so masjids can focus on serving their people."
              )}
            </p>
          </div>
          <div className="contact-side-card">
            <span className="eyebrow">{t("aboutUs.facts.eyebrow", "Quick facts")}</span>
            <ul className="contact-side-list about-fact-list">
              {quickFacts.map((f) => (
                <li key={f.key}>
                  <span className="about-fact-icon">
                    <Icon name={f.icon} size={16} />
                  </span>
                  {t(`aboutUs.quickFacts.${f.key}`, f.label)}
                </li>
              ))}
            </ul>
            <Link to="/our-impact" className="contact-info-action">
              {t("aboutUs.facts.cta", "See our impact so far")} <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="py cat-strip" id="our-vision">
        <div className="wrap split reveal">
          <div className="why-card why-card-donor">
            <div className="why-icon-badge">
              <Icon name="compass" size={25} />
            </div>
            <span className="eyebrow">{t("aboutUs.vision.eyebrow", "Our vision")}</span>
            <p className="au-vision-text">
              {t(
                "aboutUs.vision.text",
                "A world where every masjid is strong, well-managed, and able to support itself — serving its people well, today and for generations to come. In practice, that means a masjid that is:"
              )}
            </p>
            <ul className="au-mission-list">
              {visionPillars.map((v) => (
                <li key={v.key}>
                  <span className="au-mission-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <span>{t(`aboutUs.vision.pillar.${v.key}`, v.text)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="why-card why-card-masjid">
            <div className="why-icon-badge">
              <Icon name="flag" size={25} />
            </div>
            <span className="eyebrow">{t("aboutUs.mission.eyebrow", "Our mission")}</span>
            <ul className="au-mission-list">
              {mission.map((m) => (
                <li key={m.key}>
                  <span className="au-mission-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <span>{t(`aboutUs.mission.item.${m.key}`, m.text)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py" id="empowering-masjids">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">{t("aboutUs.empowering.eyebrow", "Empowering masjids")}</span>
            <h2>{t("aboutUs.empowering.title", "Helping every masjid stand on its own.")}</h2>
            <p>
              {t(
                "aboutUs.empowering.p",
                "Our main goal is simple: help masjids become stronger, better run, and able to generate the steady income they need to serve their community — without relying only on one-time donations."
              )}
            </p>
          </div>
          <div className="about-card-grid reveal">
            {empoweringPillars.map((r) => (
              <div className={`contact-info-card${r.featured ? " about-card-featured" : ""}`} key={r.key}>
                {r.featured && <span className="about-card-badge">{t("aboutUs.empowering.badge", "Core focus")}</span>}
                <div className="contact-info-icon">
                  <Icon name={r.icon} size={22} />
                </div>
                <h4>{t(`aboutUs.empowering.pillar.${r.key}.title`, r.title)}</h4>
                <p>{t(`aboutUs.empowering.pillar.${r.key}.desc`, r.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py au-refs-section" id="community-center">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">{t("aboutUs.community.eyebrow", "Masjid as a community center")}</span>
            <h2>{t("aboutUs.community.title", "A masjid has always been more than a place to pray.")}</h2>
            <p>
              {t(
                "aboutUs.community.p",
                "For centuries, masjids have been centers for learning, guidance, support and community life — not worship alone. Masjid My Community helps bring this fuller role into the present day."
              )}
            </p>
          </div>
          <div className="au-roles-grid reveal">
            {historicalRoles.map((r) => (
              <div className="au-role-item" key={r.key}>
                <div className="au-role-icon">
                  <Icon name={r.icon} size={22} />
                </div>
                <div>
                  <div className="au-role-title">{t(`aboutUs.community.role.${r.key}.title`, r.title)}</div>
                  <div className="au-role-desc">{t(`aboutUs.community.role.${r.key}.desc`, r.desc)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py" id="how-we-help">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">{t("aboutUs.help.eyebrow", "How we help")}</span>
            <h2>{t("aboutUs.help.title", "What you can do on the platform")}</h2>
            <p>{t("aboutUs.help.p", "A quick look at how Masjid My Community works for masjids and the people who support them.")}</p>
          </div>
          <div className="about-card-grid reveal">
            {helpCards.map((h) => (
              <div className="contact-info-card" key={h.key}>
                <span className={`about-audience-tag about-audience-${h.audience}`}>{audienceLabels[h.audience]}</span>
                <div className="contact-info-icon">
                  <Icon name={h.icon} size={22} />
                </div>
                <h4>{t(`aboutUs.help.card.${h.key}.title`, h.title)}</h4>
                <p>{t(`aboutUs.help.card.${h.key}.desc`, h.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py au-refs-section" id="faith">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">{t("aboutUs.faith.eyebrow", "Rooted in our faith")}</span>
            <h2>{t("aboutUs.faith.title", "Guidance from the Qur'an and Sunnah")}</h2>
            <p>
              {t(
                "aboutUs.faith.p",
                "A few carefully sourced references that inspire this work — presented with their Arabic text and the translation of their meaning."
              )}
            </p>
          </div>
          <div className="about-quote-grid reveal">
            {references.map((r) => (
              <div className="contact-quote-card" key={r.key}>
                <span className="au-ref-type">{t(`aboutUs.faith.ref.${r.key}.type`, r.type)}</span>
                <p className="contact-quote-arabic">{r.arabic}</p>
                <p className="contact-quote-translation">“{t(`aboutUs.faith.ref.${r.key}.translation`, r.translation)}”</p>
                <span className="contact-quote-source mono">{r.source}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py" id="approach-values">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">{t("aboutUs.approachValues.eyebrow", "Our approach & values")}</span>
            <h2>{t("aboutUs.approachValues.title", "What guides everything we build")}</h2>
          </div>
          <div className="au-approach-row reveal">
            {approachItems.map((a) => (
              <span className="au-approach-item" key={a.key}>
                <Icon name={a.icon} size={16} />
                {t(`aboutUs.approach.${a.key}`, a.label)}
              </span>
            ))}
          </div>
          <div className="au-values-grid reveal">
            {values.map((v) => (
              <div className="au-value-item" key={v.key}>
                <div className="au-value-icon">
                  <Icon name={v.icon} size={24} />
                </div>
                <div className="au-value-title">{t(`aboutUs.values.${v.key}.title`, v.title)}</div>
                <div className="au-value-desc">{t(`aboutUs.values.${v.key}.desc`, v.desc)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <span className="eyebrow">{t("aboutUs.cta.eyebrow", "Ready to begin?")}</span>
          <h2>{t("aboutUs.cta.title", "Help build a masjid that stands on its own.")}</h2>
          <p>
            {t(
              "aboutUs.cta.p",
              "Whether you're registering a masjid or supporting one that matters to you, you're helping build something that lasts well beyond a single donation."
            )}
          </p>
          <div className="ctas">
            <a href="/#register" className="btn btn-gold">
              {t("aboutUs.cta.registerBtn", "Register Your Masjid")} <span className="btn-arrow">→</span>
            </a>
            <Link to="/our-impact" className="btn btn-outline-paper">
              {t("aboutUs.cta.impactBtn", "See Our Impact")} <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AboutUs;
