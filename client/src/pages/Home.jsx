import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE, API_ORIGIN } from "../config.js";
import { toCardShape } from "../utils/campaignCardShape.js";
import { useLoginGatedNav } from "../hooks/useLoginGatedNav.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const masjidData = [
  { name: "Masjid An-Noor", loc: "Dhaka, Bangladesh", flag: "🇧🇩", year: 2009, camps: 2, served: "3,200", img: "https://images.unsplash.com/photo-1549526725-5c188c251c37?auto=format&fit=crop&w=500&q=75" },
  { name: "Masjid Al-Falah", loc: "Lagos, Nigeria", flag: "🇳🇬", year: 1994, camps: 1, served: "5,000", img: "https://images.unsplash.com/photo-1713691132931-1cc66e362cdc?auto=format&fit=crop&w=500&q=75" },
  { name: "Islamic Center of Berlin", loc: "Berlin, Germany", flag: "🇩🇪", year: 2001, camps: 3, served: "1,800", img: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=500&q=75" },
  { name: "Masjid Al-Salam", loc: "Houston, USA", flag: "🇺🇸", year: 1988, camps: 1, served: "2,600", img: "https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=500&q=75" },
];

const heroStats = [
  { count: 1250, suffix: "", label: "Masjids Registered", key: "masjidsRegistered" },
  { count: 2500000, prefix: "₹", suffix: "+", label: "Funds Raised", key: "fundsRaised" },
  { count: 45, suffix: "+", label: "Countries", key: "countries" },
  { count: 18000, suffix: "+", label: "Supporters", key: "supporters" },
];

const trustItems = [
  { label: "Verified Masjids", key: "verifiedMasjids", d: ["M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"] },
  { label: "Transparent Fund Tracking", key: "transparentFundTracking", d: ["M3 12h18M3 6h18M3 18h18"] },
  { label: "Secure Donations", key: "secureDonations", rect: { x: 3, y: 11, width: 18, height: 10, rx: 1 }, d: ["M7 11V7a5 5 0 0110 0v4"] },
  { label: "Regular Project Updates", key: "regularProjectUpdates", d: ["M4 4v16h16", "M4 15l4-5 4 3 8-9"] },
  { label: "Global Community", key: "globalCommunity", circle: { cx: 12, cy: 12, r: 9 }, d: ["M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"] },
];

const categories = [
  { name: "Construction", key: "construction", desc: "New prayer halls, minarets and community spaces built from the ground up.", d: ["M4 21V11l8-6 8 6v10", "M9 21v-6a3 3 0 016 0v6", "M12 5V2"] },
  { name: "Renovation", key: "renovation", desc: "Restoring historic masjids and repairing structural wear.", d: ["M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"] },
  { name: "Education", key: "education", desc: "Islamic schools, libraries and learning programs for all ages.", d: ["M2 4h7a3 3 0 013 3v13a2 2 0 00-2-2H2z", "M22 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z"] },
  { name: "Solar Energy", key: "solarEnergy", desc: "Cutting electricity costs with clean, sustainable power.", circle: { cx: 12, cy: 12, r: 4 }, d: ["M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"] },
  { name: "Water", key: "water", desc: "Clean water access and wudu facilities for the community.", d: ["M12 2.5S5 11 5 15.5a7 7 0 0014 0C19 11 12 2.5 12 2.5z"] },
  { name: "Digital Facilities", key: "digitalFacilities", desc: "Sound systems, streaming and digital infrastructure.", rect: { x: 2, y: 4, width: 20, height: 14, rx: 2 }, d: ["M8 21h8M12 18v3"] },
  { name: "Community Welfare", key: "communityWelfare", desc: "Food, shelter and support programs for families in need.", circle: { cx: 9, cy: 7, r: 4 }, d: ["M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"] },
  { name: "Emergency Support", key: "emergencySupport", desc: "Rapid response funding after disasters and urgent damage.", d: ["M22 12h-4l-3 9L9 3l-3 9H2"] },
];

const stepsByAudience = {
  masjid: [
    { key: "register", title: "Register", body: "Create your masjid profile with location, capacity and community details." },
    { key: "getVerified", title: "Get verified", body: "Submit registration documents and committee details for review." },
    { key: "createCampaign", title: "Create a campaign", body: "Tell your story, set a target and explain exactly what funds cover." },
    { key: "receiveSupport", title: "Receive support", body: "Connect with donors from your city and around the world." },
    { key: "shareProgress", title: "Share progress", body: "Post photo updates and expense breakdowns as work continues." },
  ],
  donor: [
    { key: "discover", title: "Discover", body: "Browse verified campaigns by category, country or urgency." },
    { key: "choose", title: "Choose", body: "Read the campaign story and see exactly what the funds will do." },
    { key: "donate", title: "Donate", body: "Give securely as Zakat or Sadaqah, in your local currency." },
    { key: "track", title: "Track", body: "Follow milestones and expense updates from your dashboard." },
    { key: "seeImpact", title: "See the impact", body: "Watch the finished project and read the community's story." },
  ],
};

const empowerCards = [
  { key: "digital", mark: "01 / Digital", title: "Digital Empowerment", desc: "Helping masjids adopt websites, communication tools and digital record-keeping.", stat: "180+", statLabel: "masjid websites live", rect: { x: 2, y: 4, width: 20, height: 14, rx: 2 }, d: ["M8 21h8M12 18v3"] },
  { key: "financial", mark: "02 / Financial", title: "Financial Empowerment", desc: "Building transparent fundraising and financial reporting systems that donors trust.", stat: "₹410K+", statLabel: "tracked transparently", d: ["M3 3v18h18", "M8 17V11", "M13 17V7", "M18 17v-4"] },
  { key: "learning", mark: "03 / Learning", title: "Education & Learning", desc: "Supporting educational programs, libraries and Islamic learning initiatives.", stat: "60+", statLabel: "education programs supported", d: ["M2 4h7a3 3 0 013 3v13a2 2 0 00-2-2H2z", "M22 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8z"] },
  { key: "sustainability", mark: "04 / Sustainability", title: "Sustainability", desc: "Encouraging solar power, water conservation and lower-impact operations.", stat: "35", statLabel: "masjids switched to solar", circle: { cx: 12, cy: 12, r: 4 }, d: ["M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"] },
  { key: "community", mark: "05 / Community", title: "Community Development", desc: "Supporting youth, women, families and volunteers who keep the masjid running.", stat: "2,400+", statLabel: "volunteers engaged", circle: { cx: 9, cy: 7, r: 4 }, d: ["M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75"] },
  { key: "visibility", mark: "06 / Visibility", title: "Global Visibility", desc: "Helping masjids share their story and connect with supporters worldwide.", stat: "45", statLabel: "countries reached", circle: { cx: 12, cy: 12, r: 9 }, d: ["M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"] },
];

