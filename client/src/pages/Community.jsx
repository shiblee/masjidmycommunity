import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const LIVE_TYPE_MAP = {
  masjid_approved: "masjid_update",
  campaign_approved: "campaign_launch",
  donation: "donation",
  milestone: "milestone",
};

function mapLiveActivity(a) {
  const isMasjid = a.type === "masjid_approved";
  const isCampaignEvent = a.type === "campaign_approved" || a.type === "donation" || a.type === "milestone";
  const campaignCta = a.metadata?.campaignSlug ? { label: "View Campaign", href: `/campaign/${a.metadata.campaignSlug}` } : undefined;

  return {
    id: `live-${a.id}`,
    type: LIVE_TYPE_MAP[a.type] || "community_story",
    actor: {
      name: isMasjid ? a.metadata?.masjidName || a.title : isCampaignEvent ? a.metadata?.masjidName || a.metadata?.campaignTitle || a.title : "Masjid My Community",
      verified: isMasjid,
      location: a.metadata?.location || "",
    },
    time: timeAgo(a.publishedAt || a.createdAt),
    text: a.body || a.title,
    images: a.imageUrl ? [`http://localhost:5050${a.imageUrl}`] : undefined,
    cta: isMasjid && a.relatedMasjidId ? { label: "View Masjid", href: `/masjid/${a.relatedMasjidId}` } : campaignCta,
  };
}

const FILTERS = [
  { key: "all", label: "All Updates" },
  { key: "masjid_update", label: "Masjids" },
  { key: "donation", label: "Donations" },
  { key: "fundraising", label: "Fundraising" },
  { key: "project_update", label: "Project Updates" },
  { key: "community_story", label: "Community Stories" },
];

const TYPE_META = {
  masjid_update: { tag: "New Masjid" },
  campaign_launch: { tag: "New Campaign" },
  donation: { tag: "Donation" },
  milestone: { tag: "Milestone" },
  project_update: { tag: "Project Update" },
  community_story: { tag: "Community" },
};

function matchesFilter(post, key) {
  if (key === "all") return true;
  if (key === "fundraising") return post.type === "campaign_launch" || post.type === "milestone";
  return post.type === key;
}

