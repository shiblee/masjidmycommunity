import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API_ORIGIN } from "../config.js";
import { getStoredUser } from "../utils/userAuthStorage.js";
import communityApi from "../services/communityApi.js";
import masjidApi from "../services/masjidApi.js";
import campaignApi from "../services/campaignApi.js";
import reportApi from "../services/reportApi.js";
import MediaThumb from "../components/MediaThumb.jsx";
import { Icon } from "../components/Icons.jsx";
import RequireUserAuth from "../components/RequireUserAuth.jsx";
import MasjidWizard from "./masjid/MasjidWizard.jsx";
import MasjidDeleteFlow from "../components/masjid/MasjidDeleteFlow.jsx";
import ReportModal from "../components/ReportModal.jsx";
import CommentSection from "../components/CommentSection.jsx";
import ImageViewer from "../components/ImageViewer.jsx";
import PostBodyText from "../components/PostBodyText.jsx";
import PostComposer from "../components/PostComposer.jsx";
import MentionTextarea from "../components/MentionTextarea.jsx";
import CampaignWizard from "./campaign/CampaignWizard.jsx";

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
  new_user: "new_member",
};

function mapLiveActivity(a) {
  const isMasjid = a.type === "masjid_approved";
  const isCampaignEvent = a.type === "campaign_approved" || a.type === "donation" || a.type === "milestone";
  const isNewMember = a.type === "new_user";
  const isCommunityPost = a.type === "community_post";
  const campaignCta = a.metadata?.campaignSlug ? { label: "View Campaign", href: `/campaign/${a.metadata.campaignSlug}` } : undefined;

  return {
    id: `live-${a.id}`,
    activityId: a.id,
    relatedMasjidId: a.relatedMasjidId || null,
    relatedCampaignId: a.relatedCampaignId || null,
    relatedUserId: a.relatedUserId || null,
    author: a.author || null,
    likeCount: a.likeCount || 0,
    dislikeCount: a.dislikeCount || 0,
    userVote: a.userVote || null,
    commentCount: a.commentCount || 0,
    type: isCommunityPost ? "community_post" : LIVE_TYPE_MAP[a.type] || "community_story",
    actor: {
      name: isMasjid
        ? a.metadata?.masjidName || a.title
        : isCampaignEvent
        ? a.metadata?.masjidName || a.metadata?.campaignTitle || a.title
        : isNewMember
        ? a.user?.fullName || a.metadata?.fullName || "A new member"
        : isCommunityPost
        ? a.author?.fullName || "Community Member"
        : "Masjid My Community",
      verified: isMasjid,
      // New-member posts have no location — the masked contact (never the
      // raw address) fills the same header slot instead, so the design and
      // markup stay identical to every other post type.
      location: isNewMember ? a.user?.maskedEmail || a.user?.maskedMobile || "" : a.metadata?.location || "",
    },
    time: timeAgo(a.publishedAt || a.createdAt),
    text: a.body || a.title,
    // Community-post images are their own interactive unit (own id, own
    // likes/dislikes/comments) — system posts just carry a single flat
    // banner image with no id, so the viewer/like controls never show for those.
    images: isCommunityPost
      ? (a.images || []).map((img) => ({
          id: img.id,
          url: `${API_ORIGIN}${img.url}`,
          likeCount: img.likeCount || 0,
          dislikeCount: img.dislikeCount || 0,
          userVote: img.userVote || null,
          commentCount: img.commentCount || 0,
        }))
      : a.imageUrl
      ? [{ id: null, url: `${API_ORIGIN}${a.imageUrl}` }]
      : undefined,
    videoUrl: a.mediaVideoUrl ? `${API_ORIGIN}${a.mediaVideoUrl}` : undefined,
    cta: isMasjid && a.relatedMasjidId ? { label: "View Masjid", href: `/masjid/${a.relatedMasjidId}` } : campaignCta,
  };
}

const MASJID_STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", approved: "Approved", rejected: "Rejected", inactive: "Inactive",
};

const CAMPAIGN_STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review", changes_requested: "Changes Requested",
  approved: "Approved", active: "Active", paused: "Paused", goal_reached: "Goal Reached",
  completed: "Completed", rejected: "Rejected", cancelled: "Cancelled",
};