const donorReasons = [
  { key: "verifiedNotAnonymous", title: "Support verified masjids, not anonymous requests", detail: "Every masjid completes ID and committee verification before their campaign goes live." },
  { key: "meaningfulProjects", title: "Discover meaningful, clearly-explained projects", detail: "Each campaign spells out exactly what the funds will build or fix." },
  { key: "secureZakatSadaqah", title: "Donate securely, tagged as Zakat or Sadaqah", detail: "Choose your fund type at checkout so it's recorded correctly for your records." },
  { key: "trackProgress", title: "Track progress with real photo updates", detail: "Committees post dated photos as construction and spending happen." },
  { key: "realImpact", title: "See the real-world impact of your contribution", detail: "Follow the campaign through to completion and read the finished story." },
];
const masjidReasons = [
  { key: "globalAudience", title: "Reach a global audience of donors", detail: "Your campaign is discoverable by donors across 46+ countries." },
  { key: "transparentFunds", title: "Raise funds transparently, campaign after campaign", detail: "Publish itemized expense reports that build trust with every donor." },
  { key: "donorTrust", title: "Build lasting donor trust with clear reporting", detail: "Verified badges and milestone updates keep supporters confident." },
  { key: "empowermentPrograms", title: "Access digital and financial empowerment programs", detail: "Free websites, reporting tools and matched funding as you grow." },
  { key: "showcaseStory", title: "Showcase your community's story and impact", detail: "Share photos, testimonials and finished projects with the world." },
];

