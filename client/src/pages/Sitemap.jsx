import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

function useSections(t) {
  return [
    {
      key: "platform",
      title: t("sitemapPage.section.platform", "Platform"),
      links: [
        { to: "/", label: t("sitemapPage.link.home", "Home") },
        { to: "/how-it-works", label: t("sitemapPage.link.howItWorks", "How It Works") },
        { to: "/explore-campaigns", label: t("sitemapPage.link.exploreCampaigns", "Explore Campaigns") },
        { to: "/verified-masjid", label: t("sitemapPage.link.verifiedMasjid", "Verified Masjid") },
        { to: "/explore-masjids", label: t("sitemapPage.link.exploreMasjids", "Explore Masjids") },
        { to: "/our-impact", label: t("sitemapPage.link.ourImpact", "Our Impact") },
      ],
    },
    {
      key: "community",
      title: t("sitemapPage.section.community", "Community"),
      links: [
        { to: "/success-stories", label: t("sitemapPage.link.successStories", "Success Stories") },
        { to: "/testimonials", label: t("sitemapPage.link.testimonials", "Testimonials") },
        { to: "/my-community", label: t("sitemapPage.link.communityWall", "Community Wall") },
      ],
    },
    {
      key: "company",
      title: t("sitemapPage.section.company", "Company"),
      links: [
        { to: "/about", label: t("sitemapPage.link.about", "About Masjid My Community") },
        { to: "/faq", label: t("sitemapPage.link.faq", "FAQ") },
        { to: "/contact", label: t("sitemapPage.link.contact", "Contact") },
        { to: "/raise-a-concern", label: t("sitemapPage.link.raiseConcern", "Raise a Concern") },
      ],
    },
    {
      key: "legal",
      title: t("sitemapPage.section.legal", "Legal"),
      links: [
        { to: "/terms", label: t("sitemapPage.link.terms", "Terms of Use") },
        { to: "/privacy", label: t("sitemapPage.link.privacy", "Privacy Policy") },
        { to: "/cookie-policy", label: t("sitemapPage.link.cookiePolicy", "Cookie Policy") },
      ],
    },
    {
      key: "account",
      title: t("sitemapPage.section.account", "Account"),
      links: [
        { to: "/auth", label: t("sitemapPage.link.login", "Login & Registration") },
        { to: "/#register", label: t("sitemapPage.link.registerMasjid", "Register Your Masjid") },
      ],
    },
  ];
}

function Sitemap() {
  const { t } = useTranslation();
  const sections = useSections(t);

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

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="hero-glow" aria-hidden="true" />
        <div className="wrap">
          <span className="eyebrow">{t("sitemapPage.hero.eyebrow", "Sitemap")}</span>
          <h1>{t("sitemapPage.hero.title", "Every page, in one place.")}</h1>
          <p>{t("sitemapPage.hero.intro", "A complete directory of Masjid My Community's public pages.")}</p>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="sitemap-grid">
            {sections.map((section) => (
              <div className="sitemap-col reveal" key={section.key}>
                <h3>{section.title}</h3>
                <ul>
                  {section.links.map((link) => (
                    <li key={link.to}>
                      <Link to={link.to}>
                        <Icon name="chevronRight" size={14} />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Sitemap;