// Registry of top-level community categories shown in the right-hand menu.
// Adding a future real category is one more entry here (plus its own action
// panel below, mirroring "masjid"/"campaign") — nothing else needs to change.
const COMMUNITY_SECTIONS = [
  { key: "masjid", label: "Masjid", icon: "mosque", wallFilter: "masjid_update" },
  { key: "campaign", label: "Campaign", icon: "flag", wallFilter: "fundraising" },
  { key: "jobs", label: "Jobs", icon: "building", wallFilter: null },
  { key: "ads", label: "Ads", icon: "monitor", wallFilter: null },
  { key: "advertisement", label: "Advertisement", icon: "bulb", wallFilter: null },
  { key: "sponsors", label: "Sponsors", icon: "star", wallFilter: null },
];

const SIDE_LIST_PREVIEW_COUNT = 3;

const FILTERS = [
  { key: "all", label: "All Updates" },
  { key: "community_post", label: "Community Posts" },
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
  new_member: { tag: "New Member" },
  community_post: { tag: "Community Post" },
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

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.42a9.87 9.87 0 0 0 4.62 1.18h.01c5.46 0 9.9-4.45 9.9-9.9C21.95 6.45 17.5 2 12.04 2Zm0 18.06a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.18 8.18 0 0 1-1.26-4.31c0-4.52 3.68-8.2 8.2-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.52-3.68 8.15-8.21 8.15Zm4.48-6.15c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2H21l-6.53 7.46L22 22h-6.828l-4.78-6.24L4.9 22H2.14l7.02-8.02L2 2h6.914l4.34 5.7L18.244 2Zm-1.197 18h1.833L7.03 3.94H5.06L17.047 20Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.6c0-.9.3-1.6 1.7-1.6h1.6V4.1C16.5 4.1 15.4 4 14.2 4c-2.5 0-4.2 1.5-4.2 4.3v2.5H7.3v3.2H10v8h3.5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 20h-3.37v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V20H9.67V8.5h3.24v1.57h.05c.45-.86 1.56-1.77 3.2-1.77 3.43 0 4.06 2.26 4.06 5.2V20Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  );
}

function DeviceShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

function shareTextFor(post) {
  const raw = `${post.actor?.name ? `${post.actor.name}: ` : ""}${post.text || ""}`;
  return raw.length > 180 ? `${raw.slice(0, 177)}…` : raw;
}