const posts = [
  {
    id: "p1",
    type: "masjid_update",
    actor: { name: "Green Valley Masjid", verified: false, location: "Toronto, Canada", avatar: "https://images.unsplash.com/photo-1549526725-5c188c251c37?auto=format&fit=crop&w=200&q=75" },
    time: "8m ago",
    text: "Green Valley Masjid has just joined Masjid My Community! The committee is preparing to submit verification documents and share their first community project.",
    images: ["https://images.unsplash.com/photo-1549526725-5c188c251c37?auto=format&fit=crop&w=900&q=75"],
    cta: { label: "View Masjid", href: "/#masjids" },
  },
  {
    id: "p2",
    type: "campaign_launch",
    actor: { name: "Masjid Al-Falah", verified: true, location: "London, United Kingdom", avatar: "https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=200&q=75" },
    time: "42m ago",
    text: "We've just launched a new campaign — Winter Relief Drive — to provide warm meals, blankets and emergency support to families through the coldest months.",
    images: ["https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=900&q=75"],
    progress: { raised: 186400, goal: 200000 },
    cta: { label: "Support Now", href: "/#campaigns" },
    cta2: { label: "View Campaign", href: "/#campaigns" },
  },
  {
    id: "p3",
    type: "donation",
    actor: { name: "Anonymous", verified: false, location: "Baitul Aman Masjid · Dhaka, Bangladesh" },
    time: "1h ago",
    text: "A community member has supported the Ramadan Food Bank campaign at Baitul Aman Masjid with ₹25,000, helping feed 40 more families this month.",
    donation: { amount: 25000, campaign: "Ramadan Food Bank" },
    cta: { label: "Support the Campaign", href: "/#campaigns" },
  },
  {
    id: "p4",
    type: "project_update",
    actor: { name: "Masjid Al-Taqwa", verified: true, location: "Sydney, Australia", avatar: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=200&q=75" },
    time: "3h ago",
    text: "Solar panels have now been procured for our Solar Power Retrofit project — the first step toward cutting our electricity costs and going fully sustainable.",
    images: ["https://images.unsplash.com/photo-1713691132931-1cc66e362cdc?auto=format&fit=crop&w=900&q=75"],
    projectStatus: { label: "Panels procured", pct: 25 },
    cta: { label: "View Campaign", href: "/#campaigns" },
  },
  {
    id: "p5",
    type: "milestone",
    actor: { name: "Masjid Ar-Rahman", verified: true, location: "Cape Town, South Africa", avatar: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=200&q=75" },
    time: "6h ago",
    text: "🎉 Big news — the Youth Education Fund has just reached 50% of its goal! Thank you to everyone who has contributed so far. Let's carry the momentum forward.",
    progress: { raised: 74200, goal: 150000 },
    cta: { label: "Support the Campaign", href: "/#campaigns" },
  },
  {
    id: "p6",
    type: "community_story",
    featured: true,
    actor: { name: "Masjid Al-Ihsan", verified: true, location: "Dakar, Senegal", avatar: "https://images.unsplash.com/photo-1705923620684-683a7473b504?auto=format&fit=crop&w=200&q=75" },
    time: "1d ago",
    text: "Featured story: a well that changed daily life in rural Senegal. Masjid Al-Ihsan needed a working well before it could hold consistent prayers — in ten weeks, 640 donors across 22 countries funded the full project.",
    images: ["https://images.unsplash.com/photo-1705923620684-683a7473b504?auto=format&fit=crop&w=900&q=75"],
    stats: [
      { n: "₹8,400", label: "raised" },
      { n: "640", label: "supporters" },
      { n: "1,200", label: "people served" },
    ],
    cta: { label: "Read the Full Story", href: "/#stories" },
  },
  {
    id: "p7",
    type: "masjid_update",
    actor: { name: "Noor Islamic Center", verified: false, location: "Houston, USA", avatar: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=200&q=75" },
    time: "1d ago",
    text: "Meet Noor Islamic Center — newly featured on Masjid My Community. Their committee is raising funds for a new wudu facility to serve a growing congregation.",
    images: ["https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=900&q=75"],
    cta: { label: "View Masjid", href: "/#masjids" },
  },
  {
    id: "p8",
    type: "donation",
    actor: { name: "Ahmed R.", verified: false, location: "Masjid Umar Ibn Al-Khattab · Kuala Lumpur, Malaysia" },
    time: "2d ago",
    text: "Ahmed has donated ₹5,000 to support the Library & Learning Center at Masjid Umar Ibn Al-Khattab. Every book on that shelf gets a little closer.",
    donation: { amount: 5000, campaign: "Library & Learning Center" },
    cta: { label: "Support the Campaign", href: "/#campaigns" },
  },
  {
    id: "p9",
    type: "milestone",
    featured: true,
    actor: { name: "Masjid Al-Huda", verified: true, location: "Karachi, Pakistan", avatar: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=200&q=75" },
    time: "2d ago",
    text: "🎉 Fully funded! The Orphan Sponsorship Program has reached 100% of its goal, delivering ongoing support to 210 families. Jazakumullah khairan to every donor who made this possible.",
    progress: { raised: 145700, goal: 145700 },
    milestoneBadge: "Fully Funded",
    cta: { label: "View Campaign", href: "/#campaigns" },
  },
  {
    id: "p10",
    type: "community_story",
    featured: true,
    actor: { name: "Masjid My Community", verified: true, location: "Platform Announcement" },
    time: "3d ago",
    text: "📣 Our special Ramadan 2027 Giving Campaign is coming soon — a platform-wide push to support food banks, education funds and masjid renovations during the holy month. Stay tuned.",
    cta: { label: "Learn More", href: "/#programs" },
  },
  {
    id: "p11",
    type: "project_update",
    actor: { name: "Masjid Al-Falah", verified: true, location: "London, United Kingdom", avatar: "https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=200&q=75" },
    time: "4d ago",
    text: "Construction update on the Masjid Al-Falah Extension: foundation and structure are now complete. Next up — roofing and interior fit-out.",
    images: ["https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=900&q=75"],
    projectStatus: { label: "Foundation & structure complete", pct: 63 },
    cta: { label: "View Campaign", href: "/#campaigns" },
  },
  {
    id: "p12",
    type: "campaign_launch",
    featured: true,
    urgent: true,
    actor: { name: "Islamic Center of Chicago", verified: false, location: "Chicago, USA", avatar: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=200&q=75" },
    time: "5d ago",
    text: "Urgent: our only working wudu facility has failed inspection. We've launched an emergency campaign to fund a new one before it affects daily prayers.",
    images: ["https://images.unsplash.com/photo-1599230080795-a48439229cb7?auto=format&fit=crop&w=900&q=75"],
    progress: { raised: 34600, goal: 40000 },
    cta: { label: "Support Now", href: "/#campaigns" },
  },
  {
    id: "p13",
    type: "project_update",
    actor: { name: "Masjid Ar-Rahman", verified: true, location: "Cape Town, South Africa", avatar: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=200&q=75" },
    time: "6d ago",
    text: "Handed over! The Wudu Facility Upgrade at Masjid Ar-Rahman is complete and already serving the congregation for all five daily prayers.",
    images: ["https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=900&q=75"],
    projectStatus: { label: "Handed over", pct: 100 },
    cta: { label: "View Masjid", href: "/#masjids" },
  },
  {
    id: "p14",
    type: "donation",
    actor: { name: "Fatima N.", verified: false, location: "Baitul Aman Masjid · Dhaka, Bangladesh" },
    time: "6d ago",
    text: "Fatima has donated ₹12,500 to the Ramadan Food Bank at Baitul Aman Masjid — enough for food parcels for 20 families this week.",
    donation: { amount: 12500, campaign: "Ramadan Food Bank" },
    cta: { label: "Support the Campaign", href: "/#campaigns" },
  },
  {
    id: "p15",
    type: "masjid_update",
    actor: { name: "Masjid Al-Salam", verified: true, location: "Houston, USA", avatar: "https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=200&q=75" },
    time: "1w ago",
    text: "Masjid Al-Salam has completed verification and is now a fully verified community on Masjid My Community, serving worshippers since 1988.",
    images: ["https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=900&q=75"],
    cta: { label: "View Masjid", href: "/#masjids" },
  },
  {
    id: "p16",
    type: "milestone",
    featured: true,
    urgent: true,
    actor: { name: "Masjid Al-Falah", verified: true, location: "London, United Kingdom", avatar: "https://images.unsplash.com/photo-1690827453261-7209da189b4c?auto=format&fit=crop&w=200&q=75" },
    time: "1w ago",
    text: "So close! The Winter Relief Drive has reached 93% of its goal with 8 days left. A final push could get warm meals and blankets to every family on the list.",
    progress: { raised: 186400, goal: 200000 },
    cta: { label: "Support Now", href: "/#campaigns" },
  },
  {
    id: "p17",
    type: "community_story",
    actor: { name: "Masjid My Community", verified: true, location: "Platform Update" },
    time: "1w ago",
    text: "The Digital Masjid Program is now live — free websites and communication tools for newly-verified masjids. 128 committees have already expressed interest.",
    cta: { label: "Learn More", href: "/#programs" },
  },
  {
    id: "p18",
    type: "campaign_launch",
    actor: { name: "Masjid Al-Noor", verified: true, location: "Casablanca, Morocco", avatar: "https://images.unsplash.com/photo-1713691132931-1cc66e362cdc?auto=format&fit=crop&w=200&q=75" },
    time: "1w ago",
    text: "New campaign: Solar Energy for Our Masjid. We're switching to solar power to cut electricity costs and put more of every donation toward the community.",
    images: ["https://images.unsplash.com/photo-1713691132931-1cc66e362cdc?auto=format&fit=crop&w=900&q=75"],
    progress: { raised: 6800, goal: 12000 },
    cta: { label: "Support Now", href: "/#campaigns" },
    cta2: { label: "View Campaign", href: "/#campaigns" },
  },
  {
    id: "p19",
    type: "donation",
    actor: { name: "Anonymous", verified: false, location: "Masjid Al-Falah · London, United Kingdom" },
    time: "1w ago",
    text: "A community member has supported the Emergency Relief Fund at Masjid Al-Falah with ₹15,000, helping deliver aid to families affected by recent flooding.",
    donation: { amount: 15000, campaign: "Emergency Relief Fund" },
    cta: { label: "Support the Campaign", href: "/#campaigns" },
  },
  {
    id: "p20",
    type: "project_update",
    actor: { name: "Baitul Aman Masjid", verified: false, location: "Dhaka, Bangladesh", avatar: "https://images.unsplash.com/photo-1705923620684-683a7473b504?auto=format&fit=crop&w=200&q=75" },
    time: "1w ago",
    text: "Kitchen fit-out is underway for the new Community Kitchen Build — once complete, it will support daily meal programs year-round, not just during Ramadan.",
    images: ["https://images.unsplash.com/photo-1705923620684-683a7473b504?auto=format&fit=crop&w=900&q=75"],
    projectStatus: { label: "Kitchen fit-out in progress", pct: 68 },
    cta: { label: "View Campaign", href: "/#campaigns" },
  },
  {
    id: "p21",
    type: "community_story",
    featured: true,
    actor: { name: "Masjid My Community", verified: true, location: "Platform Achievement" },
    time: "2w ago",
    text: "🎉 We just crossed 12,000 total donors on the platform! Every single one of them has helped a masjid somewhere in the world move closer to its goal. Thank you for being part of this.",
    cta: { label: "Explore Campaigns", href: "/#campaigns" },
  },
  {
    id: "p22",
    type: "masjid_update",
    actor: { name: "Islamic Center of Chicago", verified: false, location: "Chicago, USA", avatar: "https://images.unsplash.com/photo-1554720372-43797b5b4a70?auto=format&fit=crop&w=200&q=75" },
    time: "2w ago",
    text: "Islamic Center of Chicago has joined Masjid My Community and submitted its first verification documents — registration certificate and imam ID.",
    images: ["https://images.unsplash.com/photo-1599230080795-a48439229cb7?auto=format&fit=crop&w=900&q=75"],
    cta: { label: "View Masjid", href: "/#masjids" },
  },
];

const communityStats = [
  { n: "1,284", label: "Masjids on the platform" },
  { n: "₹4.82M+", label: "Funds raised" },
  { n: "28,540+", label: "Donations made" },
  { n: "46", label: "Countries reached" },
];

const trendingCampaigns = [
  { name: "Winter Relief Drive", masjid: "Masjid Al-Falah, London", raised: 186400, goal: 200000 },
  { name: "Ramadan Food Bank", masjid: "Baitul Aman Masjid, Dhaka", raised: 298500, goal: 300000 },
  { name: "New Wudu Facility", masjid: "Islamic Center of Chicago", raised: 34600, goal: 40000 },
  { name: "Solar Energy for Our Masjid", masjid: "Masjid Al-Noor, Casablanca", raised: 6800, goal: 12000 },
];

const featuredMasjids = [
  { name: "Masjid Al-Falah", loc: "London, UK", verified: true },
  { name: "Masjid Al-Taqwa", loc: "Sydney, Australia", verified: true },
  { name: "Masjid Umar Ibn Al-Khattab", loc: "Kuala Lumpur, Malaysia", verified: true },
  { name: "Masjid Al-Salam", loc: "Houston, USA", verified: true },
];

function currency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function initialsOf(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function Avatar({ actor }) {
  const [failed, setFailed] = useState(false);
  if (actor.avatar && !failed) {
    return <img className="cw-avatar" src={actor.avatar} alt={actor.name} onError={() => setFailed(true)} />;
  }
  return (
    <span className="cw-avatar cw-avatar-fallback" aria-hidden="true">
      {initialsOf(actor.name)}
    </span>
  );
}

function VerifiedBadge() {
  return (
    <svg className="cw-verified" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Verified masjid">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" />
    </svg>
  );
}

function ShareButton({ post }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}/community#${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API unavailable; button still gives feedback below
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button className={`cw-share${copied ? " copied" : ""}`} onClick={share} aria-label="Share this update">
      <ShareIcon />
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

function PostProgress({ progress }) {
  const pct = Math.min(100, Math.round((progress.raised / progress.goal) * 100));
  return (
    <div className="cw-progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="cw-progress-meta">
        <span className="raised">{currency(progress.raised)} raised</span>
        <span className="goal">{pct}% of {currency(progress.goal)}</span>
      </div>
    </div>
  );
}

function CommunityPost({ post }) {
  const meta = TYPE_META[post.type];
  return (
    <article id={post.id} className={`cw-post${post.featured ? " cw-post-featured" : ""}`}>
      {post.featured && <span className="cw-featured-ribbon">★ Featured</span>}
      <div className="cw-post-head">
        <Avatar actor={post.actor} />
        <div className="cw-post-headtext">
          <div className="cw-post-name">
            {post.actor.name}
            {post.actor.verified && <VerifiedBadge />}
          </div>
          <div className="cw-post-meta">
            {post.actor.location} · {post.time}
          </div>
        </div>
        <span className={`cw-tag${post.urgent ? " cw-tag-urgent" : ""}`}>{post.milestoneBadge || meta.tag}</span>
      </div>

      <p className="cw-post-text">{post.text}</p>

      {post.images && post.images.length > 0 && (
        <div className={`cw-post-media${post.images.length > 1 ? " cw-post-media-grid" : ""}`}>
          {post.images.map((src, i) => (
            <img key={i} src={src} alt="" loading="lazy" />
          ))}
        </div>
      )}

      {post.donation && (
        <div className="cw-donation-chip">
          <span className="cw-donation-amount">{currency(post.donation.amount)}</span>
          <span className="cw-donation-campaign">towards {post.donation.campaign}</span>
        </div>
      )}

      {post.projectStatus && (
        <div className="cw-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${post.projectStatus.pct}%` }} />
          </div>
          <div className="cw-progress-meta">
            <span className="raised">{post.projectStatus.label}</span>
            <span className="goal">{post.projectStatus.pct}% complete</span>
          </div>
        </div>
      )}

      {post.progress && <PostProgress progress={post.progress} />}

      {post.stats && (
        <div className="cw-post-stats">
          {post.stats.map((s) => (
            <div key={s.label}>
              <strong>{s.n}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="cw-post-actions">
        <div className="cw-post-ctas">
          {post.cta && (
            <a href={post.cta.href} className="btn btn-gold cw-cta">
              {post.cta.label} <span className="btn-arrow">→</span>
            </a>
          )}
          {post.cta2 && (
            <a href={post.cta2.href} className="btn btn-outline-ink cw-cta">
              {post.cta2.label}
            </a>
          )}
        </div>
        <ShareButton post={post} />
      </div>
    </article>
  );
}

function Community() {
  const [filter, setFilter] = useState("all");
  const [liveActivities, setLiveActivities] = useState([]);

  useEffect(() => {
    axios
      .get("http://localhost:5050/api/community/activities")
      .then(({ data }) => setLiveActivities(data.activities.map(mapLiveActivity)))
      .catch(() => {});
  }, []);

  const allPosts = useMemo(() => [...liveActivities, ...posts], [liveActivities]);
  const filteredPosts = useMemo(() => allPosts.filter((p) => matchesFilter(p, filter)), [allPosts, filter]);

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
  }, [filteredPosts]);

  return (
    <main className="cw-page">
      <section className="cw-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">My Community</span>
          <h1>The Community Wall</h1>
          <p>
            Everything happening across the Masjid My Community ecosystem, in one place — masjids joining, campaigns
            launching, donations landing, and milestones being reached.
          </p>
          <div className="cw-hero-stats">
            {communityStats.map((s) => (
              <div key={s.label}>
                <strong>{s.n}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          <div className="cw-layout">
            <div className="cw-main">
              <div className="cw-filters campaign-filters">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`filter-chip${filter === f.key ? " active" : ""}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="cw-feed">
                {filteredPosts.map((post, i) => (
                  <div className="reveal" style={{ transitionDelay: `${Math.min(i, 6) * 0.05}s` }} key={post.id}>
                    <CommunityPost post={post} />
                  </div>
                ))}
              </div>

              <div className="cw-feed-end">
                <span>You're all caught up — check back soon for new activity.</span>
              </div>
            </div>

            <aside className="cw-side">
              <div className="cw-side-card">
                <h4>Community Pulse</h4>
                <div className="cw-side-stats">
                  {communityStats.map((s) => (
                    <div key={s.label}>
                      <strong>{s.n}</strong>
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cw-side-card">
                <h4>Trending Campaigns</h4>
                <ul className="cw-side-list">
                  {trendingCampaigns.map((c) => {
                    const pct = Math.min(100, Math.round((c.raised / c.goal) * 100));
                    return (
                      <li key={c.name}>
                        <div className="cw-side-list-head">
                          <span className="cw-side-list-title">{c.name}</span>
                          <span className="cw-side-list-pct">{pct}%</span>
                        </div>
                        <span className="cw-side-list-sub">{c.masjid}</span>
                        <div className="progress-track cw-side-progress">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <a href="/#campaigns" className="cw-side-link">
                  View All Campaigns <span className="btn-arrow">→</span>
                </a>
              </div>

              <div className="cw-side-card">
                <h4>Featured Masjids</h4>
                <ul className="cw-side-list cw-side-masjids">
                  {featuredMasjids.map((m) => (
                    <li key={m.name}>
                      <span className="cw-side-masjid-name">
                        {m.name}
                        {m.verified && <VerifiedBadge />}
                      </span>
                      <span className="cw-side-list-sub">{m.loc}</span>
                    </li>
                  ))}
                </ul>
                <a href="/#masjids" className="cw-side-link">
                  Explore All Masjids <span className="btn-arrow">→</span>
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Community;