const stories = [
  { key: "cleanWater", cat: "Clean Water", title: "A well that changed daily life in rural Senegal", text: "Masjid Al-Ihsan needed a working well before it could hold consistent prayers. In ten weeks, 640 donors across 22 countries funded the full project.", figs: [{ key: "raised", n: 8400, prefix: "₹", label: "raised" }, { key: "supporters", n: 640, label: "supporters" }, { key: "peopleServed", n: 1200, label: "people served" }], img: "https://images.unsplash.com/photo-1705923620684-683a7473b504?auto=format&fit=crop&w=800&q=75" },
  { key: "education", cat: "Education", title: "A learning center built for 300 students in Karachi", text: "What began as a single classroom request grew into a full learning center, funded largely by families who once studied at the same masjid.", figs: [{ key: "raised", n: 21000, prefix: "₹", label: "raised" }, { key: "supporters", n: 980, label: "supporters" }, { key: "studentsEnrolled", n: 300, label: "students enrolled" }], img: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=800&q=75" },
];

const testimonials = [
  { key: "1", quote: "For the first time, our donors could see exactly where each dollar went. Contributions doubled within a season.", who: "Imam Yusuf Rahman — Masjid Committee Chair, Nairobi", initials: "YR" },
  { key: "2", quote: "I gave Zakat through Masjid My Community and got photo updates every few weeks. It felt like I was part of building the wall myself.", who: "Amina K. — Donor, London", initials: "AK" },
  { key: "3", quote: "We coordinated volunteers across three continents for one project. Masjid My Community made that logistics work manageable.", who: "Farhan S. — Volunteer Coordinator, Toronto", initials: "FS" },
];

const programs = [
  { key: "digitalMasjid", tag: "01", title: "Digital Masjid Program", desc: "Free websites and communication tools for newly-verified masjids.", status: "Now Live", statusKey: "statusNowLive", live: true, interest: 128 },
  { key: "sustainabilityInitiative", tag: "02", title: "Sustainability Initiative", desc: "Matched funding for solar and water-efficiency projects.", status: "Piloting", statusKey: "statusPiloting", live: false, interest: 94 },
  { key: "educationFund", tag: "03", title: "Education Fund", desc: "Grants for libraries, Islamic studies and after-school learning.", status: "Now Live", statusKey: "statusNowLive", live: true, interest: 156 },
  { key: "communityInnovation", tag: "04", title: "Community Innovation Program", desc: "Seed funding for community-led ideas outside standard categories.", status: "Accepting Proposals", statusKey: "statusAcceptingProposals", live: false, interest: 41 },
  { key: "youthEmpowerment", tag: "05", title: "Youth Empowerment", desc: "Mentorship and small grants for youth-run masjid initiatives.", status: "Piloting", statusKey: "statusPiloting", live: false, interest: 73 },
  { key: "womenFamily", tag: "06", title: "Women & Family Support", desc: "Dedicated spaces, programs and resources for women and families.", status: "Launching Soon", statusKey: "statusLaunchingSoon", live: false, interest: 62 },
];

const RESOURCE_TYPE_KEYS = {
  Guide: "home.resources.typeGuide",
  Video: "home.resources.typeVideo",
  Article: "home.resources.typeArticle",
  Download: "home.resources.typeDownload",
};

const resources = [
  { key: "campaignTrustGuide", type: "Guide", title: "How to write a campaign that earns trust", cta: "Read guide", ctaKey: "ctaReadGuide", meta: "6 min read" },
  { key: "financialTransparencyGuide", type: "Guide", title: "Financial transparency guidelines for committees", cta: "Read guide", ctaKey: "ctaReadGuide", meta: "8 min read" },
  { key: "digitalTransformationVideo", type: "Video", title: "Digital transformation for smaller masjids", cta: "Watch video", ctaKey: "ctaWatchVideo", meta: "12 min watch" },
  { key: "fundraisingArticle", type: "Article", title: "Fundraising best practices from top campaigns", cta: "Read article", ctaKey: "ctaReadArticle", meta: "5 min read" },
  { key: "sustainableCommunitiesArticle", type: "Article", title: "Building sustainable masjid communities", cta: "Read article", ctaKey: "ctaReadArticle", meta: "7 min read" },
  { key: "engagementChecklist", type: "Download", title: "Community engagement strategy checklist", cta: "Download PDF", ctaKey: "ctaDownloadPdf", meta: "PDF · 2 pages" },
];

const RESOURCE_STYLES = {
  Guide: { color: "#8DC63F", bg: "rgba(141,198,63,.16)" },
  Video: { color: "#6FA82C", bg: "rgba(111,168,44,.16)" },
  Article: { color: "#2A4E5C", bg: "rgba(42,78,92,.14)" },
  Download: { color: "#1E3A46", bg: "rgba(30,58,70,.12)" },
};

function ResourceIcon({ type }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "Video") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.3l6 3.7-6 3.7z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "Article") {
    return (
      <svg {...common}>
        <path d="M4 4h13a2 2 0 012 2v13a1 1 0 01-1 1H6a2 2 0 01-2-2V4z" />
        <path d="M8 8h6M8 12h6M8 16h3" />
        <path d="M17 4v3h3" />
      </svg>
    );
  }
  if (type === "Download") {
    return (
      <svg {...common}>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}


function Icon({ item, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {item.rect && <rect x={item.rect.x} y={item.rect.y} width={item.rect.width} height={item.rect.height} rx={item.rect.rx} />}
      {item.circle && <circle cx={item.circle.cx} cy={item.circle.cy} r={item.circle.r} />}
      {item.d.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

function mosqueIllustration(seed) {
  const skies = [
    ["#1E3A46", "#2A4E5C"], ["#274A38", "#8DC63F"], ["#1E3A46", "#6FA82C"],
    ["#173038", "#2A4E5C"], ["#20402C", "#8DC63F"], ["#1E3A46", "#3D6A3A"],
  ];
  const [c1, c2] = skies[seed % skies.length];
  const minaretL = 60 + (seed % 3) * 6;
  const minaretR = 340 - (seed % 3) * 6;
  return `<svg viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice" style="width:100%;height:100%;display:block;">
    <defs>
      <linearGradient id="sky${seed}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="220" fill="url(#sky${seed})"/>
    <circle cx="330" cy="42" r="26" fill="rgba(255,255,255,0.10)"/>
    <g fill="rgba(255,255,255,0.92)">
      <rect x="${minaretL - 4}" y="70" width="8" height="90" />
      <polygon points="${minaretL - 9},70 ${minaretL + 9},70 ${minaretL},52" />
      <rect x="${minaretL - 7}" y="66" width="14" height="6" />
      <rect x="${minaretR - 4}" y="70" width="8" height="90" />
      <polygon points="${minaretR - 9},70 ${minaretR + 9},70 ${minaretR},52" />
      <rect x="${minaretR - 7}" y="66" width="14" height="6" />
      <path d="M140 160 Q140 100 200 100 Q260 100 260 160 Z" />
      <rect x="192" y="82" width="16" height="22" />
      <circle cx="200" cy="78" r="6" />
      <rect x="120" y="160" width="160" height="60" />
      <path d="M155 220 L155 190 Q155 176 168 176 Q181 176 181 190 L181 220 Z" fill="${c1}"/>
      <path d="M219 220 L219 190 Q219 176 232 176 Q245 176 245 190 L245 220 Z" fill="${c1}"/>
      <rect x="132" y="176" width="18" height="30" rx="9" fill="${c1}"/>
      <rect x="250" y="176" width="18" height="30" rx="9" fill="${c1}"/>
    </g>
  </svg>`;
}

function CardImg({ src, seed, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div dangerouslySetInnerHTML={{ __html: mosqueIllustration(seed) }} style={{ width: "100%", height: "100%" }} />;
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function CompareSlider({ seed, afterSrc, alt }) {
  const ref = useRef(null);
  const [reveal, setReveal] = useState(50);

  const moveTo = (clientX) => {
    const rect = ref.current.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setReveal(Math.min(96, Math.max(4, pct)));
  };

  return (
    <div
      className="story-compare"
      ref={ref}
      onMouseMove={(e) => moveTo(e.clientX)}
      onMouseLeave={() => setReveal(50)}
      onTouchMove={(e) => moveTo(e.touches[0].clientX)}
    >
      <div className="story-before" dangerouslySetInnerHTML={{ __html: mosqueIllustration(seed) }} />
      <div className="story-after" style={{ clipPath: `inset(0 0 0 ${reveal}%)` }}>
        <img src={afterSrc} alt={alt} loading="lazy" />
      </div>
      <div className="story-divider" style={{ left: `${reveal}%` }}>
        <span className="story-handle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 7l-4 5 4 5M16 7l4 5-4 5" />
          </svg>
        </span>
      </div>
      <span className="story-tag story-tag-before">Before</span>
      <span className="story-tag story-tag-after">After</span>
    </div>
  );
}

function useCountUp(target, ref, prefix = "", suffix = "") {
  const [text, setText] = useState("0");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dur = 1600;
            const start = performance.now();
            function tick(now) {
              const p = Math.min(1, (now - start) / dur);
              const eased = 1 - Math.pow(1 - p, 3);
              setText(prefix + Math.round(target * eased).toLocaleString("en-US") + suffix);
              if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, prefix, suffix, ref]);
  return text;
}

function StatNum({ stat }) {
  const ref = useRef(null);
  const text = useCountUp(stat.count, ref, stat.prefix || "", stat.suffix || "");
  return (
    <div ref={ref} className="stat-num mono">
      {text}
    </div>
  );
}

function Particles({ count = 16 }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.round(Math.random() * 96) + 2,
        size: 3 + Math.random() * 5,
        duration: 7 + Math.random() * 8,
        delay: Math.random() * 8,
      })),
    [count]
  );
  return (
    <div className="hero-particles" aria-hidden="true">
      {items.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function FigNum({ n, prefix }) {
  const ref = useRef(null);
  const text = useCountUp(n, ref, prefix || "", "");
  return <strong ref={ref}>{text}</strong>;
}

function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let ticking = false;
    function update() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const height = doc.scrollHeight - doc.clientHeight;
      setPct(height > 0 ? (scrollTop / height) * 100 : 0);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="scroll-progress" style={{ width: `${pct}%` }} aria-hidden="true" />;
}

function ProgressBar({ pct }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="progress-track" ref={ref}>
      <div className="progress-fill" style={{ width: inView ? `${pct}%` : "0%" }} />
    </div>
  );
}

const SAVED_KEY = "mmc-saved-campaigns";
const FOLLOWED_KEY = "mmc-followed-masjids";
const INTERESTED_KEY = "mmc-interested-programs";

function handleProgramTilt(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width - 0.5;
  const py = (e.clientY - rect.top) / rect.height - 0.5;
  const rx = (-py * 9).toFixed(2);
  const ry = (px * 9).toFixed(2);
  el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
}
function resetProgramTilt(e) {
  e.currentTarget.style.transform = "";
}
const resourceTypes = [...new Set(resources.map((r) => r.type))];

function handleCatMouseMove(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - rect.top}px`);
}

function Home() {
  const { t } = useTranslation();
  const goToCampaigns = useLoginGatedNav();
  const [tab, setTab] = useState("masjid");
  const [activeStep, setActiveStep] = useState(0);
  const [flipped, setFlipped] = useState(() => new Set());
  const [ctaAudience, setCtaAudience] = useState(null);
  const ctaCountRef = useRef(null);
  const ctaCountText = useCountUp(18000, ctaCountRef, "", "+");
  const [openDonorReason, setOpenDonorReason] = useState(null);
  const [openMasjidReason, setOpenMasjidReason] = useState(null);
  const toggleFlip = (title) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };
  const [testiIdx, setTestiIdx] = useState(0);
  const touchStartX = useRef(null);
  const nextTesti = () => setTestiIdx((i) => (i + 1) % testimonials.length);
  const prevTesti = () => setTestiIdx((i) => (i - 1 + testimonials.length) % testimonials.length);
  const [featuredFaqs, setFeaturedFaqs] = useState([]);
  useEffect(() => {
    axios
      .get(`${API_BASE}/faq`, { params: { featured: true } })
      .then(({ data }) => setFeaturedFaqs(data.faqs.slice(0, 4)))
      .catch(() => {});
  }, []);
  const [campaignFilter, setCampaignFilter] = useState("All");
  const [resourceFilter, setResourceFilter] = useState("All");
  const [saved, setSaved] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });

  const toggleSaved = (id) => {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(SAVED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const [liveCampaigns, setLiveCampaigns] = useState(null);
  useEffect(() => {
    axios
      .get(`${API_BASE}/campaigns/public`, { params: { pageSize: 48 } })
      .then(({ data }) => setLiveCampaigns(data.campaigns.map(toCardShape)))
      .catch(() => setLiveCampaigns([]));
  }, []);
  const campaignData = liveCampaigns || [];
  const campaignCats = useMemo(() => [...new Set(campaignData.map((c) => c.cat))], [campaignData]);
  const campaignCountByCat = useMemo(
    () => campaignData.reduce((acc, c) => ({ ...acc, [c.cat]: (acc[c.cat] || 0) + 1 }), {}),
    [campaignData]
  );

  const [followed, setFollowed] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(FOLLOWED_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });

  const toggleFollowed = (name) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      localStorage.setItem(FOLLOWED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const [interested, setInterested] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(INTERESTED_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });

  const toggleInterested = (title) => {
    setInterested((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      localStorage.setItem(INTERESTED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const filteredCampaigns =
    campaignFilter === "All"
      ? campaignData
      : campaignFilter === "__saved__"
      ? campaignData.filter((c) => saved.has(c.id))
      : campaignData.filter((c) => c.cat === campaignFilter);

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
      { threshold: 0, rootMargin: "0px 0px 120px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTestiIdx((i) => (i + 1) % testimonials.length), 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setActiveStep(0);
  }, [tab]);

  useEffect(() => {
    const id = setInterval(() => setActiveStep((i) => (i + 1) % stepsByAudience[tab].length), 2200);
    return () => clearInterval(id);
  }, [tab]);

  return (
    <main id="top">
      <ScrollProgress />
      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <Particles />
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">{t("home.hero.eyebrow", "Global masjid crowdfunding & empowerment")}</span>
            <h1>
              {t("home.hero.title.line1", "Every masjid has a need.")}
              <br />
              {t("home.hero.title.line2a", "Every ")}<span className="accent">{t("home.hero.title.accent", "good deed")}</span>
              <br />
              {t("home.hero.title.line3", "can make a difference.")}
            </h1>
            <p className="lede">
              {t(
                "home.hero.lede",
                "Masjid My Community connects verified masjids with people who want to support meaningful projects — construction, education, clean water, solar power — with full visibility into where every contribution goes."
              )}
            </p>
            <div className="hero-ctas">
              <a href="/explore-campaigns" className="btn btn-gold" onClick={(e) => { e.preventDefault(); goToCampaigns("/explore-campaigns"); }}>
                {t("home.cta.exploreCampaigns", "Explore Campaigns")} <span className="btn-arrow">→</span>
              </a>
              <a href="#register" className="btn btn-outline-paper">
                {t("home.cta.registerYourMasjid", "Register Your Masjid")}
              </a>
            </div>
          </div>
          <div className="hero-stats">
            {heroStats.map((s) => (
              <div key={s.label}>
                <StatNum stat={s} />
                <div className="stat-label">{t(`home.hero.stat.${s.key}`, s.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust">
        <div className="wrap trust-inner">
          {trustItems.map((item) => (
            <div className="trust-item" key={item.label}>
              <Icon item={item} />
              {t(`home.trust.${item.key}`, item.label)}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED CAMPAIGNS */}
      <section className="py" id="campaigns">
        <div className="wrap">
          <div className="section-head reveal" style={{ marginBottom: "22px" }}>
            <span className="eyebrow">{t("home.campaigns.eyebrow", "Featured campaigns")}</span>
            <h2>{t("home.campaigns.heading", "Projects raising funds right now")}</h2>
          </div>

          <div className="campaign-filters reveal">
            <button
              className={`filter-chip${campaignFilter === "All" ? " active" : ""}`}
              onClick={() => setCampaignFilter("All")}
            >
              {t("home.filters.all", "All")}
            </button>
            {campaignCats.map((cat) => (
              <button
                key={cat}
                className={`filter-chip${campaignFilter === cat ? " active" : ""}`}
                onClick={() => setCampaignFilter(cat)}
              >
                {cat}
              </button>
            ))}
            <button
              className={`filter-chip saved-chip${campaignFilter === "__saved__" ? " active" : ""}`}
              onClick={() => setCampaignFilter("__saved__")}
            >
              {t("home.campaigns.savedChip", "♥ Saved")}{saved.size > 0 ? ` (${saved.size})` : ""}
            </button>
          </div>
          <div className="filter-count">
            {liveCampaigns === null
              ? t("home.campaigns.loading", "Loading campaigns…")
              : t("home.campaigns.showingCount", "Showing {shown} of {total} campaigns")
                  .replace("{shown}", filteredCampaigns.length)
                  .replace("{total}", campaignData.length)}
          </div>

          {liveCampaigns !== null && filteredCampaigns.length === 0 ? (
            <div className="campaign-empty">
              <p>
                {campaignFilter === "__saved__"
                  ? t("home.campaigns.emptySaved", "No saved campaigns yet — tap the heart on a card to keep track of one.")
                  : campaignData.length === 0
                  ? t("home.campaigns.emptyNone", "No live campaigns right now — check back soon.")
                  : t("home.campaigns.emptyInCategory", "No live campaigns in {category} right now — check back soon.").replace(
                      "{category}",
                      campaignFilter
                    )}
              </p>
              <button className="btn btn-outline-ink" style={{ marginTop: "16px" }} onClick={() => setCampaignFilter("All")}>
                {t("home.campaigns.browseAll", "Browse All Campaigns")}
              </button>
            </div>
          ) : (
            <div className="campaign-grid" style={{ marginTop: "12px" }} key={campaignFilter}>
              {filteredCampaigns.map((c, i) => {
                const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
                const isSaved = saved.has(c.id);
                const urgent = c.days > 0 && c.days <= 14;
                return (
                  <Link to={`/campaign/${c.slug}`} className="campaign-card" style={{ animationDelay: `${i * 0.06}s` }} key={c.id}>
                    <div className="campaign-img">
                      <CardImg src={c.img} seed={i} alt={t("home.campaigns.cardAlt", "Masjid campaign")} />
                      <span className="campaign-badge">✓ {c.badge}</span>
                      <span className="campaign-cat">{c.cat}</span>
                      <button
                        className={`campaign-save${isSaved ? " active" : ""}`}
                        aria-label={isSaved ? t("home.campaigns.removeSaved", "Remove from saved campaigns") : t("home.campaigns.saveCampaign", "Save campaign")}
                        aria-pressed={isSaved}
                        onClick={(e) => { e.preventDefault(); toggleSaved(c.id); }}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.8 4 5.2c2-1.2 4.4-.6 5.7 1 .7.8 1.4 1.8 2.3 1.8s1.6-1 2.3-1.8c1.3-1.6 3.7-2.2 5.7-1 2.6 1.6 3.2 4.9 1.3 7.7C18.7 16.65 12 21 12 21z" />
                        </svg>
                      </button>
                    </div>
                    <div className="campaign-body">
                      <div className="campaign-loc">{c.name} · {c.loc}</div>
                      <div className="campaign-title">{c.title}</div>
                      <ProgressBar pct={pct} />
                      <div className="campaign-meta">
                        <span className="raised">
                          {t("home.campaigns.raisedAmount", "{amount} raised").replace("{amount}", `₹${c.raised.toLocaleString("en-US")}`)}
                        </span>
                        <span className="goal">
                          {t("home.campaigns.ofGoal", "of {goal}").replace("{goal}", `₹${c.goal.toLocaleString("en-US")}`)}
                        </span>
                      </div>
                      <div className="campaign-foot">
                        <span>{t("home.campaigns.supportersCount", "{count} supporters").replace("{count}", c.supporters)}</span>
                        <span className={urgent ? "urgent" : ""}>
                          {c.days > 0
                            ? t("home.campaigns.daysLeft", "{days} days left").replace("{days}", c.days)
                            : t("home.campaigns.fullyFunded", "Fully funded")}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "44px" }}>
            <Link to="/campaigns" className="btn btn-outline-ink">
              {t("home.campaigns.viewAll", "View All Campaigns")} <span className="btn-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py cat-strip" id="categories">
        <div className="wrap">
          <div className="section-head on-ink reveal">
            <span className="eyebrow">{t("home.categories.eyebrow", "Explore by category")}</span>
            <h2>{t("home.categories.heading", "Fund the need that speaks to you")}</h2>
            <p>{t("home.categories.subtext", "Tap a category to jump straight to matching campaigns.")}</p>
          </div>
          <div className="cat-grid reveal">
            {categories.map((c) => {
              const count = campaignCountByCat[c.name] || 0;
              return (
                <button
                  className="cat-item"
                  key={c.name}
                  onMouseMove={handleCatMouseMove}
                  onClick={() => {
                    setCampaignFilter(count > 0 ? c.name : "All");
                    document.getElementById("campaigns")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <div className="cat-icon">
                    <Icon item={c} size={27} />
                  </div>
                  <div className="cat-name">{t(`home.categories.${c.key}.name`, c.name)}</div>
                  <div className="cat-desc">{t(`home.categories.${c.key}.desc`, c.desc)}</div>
                  <span className="cat-count">
                    {count > 0
                      ? t(
                          count > 1 ? "home.categories.liveCampaignsPlural" : "home.categories.liveCampaignsSingular",
                          `{count} live campaign${count > 1 ? "s" : ""}`
                        ).replace("{count}", count)
                      : t("home.categories.newCategory", "New category")}
                  </span>
                  <span className="cat-arrow">
                    {t("home.categories.exploreCampaigns", "Explore campaigns")}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py" id="how">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">{t("home.how.eyebrow", "How Masjid My Community works")}</span>
            <h2>{t("home.how.heading", "From registration to real-world impact")}</h2>
          </div>
          <div className="hiw-tabs reveal">
            <button className={`hiw-tab${tab === "masjid" ? " active" : ""}`} onClick={() => setTab("masjid")}>
              {t("home.how.tabMasjids", "For Masjids")}
            </button>
            <button className={`hiw-tab${tab === "donor" ? " active" : ""}`} onClick={() => setTab("donor")}>
              {t("home.how.tabDonors", "For Donors")}
            </button>
          </div>
          <div className="hiw-panel active" key={tab}>
            {stepsByAudience[tab].map((s, i) => (
              <div
                className={`step-card${i === activeStep ? " active" : ""}`}
                style={{ animationDelay: `${i * 0.08}s` }}
                key={s.title}
                onClick={() => setActiveStep(i)}
              >
                <div className="step-num">0{i + 1}</div>
                <div className="step-title">{t(`home.how.step.${s.key}.title`, s.title)}</div>
                <div className="step-desc">{t(`home.how.step.${s.key}.body`, s.body)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EMPOWERMENT */}
      <section className="py cat-strip" id="empower">
        <div className="wrap">
          <div className="section-head on-ink reveal">
            <span className="eyebrow">{t("home.empower.eyebrow", "Beyond fundraising")}</span>
            <h2>{t("home.empower.heading", "Building stronger masjids")}</h2>
            <p>
              {t(
                "home.empower.subtext",
                "Masjid My Community isn't only about raising money. It's a long-term commitment to helping masjids become resilient, connected centers for their communities. Tap a card to see the impact."
              )}
            </p>
          </div>
          <div className="empower-grid reveal">
            {empowerCards.map((c, i) => {
              const isFlipped = flipped.has(c.title);
              return (
                <div
                  className={`empower-card${isFlipped ? " flipped" : ""}`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                  key={c.title}
                  onClick={() => toggleFlip(c.title)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleFlip(c.title)}
                >
                  <div className="empower-inner">
                    <div className="empower-face empower-front">
                      <div className="empower-icon">
                        <Icon item={c} size={24} />
                      </div>
                      <div>
                        <span className="empower-mark">{t(`home.empower.${c.key}.mark`, c.mark)}</span>
                        <div className="empower-title">{t(`home.empower.${c.key}.title`, c.title)}</div>
                      </div>
                      <span className="empower-hint">
                        {t("home.empower.tapForImpact", "Tap for impact")}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </div>
                    <div className="empower-face empower-back">
                      <div>
                        <div className="empower-stat">{c.stat}</div>
                        <div className="empower-stat-label">{t(`home.empower.${c.key}.statLabel`, c.statLabel)}</div>
                      </div>
                      <p className="empower-desc">{t(`home.empower.${c.key}.desc`, c.desc)}</p>
                      <span className="empower-hint">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M11 6l-6 6 6 6" />
                        </svg>
                        {t("home.empower.back", "Back")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY DONATE */}
      <section className="py" id="donate-why">
        <div className="wrap split">
          <div className="why-card why-card-donor reveal">
            <div className="why-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.8 4 5.2c2-1.2 4.4-.6 5.7 1 .7.8 1.4 1.8 2.3 1.8s1.6-1 2.3-1.8c1.3-1.6 3.7-2.2 5.7-1 2.6 1.6 3.2 4.9 1.3 7.7C18.7 16.65 12 21 12 21z" />
              </svg>
            </div>
            <span className="eyebrow">{t("home.why.donorEyebrow", "For donors")}</span>
            <h2 style={{ fontSize: "clamp(28px,3.2vw,38px)", marginTop: "14px" }}>{t("home.why.donorHeading", "Why donate through Masjid My Community")}</h2>
            <ul className="reason-list">
              {donorReasons.map((r, i) => (
                <li className={`reason-item${openDonorReason === i ? " open" : ""}`} key={r.title}>
                  <button className="reason-q" onClick={() => setOpenDonorReason(openDonorReason === i ? null : i)}>
                    <span className="reason-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    </span>
                    <span>{t(`home.why.donorReason.${r.key}.title`, r.title)}</span>
                    <span className="reason-plus">+</span>
                  </button>
                  <div className="reason-a" style={{ maxHeight: openDonorReason === i ? "80px" : "0" }}>
                    <p>{t(`home.why.donorReason.${r.key}.detail`, r.detail)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <a href="#campaigns" className="btn btn-outline-ink" style={{ marginTop: "28px" }}>
              {t("home.why.startImpact", "Start Making an Impact")} <span className="btn-arrow">→</span>
            </a>
          </div>
          <div className="why-card why-card-masjid reveal" id="register">
            <div className="why-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 21V11l8-6 8 6v10" />
                <path d="M9 21v-6a3 3 0 016 0v6" />
                <path d="M12 5V2" />
              </svg>
            </div>
            <span className="eyebrow">{t("home.why.masjidEyebrow", "For masjids")}</span>
            <h2 style={{ fontSize: "clamp(28px,3.2vw,38px)", marginTop: "14px" }}>{t("home.why.masjidHeading", "Why register your masjid")}</h2>
            <ul className="reason-list">
              {masjidReasons.map((r, i) => (
                <li className={`reason-item${openMasjidReason === i ? " open" : ""}`} key={r.title}>
                  <button className="reason-q" onClick={() => setOpenMasjidReason(openMasjidReason === i ? null : i)}>
                    <span className="reason-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                    </span>
                    <span>{t(`home.why.masjidReason.${r.key}.title`, r.title)}</span>
                    <span className="reason-plus">+</span>
                  </button>
                  <div className="reason-a" style={{ maxHeight: openMasjidReason === i ? "80px" : "0" }}>
                    <p>{t(`home.why.masjidReason.${r.key}.detail`, r.detail)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <a href="#" className="btn btn-gold" style={{ marginTop: "28px" }}>
              {t("home.cta.registerYourMasjid", "Register Your Masjid")} <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* FEATURED MASJIDS */}
      <section className="py-sm" id="masjids" style={{ background: "var(--paper-dim)" }}>
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">{t("home.masjids.eyebrow", "Featured masjids")}</span>
            <h2>{t("home.masjids.heading", "Verified communities on Masjid My Community")}</h2>
          </div>
          <div className="masjid-grid">
            {masjidData.map((m, i) => {
              const isFollowed = followed.has(m.name);
              return (
                <div className="masjid-card" style={{ animationDelay: `${i * 0.08}s` }} key={m.name}>
                  <div className="masjid-img">
                    <CardImg src={m.img} seed={i + 2} alt={t("home.masjids.altText", "Masjid")} />
                    <span className="masjid-verified">✓ {t("home.masjids.verified", "Verified")}</span>
                    <button
                      className={`masjid-follow${isFollowed ? " active" : ""}`}
                      aria-label={isFollowed ? t("home.masjids.unfollow", "Unfollow this masjid") : t("home.masjids.follow", "Follow this masjid")}
                      aria-pressed={isFollowed}
                      onClick={() => toggleFollowed(m.name)}
                    >
                      <svg viewBox="0 0 24 24">
                        <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.8 4 5.2c2-1.2 4.4-.6 5.7 1 .7.8 1.4 1.8 2.3 1.8s1.6-1 2.3-1.8c1.3-1.6 3.7-2.2 5.7-1 2.6 1.6 3.2 4.9 1.3 7.7C18.7 16.65 12 21 12 21z" />
                      </svg>
                    </button>
                    <div className="masjid-overlay">
                      <div className="masjid-name">{m.name}</div>
                      <div className="masjid-loc">
                        {m.flag} {m.loc} · {t("home.masjids.estYear", "est. {year}").replace("{year}", m.year)}
                      </div>
                    </div>
                  </div>
                  <div className="masjid-body">
                    <div className="masjid-stats">
                      <span>
                        {t(m.camps > 1 ? "home.masjids.campaignPlural" : "home.masjids.campaignSingular", `{count} campaign${m.camps > 1 ? "s" : ""}`).replace(
                          "{count}",
                          m.camps
                        )}
                      </span>
                      <span>{t("home.masjids.served", "{count} served").replace("{count}", m.served)}</span>
                    </div>
                    <a href="#" className="masjid-view">
                      {t("home.masjids.viewProfile", "View Profile")} <span className="btn-arrow">→</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: "36px" }}>
            <a href="#" className="btn btn-outline-ink">
              {t("home.masjids.exploreAll", "Explore All Masjids")} <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* SUCCESS STORIES */}
      <section className="py" id="stories">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">{t("home.stories.eyebrow", "Success stories")}</span>
            <h2>{t("home.stories.heading", "Projects that reached completion")}</h2>
          </div>
          <div className="story-grid">
            {stories.map((s, i) => (
              <div className="story-card reveal" key={s.title}>
                <CompareSlider seed={i} afterSrc={s.img} alt={t(`home.stories.${s.key}.title`, s.title)} />
                <div className="story-body">
                  <span className="story-cat">{t(`home.stories.${s.key}.cat`, s.cat)}</span>
                  <h3 className="story-title">{t(`home.stories.${s.key}.title`, s.title)}</h3>
                  <p className="story-text">{t(`home.stories.${s.key}.text`, s.text)}</p>
                  <div className="story-figs">
                    {s.figs.map((f) => (
                      <div key={f.label}>
                        <FigNum n={f.n} prefix={f.prefix} />
                        <span>{t(`home.stories.fig.${f.key}`, f.label)}</span>
                      </div>
                    ))}
                  </div>
                  <a href="#" className="story-link">
                    {t("home.stories.readFull", "Read the full story")} <span className="btn-arrow">→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py cat-strip" id="testimonials">
        <div className="wrap">
          <div className="section-head on-ink center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">{t("home.testimonials.eyebrow", "In their words")}</span>
            <h2>{t("home.testimonials.heading", "From administrators, donors and volunteers")}</h2>
          </div>
          <div
            className="testi-wrap reveal"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current == null) return;
              const delta = e.changedTouches[0].clientX - touchStartX.current;
              if (delta > 40) prevTesti();
              else if (delta < -40) nextTesti();
              touchStartX.current = null;
            }}
          >
            <button className="testi-arrow testi-arrow-prev" onClick={prevTesti} aria-label={t("home.testimonials.prev", "Previous testimonial")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button className="testi-arrow testi-arrow-next" onClick={nextTesti} aria-label={t("home.testimonials.next", "Next testimonial")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            {testimonials.map((item, i) => (
              <div className={`testi-slide${i === testiIdx ? " active" : ""}`} key={item.who}>
                <p className="testi-quote" style={{ color: "var(--text-on-ink)" }}>{t(`home.testimonials.${item.key}.quote`, item.quote)}</p>
                <div className="testi-person">
                  <span className="testi-avatar">{item.initials}</span>
                  <div className="testi-who" style={{ color: "var(--text-on-ink-dim)" }}>{t(`home.testimonials.${item.key}.who`, item.who)}</div>
                </div>
              </div>
            ))}
            <div className="testi-dots">
              {testimonials.map((item, i) => (
                <button
                  key={item.who}
                  className={i === testiIdx ? "active" : ""}
                  onClick={() => setTestiIdx(i)}
                  aria-label={t("home.testimonials.showNth", "Show testimonial {n}").replace("{n}", i + 1)}
                >
                  <span className="testi-fill" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section className="py" id="programs">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">{t("home.programs.eyebrow", "Empowerment programs")}</span>
            <h2>{t("home.programs.heading", "What's next for the Masjid My Community ecosystem")}</h2>
          </div>
          <div className="programs-grid reveal">
            {programs.map((p) => {
              const isInterested = interested.has(p.title);
              const count = p.interest + (isInterested ? 1 : 0);
              return (
                <div className="program-card" onMouseMove={handleProgramTilt} onMouseLeave={resetProgramTilt} key={p.title}>
                  <div className="program-top">
                    <div className="program-tag">{p.tag}</div>
                    <span className={`program-status${p.live ? " live" : ""}`}>{t(`home.programs.${p.statusKey}`, p.status)}</span>
                  </div>
                  <div className="program-title">{t(`home.programs.${p.key}.title`, p.title)}</div>
                  <p className="program-desc">{t(`home.programs.${p.key}.desc`, p.desc)}</p>
                  <button className={`program-interest${isInterested ? " active" : ""}`} onClick={() => toggleInterested(p.title)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2.5l2.9 6.9 7.1.6-5.4 4.9 1.6 7.1L12 17.8 5.8 21.5l1.6-7.1L2 9.5l7.1-.6z" />
                    </svg>
                    {t("home.programs.interestedCount", "{count} interested").replace("{count}", count.toLocaleString("en-US"))}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RESOURCES */}
      <section className="py-sm" id="resources" style={{ background: "var(--paper-dim)" }}>
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">{t("home.resources.eyebrow", "Resources & learning")}</span>
            <h2>{t("home.resources.heading", "Guidance for masjids and donors")}</h2>
          </div>
          <div className="campaign-filters reveal" style={{ marginTop: "8px" }}>
            <button
              className={`filter-chip${resourceFilter === "All" ? " active" : ""}`}
              onClick={() => setResourceFilter("All")}
            >
              {t("home.filters.all", "All")}
            </button>
            {resourceTypes.map((rt) => (
              <button
                key={rt}
                className={`filter-chip${resourceFilter === rt ? " active" : ""}`}
                onClick={() => setResourceFilter(rt)}
              >
                {t(RESOURCE_TYPE_KEYS[rt], rt)}
              </button>
            ))}
          </div>
          <div className="resource-grid" key={resourceFilter}>
            {resources
              .filter((r) => resourceFilter === "All" || r.type === resourceFilter)
              .map((r, i) => {
                const style = RESOURCE_STYLES[r.type];
                return (
                  <div className="resource-card" style={{ animationDelay: `${i * 0.06}s` }} key={r.title}>
                    <div className="resource-icon" style={{ background: style.bg, color: style.color }}>
                      <ResourceIcon type={r.type} />
                    </div>
                    <span className="resource-type" style={{ color: style.color }}>{t(RESOURCE_TYPE_KEYS[r.type], r.type)}</span>
                    <h3 className="resource-title">{t(`home.resources.${r.key}.title`, r.title)}</h3>
                    <span className="resource-meta">{t(`home.resources.${r.key}.meta`, r.meta)}</span>
                    <a href="#" className="resource-link">
                      {t(`home.resources.${r.ctaKey}`, r.cta)} <span className="btn-arrow">→</span>
                    </a>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* FAQ TEASER */}
      {featuredFaqs.length > 0 && (
        <section className="py" id="faq">
          <div className="wrap">
            <div className="section-head center reveal" style={{ margin: "0 auto" }}>
              <span className="eyebrow">{t("home.faq.eyebrow", "Frequently asked")}</span>
              <h2>{t("home.faq.heading", "Popular questions")}</h2>
              <p>{t("home.faq.subtext", "A few common questions — or ask our AI assistant anything about Masjid My Community.")}</p>
            </div>
            <div className="faq-popular-grid reveal">
              {featuredFaqs.map((f) => (
                <Link to={`/faq#faq-${f.id}`} className="faq-popular-card" key={f.id}>
                  <span>{f.question}</span>
                  <span className="btn-arrow">→</span>
                </Link>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <Link to="/faq" className="btn btn-gold">
                {t("home.faq.askAi", "Ask our AI Assistant")} <span className="btn-arrow">→</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="final-cta">
        <Particles count={14} />
        <div className="wrap">
          <span className="eyebrow">{t("home.finalCta.eyebrow", "Join the movement")}</span>
          <h2>{t("home.finalCta.heading", "A stronger masjid can build a stronger community.")}</h2>
          <p>{t("home.finalCta.subtext", "Whether you represent a masjid or want to support one, your contribution can help create meaningful, lasting impact.")}</p>
          <div className="cta-count-line">
            <span ref={ctaCountRef} className="mono">{ctaCountText}</span> {t("home.finalCta.countLine", "supporters already making a difference")}
          </div>
          <div className="cta-audience">
            <button
              className={`cta-audience-btn${ctaAudience === "masjid" ? " active" : ""}`}
              onClick={() => setCtaAudience(ctaAudience === "masjid" ? null : "masjid")}
            >
              {t("home.finalCta.imMasjid", "I'm a Masjid")}
            </button>
            <button
              className={`cta-audience-btn${ctaAudience === "donor" ? " active" : ""}`}
              onClick={() => setCtaAudience(ctaAudience === "donor" ? null : "donor")}
            >
              {t("home.finalCta.imDonor", "I'm a Donor")}
            </button>
          </div>
          <div className="ctas">
            <a
              href="#"
              className={`btn btn-gold cta-pulse${ctaAudience === "masjid" ? " cta-emphasized" : ""}${ctaAudience === "donor" ? " cta-dimmed" : ""}`}
            >
              {t("home.cta.registerYourMasjid", "Register Your Masjid")} <span className="btn-arrow">→</span>
            </a>
            <a
              href="/explore-campaigns"
              className={`btn btn-outline-paper${ctaAudience === "donor" ? " cta-emphasized" : ""}${ctaAudience === "masjid" ? " cta-dimmed" : ""}`}
              onClick={(e) => { e.preventDefault(); goToCampaigns("/explore-campaigns"); }}
            >
              {t("home.cta.exploreCampaigns", "Explore Campaigns")} <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </section>

      {/* MOBILE DONATE BAR */}
      <div className="mobile-donate">
        <div className="txt">
          <strong>{t("home.mobileDonate.title", "Fund a masjid today")}</strong>
          {t("home.mobileDonate.subtext", "45+ countries · fully transparent")}
        </div>
        <a href="#campaigns" className="btn btn-gold" style={{ padding: "11px 18px", fontSize: "13px" }}>
          {t("home.mobileDonate.cta", "Donate")}
        </a>
      </div>
    </main>
  );
}

export default Home;