function ShareButton({ post }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);
  useClickOutside(wrapRef, () => setOpen(false));

  const url = `${window.location.origin}/my-community#${post.id}`;
  const text = shareTextFor(post);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API unavailable; button still gives feedback below
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openShareWindow = (href) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=640");
    setOpen(false);
  };

  const shareViaDevice = async () => {
    try {
      await navigator.share({ title: post.actor?.name || "Masjid My Community", text, url });
      setOpen(false);
    } catch (err) {
      // AbortError just means the user closed the native sheet — leave our menu open either way
    }
  };

  const items = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      onClick: () => openShareWindow(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`),
    },
    {
      key: "twitter",
      label: "X (Twitter)",
      icon: <XIcon />,
      onClick: () => openShareWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`),
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: <FacebookIcon />,
      onClick: () => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`),
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: <LinkedInIcon />,
      onClick: () => openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`),
    },
    {
      // Instagram has no web share-intent URL — the reliable way to reach it
      // from a browser is the native OS share sheet (offered separately,
      // above, when supported). Here we copy the link and point the user at
      // pasting it into a Story/DM/bio, which is what Instagram itself expects.
      key: "instagram",
      label: "Instagram",
      hint: "Link copied — paste into a Story, DM, or bio",
      icon: <InstagramIcon />,
      onClick: () => { copyLink(); setOpen(false); },
    },
  ];

  return (
    <div className="cw-share-wrap" ref={wrapRef}>
      <button
        className={`cw-share${copied ? " copied" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Share this update"
      >
        <ShareIcon />
        {copied ? "Link copied" : "Share"}
      </button>
      {open && (
        <div className="cw-share-menu" role="menu">
          {typeof navigator.share === "function" && (
            <>
              <button type="button" role="menuitem" className="cw-share-item" onClick={shareViaDevice}>
                <DeviceShareIcon />
                <span>Share via…</span>
              </button>
              <div className="cw-share-menu-sep" />
            </>
          )}
          {items.map((item) => (
            <button
              type="button"
              key={item.key}
              role="menuitem"
              className={`cw-share-item cw-share-${item.key}`}
              onClick={item.onClick}
            >
              {item.icon}
              <span>
                {item.label}
                {item.hint && <small>{item.hint}</small>}
              </span>
            </button>
          ))}
          <div className="cw-share-menu-sep" />
          <button type="button" role="menuitem" className="cw-share-item" onClick={() => { copyLink(); setOpen(false); }}>
            <LinkIcon />
            <span>Copy Link</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ThumbUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 22h11a2 2 0 0 0 2-1.6l1.3-6.5A2 2 0 0 0 19.3 11.7H14l1-4.3A2 2 0 0 0 13.1 5L8 10.5V22H7z" />
      <path d="M2 10.5h5V22H2z" />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2H6a2 2 0 0 0-2 1.6l-1.3 6.5A2 2 0 0 0 4.7 12.3H10l-1 4.3A2 2 0 0 0 10.9 19L16 13.5V2h1z" />
      <path d="M22 13.5h-5V2h5z" />
    </svg>
  );
}

function VoteButtons({ post, user, navigate, onVote }) {
  const vote = async (value) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    onVote(post.activityId, value);
  };

  return (
    <div className="cw-vote-group">
      <button
        type="button"
        className={`cw-vote-btn${post.userVote === "like" ? " active" : ""}`}
        onClick={() => vote("like")}
        aria-label="Like this update"
      >
        <ThumbUpIcon />
        <span>{post.likeCount}</span>
      </button>
      <button
        type="button"
        className={`cw-vote-btn cw-vote-btn-down${post.userVote === "dislike" ? " active" : ""}`}
        onClick={() => vote("dislike")}
        aria-label="Dislike this update"
      >
        <ThumbDownIcon />
        <span>{post.dislikeCount}</span>
      </button>
    </div>
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

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function PostMenu({ post, onEdit, onDelete, onReport }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useClickOutside(wrapRef, () => setOpen(false));

  return (
    <div className="cw-postmenu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="cw-postmenu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Post options"
      >
        <DotsIcon />
      </button>
      {open && (
        <div className="cw-postmenu" role="menu">
          {post.ownerKind && (
            <>
              <button type="button" role="menuitem" className="cw-share-item" onClick={() => { setOpen(false); onEdit(post); }}>
                <Icon name="edit" size={16} />
                <span>Edit</span>
              </button>
              {(post.ownerKind === "masjid" || post.ownerKind === "community_post") && (
                <button
                  type="button"
                  role="menuitem"
                  className="cw-share-item cw-postmenu-danger"
                  onClick={() => { setOpen(false); onDelete(post); }}
                >
                  <Icon name="trash" size={16} />
                  <span>Delete</span>
                </button>
              )}
              <div className="cw-share-menu-sep" />
            </>
          )}
          <button type="button" role="menuitem" className="cw-share-item" onClick={() => { setOpen(false); onReport(post); }}>
            <Icon name="flag" size={16} />
            <span>Report Post</span>
          </button>
        </div>
      )}
    </div>
  );
}

function EditCommunityPostModal({ post, busy, error, maxLength, onCancel, onSave }) {
  const [body, setBody] = useState(post.text || "");
  const overLimit = body.length > maxLength;
  return (
    <div className="msj-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        {!busy && <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>}
        <h3>Edit Post</h3>
        <div className="auth-field">
          <label>Post Content</label>
          <MentionTextarea rows={6} value={body} onChange={setBody} placeholder="Share an update…" />
        </div>
        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel} disabled={busy} type="button">
            Cancel
          </button>
          <button
            className="btn btn-gold"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={busy || !body.trim() || overLimit}
            onClick={() => onSave({ body: body.trim() })}
            type="button"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteCommunityPostModal({ busy, error, onCancel, onConfirm }) {
  return (
    <div className="msj-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
        {!busy && <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>}
        <h3>Delete Post?</h3>
        <p className="msj-modal-sub">Are you sure you want to delete this post? This action cannot be undone.</p>
        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }} onClick={onCancel} disabled={busy} type="button">
            Cancel
          </button>
          <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }} onClick={onConfirm} disabled={busy} type="button">
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

// Post images with an id are their own interactive unit (own likes/comments)
// and open the lightbox on click; the flat single-banner-image posts (system
// activity types) have no id and just display inertly, as before.
function PostImageGallery({ images, onOpen }) {
  const n = images.length;
  const layoutClass = n === 1 ? "cw-gallery-1" : n === 2 ? "cw-gallery-2" : n === 3 ? "cw-gallery-3" : "cw-gallery-4plus";
  const visible = n > 4 ? images.slice(0, 4) : images;
  const extra = n > 4 ? n - 4 : 0;

  return (
    <div className={`cw-gallery ${layoutClass}`}>
      {visible.map((img, i) => (
        <button
          type="button"
          key={img.id ?? i}
          className="cw-gallery-tile"
          onClick={() => (img.id != null ? onOpen(i) : undefined)}
          style={{ cursor: img.id != null ? "pointer" : "default" }}
        >
          <img src={img.url} alt="" loading="lazy" />
          {extra > 0 && i === 3 && (
            <span className="cw-gallery-more-overlay">+{extra} more</span>
          )}
        </button>
      ))}
    </div>
  );
}

function CommunityPost({ post, user, navigate, onVote, onEdit, onDelete, onReport, onHashtagClick, commentMaxLength, replyMaxLength, onOpenImage }) {
  const meta = TYPE_META[post.type];
  const [showComments, setShowComments] = useState(false);
  const [commentCountOverride, setCommentCountOverride] = useState(null);
  const commentCount = commentCountOverride ?? post.commentCount ?? 0;
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
        {post.activityId && (
          <PostMenu post={post} onEdit={onEdit} onDelete={onDelete} onReport={onReport} />
        )}
      </div>

      <p className="cw-post-text"><PostBodyText text={post.text} onHashtagClick={onHashtagClick} /></p>

      {post.images && post.images.length > 0 && (
        <PostImageGallery images={post.images} onOpen={(index) => onOpenImage(post, index)} />
      )}

      {post.videoUrl && (
        <div className="cw-post-media cw-post-video">
          <video src={post.videoUrl} controls preload="metadata" />
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
        <div className="cw-post-secondary-actions">
          {post.activityId && <VoteButtons post={post} user={user} navigate={navigate} onVote={onVote} />}
          {post.activityId && (
            <button type="button" className="cw-comment-toggle" onClick={() => setShowComments((s) => !s)}>
              <CommentIcon />
              {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
            </button>
          )}
          <ShareButton post={post} />
        </div>
      </div>

      {post.activityId && showComments && (
        <CommentSection
          activityId={post.activityId}
          user={user}
          navigate={navigate}
          onCountChange={setCommentCountOverride}
          commentMaxLength={commentMaxLength}
          replyMaxLength={replyMaxLength}
        />
      )}
    </article>
  );
}

function Community() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: idParam } = useParams();
  // Matches both /account/my-masjids/new and /account/my-masjids/:id (same for
  // campaigns) — creating and editing a (draft) masjid/campaign share the
  // same embedded-in-the-wall experience.
  const showMasjidWizard = location.pathname === "/account/my-masjids/new" || (location.pathname.startsWith("/account/my-masjids/") && !!idParam);
  const showCampaignWizard = location.pathname === "/account/my-campaigns/new" || (location.pathname.startsWith("/account/my-campaigns/") && !!idParam);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const filter = FILTERS.some((f) => f.key === filterParam) ? filterParam : "all";
  const hashtag = searchParams.get("hashtag") || "";
  const sectionParam = searchParams.get("section");
  // Opening a wizard always means its own section — the sidebar should keep
  // showing the matching CTA/list regardless of whatever section query param
  // (if any) was active on the wall before navigating here.
  const section = showMasjidWizard
    ? "masjid"
    : showCampaignWizard
    ? "campaign"
    : COMMUNITY_SECTIONS.some((s) => s.key === sectionParam)
    ? sectionParam
    : null;

  const selectSection = (key) => {
    // A wizard occupies cw-main and pins the sidebar to its own section —
    // picking another section only makes sense back on the wall itself.
    if (showMasjidWizard || showCampaignWizard) {
      const cfg = COMMUNITY_SECTIONS.find((s) => s.key === key);
      const next = new URLSearchParams();
      next.set("section", key);
      if (cfg?.wallFilter) next.set("filter", cfg.wallFilter);
      navigate(`/my-community?${next.toString()}`);
      return;
    }
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("section", key);
      const cfg = COMMUNITY_SECTIONS.find((s) => s.key === key);
      if (cfg?.wallFilter) next.set("filter", cfg.wallFilter);
      return next;
    });
  };

  const [liveActivities, setLiveActivities] = useState([]);
  const [user, setUser] = useState(() => getStoredUser());
  const [myMasjids, setMyMasjids] = useState(null);
  const [myMasjidsError, setMyMasjidsError] = useState("");
  const [showAllMasjids, setShowAllMasjids] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [myCampaigns, setMyCampaigns] = useState(null);
  const [myCampaignsError, setMyCampaignsError] = useState("");

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  useEffect(() => {
    communityApi
      .get("/activities", { params: hashtag ? { hashtag } : undefined })
      .then(({ data }) => setLiveActivities(data.activities.map(mapLiveActivity)))
      .catch(() => {});
  }, [user, hashtag]);

  const openHashtag = (tag) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("hashtag", tag);
      next.delete("filter");
      next.delete("section");
      return next;
    });
  };

  const clearHashtag = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("hashtag");
      return next;
    });
  };

  const addNewPost = (activity) => {
    setLiveActivities((acts) => [mapLiveActivity(activity), ...acts]);
  };

  // The image viewer/lightbox — open on a specific post's image at a given
  // index, entirely independent of that post's own like/comment state.
  const [imageViewer, setImageViewer] = useState(null); // null | { post, index }

  const openImage = (post, index) => setImageViewer({ post, index });

  const onViewerImagesChange = (images) => {
    setLiveActivities((acts) =>
      acts.map((a) => (a.activityId === imageViewer.post.activityId ? { ...a, images } : a))
    );
  };

  useEffect(() => {
    if (!user) {
      setMyMasjids(null);
      return;
    }
    masjidApi
      .get("/mine")
      .then(({ data }) => setMyMasjids(data.masjids))
      .catch(() => setMyMasjidsError("Couldn't load your masjids."));
  }, [user]);

  useEffect(() => {
    // Loaded whenever a user is signed in — not just while the campaign
    // sidebar is open — since the Wall feed also needs it to work out which
    // posts belong to the viewer (for the Edit/Delete post menu).
    if (!user) {
      setMyCampaigns(null);
      return;
    }
    campaignApi
      .get("/mine")
      .then(({ data }) => setMyCampaigns(data.campaigns))
      .catch(() => setMyCampaignsError("Couldn't load your campaigns."));
  }, [user]);

  const ownedMasjidIds = useMemo(() => new Set((myMasjids || []).map((m) => m.id)), [myMasjids]);
  const ownedCampaignIds = useMemo(() => new Set((myCampaigns || []).map((c) => c.id)), [myCampaigns]);

  const [reportReasons, setReportReasons] = useState([]);
  useEffect(() => {
    reportApi.get("/reasons").then(({ data }) => setReportReasons(data.reasons)).catch(() => {});
  }, []);

  // Admin-configurable character limits (Settings → Community / Content) —
  // fetched once and passed down to the composer and every comment thread so
  // they never need their own request.
  const [contentLimits, setContentLimits] = useState({ maxPostLength: 2000, maxCommentLength: 1000, maxReplyLength: 1000 });
  useEffect(() => {
    communityApi.get("/content-settings").then(({ data }) => setContentLimits(data)).catch(() => {});
  }, []);

  // postModal: null | { type: "report", post }
  const [postModal, setPostModal] = useState(null);
  const [postBusy, setPostBusy] = useState(false);
  const [postError, setPostError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const closePostModal = () => {
    setPostModal(null);
    setPostError("");
    setReportSuccess(false);
  };

  // The masjid currently going through the shared delete-with-reason flow
  // (looked up from myMasjids, which already carries campaignCount).
  const [deleteFlowMasjid, setDeleteFlowMasjid] = useState(null);

  const editPost = (post) => {
    if (post.type === "community_post") {
      setPostModal({ type: "edit-community-post", post });
      return;
    }
    if (post.relatedMasjidId) navigate(`/account/my-masjids/${post.relatedMasjidId}`);
    else if (post.relatedCampaignId) navigate(`/account/my-campaigns/${post.relatedCampaignId}`);
  };

  const deletePost = (post) => {
    if (post.type === "community_post") {
      setPostModal({ type: "delete-community-post", post });
      return;
    }
    const masjid = (myMasjids || []).find((m) => m.id === post.relatedMasjidId);
    if (masjid) setDeleteFlowMasjid(masjid);
  };

  const saveCommunityPostEdit = async ({ body }) => {
    setPostBusy(true);
    setPostError("");
    try {
      await communityApi.patch(`/posts/${postModal.post.activityId}`, { body });
      setLiveActivities((acts) => acts.map((a) => (a.activityId === postModal.post.activityId ? { ...a, text: body } : a)));
      closePostModal();
    } catch (err) {
      setPostError(err.response?.data?.message || "Couldn't save this post. Please try again.");
    } finally {
      setPostBusy(false);
    }
  };

  const confirmCommunityPostDelete = async () => {
    setPostBusy(true);
    setPostError("");
    try {
      await communityApi.delete(`/posts/${postModal.post.activityId}`);
      setLiveActivities((acts) => acts.filter((a) => a.activityId !== postModal.post.activityId));
      closePostModal();
    } catch (err) {
      setPostError(err.response?.data?.message || "Couldn't delete this post. Please try again.");
    } finally {
      setPostBusy(false);
    }
  };

  const submitReport = async ({ reason, comment }) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const post = postModal.post;
    const targetType = post.relatedMasjidId ? "masjid" : post.relatedCampaignId ? "campaign" : "activity";
    const targetId = post.relatedMasjidId || post.relatedCampaignId || post.activityId;

    setPostBusy(true);
    setPostError("");
    try {
      await reportApi.post("/", { targetType, targetId, activityId: post.activityId, reason, comment });
      setReportSuccess(true);
    } catch (err) {
      setPostError(err.response?.data?.message || "Couldn't submit this report. Please try again.");
    } finally {
      setPostBusy(false);
    }
  };

  const castVote = (activityId, value) => {
    const prev = liveActivities;
    setLiveActivities((acts) =>
      acts.map((a) => {
        if (a.activityId !== activityId) return a;
        const next = { ...a };
        // Optimistic local update mirroring the server's toggle/switch rules,
        // so the UI feels instant while the request is in flight.
        if (a.userVote === value) {
          next[value === "like" ? "likeCount" : "dislikeCount"] -= 1;
          next.userVote = null;
        } else {
          if (a.userVote) next[a.userVote === "like" ? "likeCount" : "dislikeCount"] -= 1;
          next[value === "like" ? "likeCount" : "dislikeCount"] += 1;
          next.userVote = value;
        }
        return next;
      })
    );
    communityApi.post(`/activities/${activityId}/vote`, { value }).catch(() => setLiveActivities(prev));
  };

  const allPosts = useMemo(() => {
    const withOwnership = liveActivities.map((a) => {
      const ownsMasjid = !!user && a.relatedMasjidId && ownedMasjidIds.has(a.relatedMasjidId);
      const ownsCampaign = !!user && a.relatedCampaignId && ownedCampaignIds.has(a.relatedCampaignId);
      const ownsCommunityPost = !!user && a.type === "community_post" && a.relatedUserId === user.id;
      // Delete is only wired up for masjid-owned and self-authored community
      // posts today (the former reuses the My Masjids delete-with-reason
      // workflow, the latter its own confirm+delete) — campaigns don't have
      // an equivalent flow yet, so those posts can still be edited but not deleted.
      return { ...a, ownerKind: ownsCommunityPost ? "community_post" : ownsMasjid ? "masjid" : ownsCampaign ? "campaign" : null };
    });
    // The static demo posts aren't real content the hashtag search can match
    // against, so a hashtag view shows only the (already server-filtered)
    // live results — mixing in unrelated demo posts would be misleading.
    return hashtag ? withOwnership : [...withOwnership, ...posts];
  }, [liveActivities, user, ownedMasjidIds, ownedCampaignIds, hashtag]);
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
      <section className="py-sm">
        <div className="wrap">
          <div className="cw-layout">
            <div className="cw-main">
              {showMasjidWizard ? (
                <RequireUserAuth>
                  <MasjidWizard embedded />
                </RequireUserAuth>
              ) : showCampaignWizard ? (
                <RequireUserAuth>
                  <CampaignWizard embedded />
                </RequireUserAuth>
              ) : (
                <>
                  <PostComposer user={user} onPosted={addNewPost} maxLength={contentLimits.maxPostLength} />

                  {hashtag && (
                    <div className="cw-hashtag-banner">
                      <span>Posts tagged <strong>#{hashtag}</strong></span>
                      <button type="button" onClick={clearHashtag}>Clear <Icon name="x" size={13} /></button>
                    </div>
                  )}

                  <div className="cw-feed">
                    {filteredPosts.map((post, i) => (
                      <div className="reveal" style={{ transitionDelay: `${Math.min(i, 6) * 0.05}s` }} key={post.id}>
                        <CommunityPost
                          post={post}
                          user={user}
                          navigate={navigate}
                          onVote={castVote}
                          onEdit={editPost}
                          onDelete={deletePost}
                          onReport={(p) => {
                            if (!user) { navigate("/auth"); return; }
                            setPostModal({ type: "report", post: p });
                          }}
                          onHashtagClick={openHashtag}
                          commentMaxLength={contentLimits.maxCommentLength}
                          replyMaxLength={contentLimits.maxReplyLength}
                          onOpenImage={openImage}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="cw-feed-end">
                    <span>You're all caught up — check back soon for new activity.</span>
                  </div>
                </>
              )}
            </div>

            <aside className="cw-side">
              <div className="cw-side-card">
                <h4>Explore</h4>
                <div className="cw-section-menu">
                  {COMMUNITY_SECTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`cw-section-chip${section === s.key ? " active" : ""}`}
                      onClick={() => selectSection(s.key)}
                    >
                      <Icon name={s.icon} size={15} /> {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {section === "masjid" && (
                <>
                  <div className="cw-side-card cw-side-card-cta">
                    <h4>Register Your Masjid</h4>
                    <p className="cw-side-card-sub">Get verified and featured on the wall.</p>
                    <Link to="/account/my-masjids/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                      <Icon name="plus" size={16} /> Add a Masjid
                    </Link>
                  </div>

                  {user && (
                    <div className="cw-side-card">
                      <h4>My Masjids</h4>
                      {myMasjidsError && <p className="cw-side-card-sub">{myMasjidsError}</p>}
                      {myMasjids && myMasjids.length === 0 && (
                        <p className="cw-side-card-sub">You haven't registered a masjid yet — add one above to get started.</p>
                      )}
                      {myMasjids && myMasjids.length > 0 && (
                        <>
                          <ul className="cw-side-list cw-side-my-masjids">
                            {(showAllMasjids ? myMasjids : myMasjids.slice(0, SIDE_LIST_PREVIEW_COUNT)).map((m) => (
                              <li key={m.id}>
                                <Link to={`/account/my-masjids/${m.id}`} className="cw-my-masjid-item">
                                  <span className="cw-my-masjid-thumb">
                                    <MediaThumb src={m.coverPhotoUrl ? `${API_ORIGIN}${m.coverPhotoUrl}` : null} />
                                  </span>
                                  <span className="cw-my-masjid-body">
                                    <span className="cw-my-masjid-name">{m.name}</span>
                                    <span className={`acct-status-pill ${m.status}`}>{MASJID_STATUS_LABEL[m.status] || m.status}</span>
                                  </span>
                                  <span className="cw-my-masjid-time">{timeAgo(m.createdAt)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {myMasjids.length > SIDE_LIST_PREVIEW_COUNT && (
                            <button type="button" className="cw-side-link" onClick={() => setShowAllMasjids((v) => !v)}>
                              {showAllMasjids ? "Show less" : `View All (${myMasjids.length})`} <span className="btn-arrow">{showAllMasjids ? "↑" : "→"}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {section === "campaign" && (
                <>
                  <div className="cw-side-card cw-side-card-cta">
                    <h4>Start a Campaign</h4>
                    <p className="cw-side-card-sub">Raise funds for your masjid's next project.</p>
                    <Link to="/account/my-campaigns/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                      <Icon name="plus" size={16} /> Add a Campaign
                    </Link>
                  </div>

                  {user && (
                    <div className="cw-side-card">
                      <h4>My Campaigns</h4>
                      {myCampaignsError && <p className="cw-side-card-sub">{myCampaignsError}</p>}
                      {myCampaigns && myCampaigns.length === 0 && (
                        <p className="cw-side-card-sub">You haven't started a campaign yet — add one above to get started.</p>
                      )}
                      {myCampaigns && myCampaigns.length > 0 && (
                        <>
                          <ul className="cw-side-list cw-side-my-masjids">
                            {(showAllCampaigns ? myCampaigns : myCampaigns.slice(0, SIDE_LIST_PREVIEW_COUNT)).map((c) => (
                              <li key={c.id}>
                                <Link to={`/account/my-campaigns/${c.id}`} className="cw-my-masjid-item">
                                  <span className="cw-my-masjid-thumb">
                                    <MediaThumb src={c.coverPhotoUrl ? `${API_ORIGIN}${c.coverPhotoUrl}` : null} />
                                  </span>
                                  <span className="cw-my-masjid-body">
                                    <span className="cw-my-masjid-name">{c.title}</span>
                                    <span className={`acct-status-pill ${c.status}`}>{CAMPAIGN_STATUS_LABEL[c.status] || c.status}</span>
                                  </span>
                                  <span className="cw-my-masjid-time">{timeAgo(c.createdAt)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {myCampaigns.length > SIDE_LIST_PREVIEW_COUNT && (
                            <button type="button" className="cw-side-link" onClick={() => setShowAllCampaigns((v) => !v)}>
                              {showAllCampaigns ? "Show less" : `View All (${myCampaigns.length})`} <span className="btn-arrow">{showAllCampaigns ? "↑" : "→"}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {section && !["masjid", "campaign"].includes(section) && (
                <div className="cw-side-card cw-side-card-soon">
                  <h4>
                    <Icon name={COMMUNITY_SECTIONS.find((s) => s.key === section)?.icon} size={15} />{" "}
                    {COMMUNITY_SECTIONS.find((s) => s.key === section)?.label}
                  </h4>
                  <p className="cw-side-card-sub">This feature is coming soon — stay tuned!</p>
                </div>
              )}

            </aside>
          </div>
        </div>
      </section>

      {postModal?.type === "report" && (
        <ReportModal
          title="Report Post"
          reasons={reportReasons}
          busy={postBusy}
          error={postError}
          success={reportSuccess}
          onCancel={closePostModal}
          onSubmit={submitReport}
        />
      )}

      {postModal?.type === "edit-community-post" && (
        <EditCommunityPostModal
          post={postModal.post}
          busy={postBusy}
          error={postError}
          maxLength={contentLimits.maxPostLength}
          onCancel={closePostModal}
          onSave={saveCommunityPostEdit}
        />
      )}

      {postModal?.type === "delete-community-post" && (
        <DeleteCommunityPostModal busy={postBusy} error={postError} onCancel={closePostModal} onConfirm={confirmCommunityPostDelete} />
      )}

      {deleteFlowMasjid && (
        <MasjidDeleteFlow
          masjid={deleteFlowMasjid}
          onClose={() => setDeleteFlowMasjid(null)}
          onDeleted={() => {
            setLiveActivities((acts) => acts.filter((a) => a.relatedMasjidId !== deleteFlowMasjid.id));
            setMyMasjids((ms) => (ms || []).filter((m) => m.id !== deleteFlowMasjid.id));
          }}
        />
      )}

      {imageViewer && (
        <ImageViewer
          post={imageViewer.post}
          startIndex={imageViewer.index}
          user={user}
          navigate={navigate}
          commentMaxLength={contentLimits.maxCommentLength}
          replyMaxLength={contentLimits.maxReplyLength}
          onClose={() => setImageViewer(null)}
          onImagesChange={onViewerImagesChange}
        />
      )}
    </main>
  );
}

export default Community;
