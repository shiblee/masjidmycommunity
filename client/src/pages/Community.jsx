import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API_ORIGIN } from "../config.js";
import { getStoredUser } from "../utils/userAuthStorage.js";
import communityApi from "../services/communityApi.js";
import masjidApi from "../services/masjidApi.js";
import campaignApi from "../services/campaignApi.js";
import jobApi from "../services/jobApi.js";
import reportApi from "../services/reportApi.js";
import MediaThumb from "../components/MediaThumb.jsx";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import RequireUserAuth from "../components/RequireUserAuth.jsx";
import MasjidWizard from "./masjid/MasjidWizard.jsx";
import GreenTickWizard from "./masjid/GreenTickWizard.jsx";
import MasjidDeleteFlow from "../components/masjid/MasjidDeleteFlow.jsx";
import ReportModal from "../components/ReportModal.jsx";
import ImageViewer from "../components/ImageViewer.jsx";
import PostComposer from "../components/PostComposer.jsx";
import CampaignWizard from "./campaign/CampaignWizard.jsx";
import JobForm from "./jobs/JobForm.jsx";
import CommunityPost, { mapLiveActivity, timeAgo, EditCommunityPostModal, DeleteCommunityPostModal } from "../components/community/CommunityPost.jsx";


const MASJID_STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", approved: "Approved", rejected: "Rejected", inactive: "Inactive",
};

const CAMPAIGN_STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review", changes_requested: "Changes Requested",
  approved: "Approved", active: "Active", paused: "Paused", goal_reached: "Goal Reached",
  completed: "Completed", rejected: "Rejected", cancelled: "Cancelled",
};

const JOB_STATUS_LABEL = { active: "Active", closed: "Closed", expired: "Expired", deleted: "Deleted" };
// Reuses the acct-status-pill classes already styled for other statuses,
// same mapping as pages/jobs/MyJobs.jsx, rather than adding new CSS.
const JOB_STATUS_PILL_CLASS = { active: "active", closed: "inactive", expired: "cancelled", deleted: "cancelled" };

// Registry of top-level community categories shown in the right-hand menu.
// Adding a future real category is one more entry here (plus its own action
// panel below, mirroring "masjid"/"campaign") — nothing else needs to change.
const COMMUNITY_SECTIONS = [
  { key: "masjid", labelKey: "community.explore.masjid", label: "Masjid", icon: "mosque", wallFilter: "masjid_update" },
  { key: "campaign", labelKey: "community.explore.campaign", label: "Campaign", icon: "flag", wallFilter: "fundraising" },
  { key: "jobs", labelKey: "community.explore.jobs", label: "Jobs", icon: "building", wallFilter: null },
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
    cta: { label: "Explore Campaigns", href: "/explore-campaigns" },
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

function Community() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: idParam } = useParams();
  // A masjid's Green Tick application is reached from its own wall-embedded
  // page and must keep the exact same left/right sidebars — never its own
  // standalone layout — so it's detected first and excluded from the plain
  // masjid-wizard check below.
  const showGreenTickWizard = location.pathname.startsWith("/account/my-masjids/") && location.pathname.endsWith("/green-tick") && !!idParam;
  // Matches both /account/my-masjids/new and /account/my-masjids/:id (same for
  // campaigns) — creating and editing a (draft) masjid/campaign share the
  // same embedded-in-the-wall experience.
  const showMasjidWizard = !showGreenTickWizard && (location.pathname === "/account/my-masjids/new" || (location.pathname.startsWith("/account/my-masjids/") && !!idParam));
  const showCampaignWizard = location.pathname === "/account/my-campaigns/new" || (location.pathname.startsWith("/account/my-campaigns/") && !!idParam);
  const showJobForm = location.pathname === "/account/my-jobs/new" || (location.pathname.startsWith("/account/my-jobs/") && !!idParam);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const filter = FILTERS.some((f) => f.key === filterParam) ? filterParam : "all";
  const hashtag = searchParams.get("hashtag") || "";
  const sectionParam = searchParams.get("section");
  // Opening a wizard always means its own section — the sidebar should keep
  // showing the matching CTA/list regardless of whatever section query param
  // (if any) was active on the wall before navigating here.
  const section = showMasjidWizard || showGreenTickWizard
    ? "masjid"
    : showCampaignWizard
    ? "campaign"
    : showJobForm
    ? "jobs"
    : COMMUNITY_SECTIONS.some((s) => s.key === sectionParam)
    ? sectionParam
    : null;

  const selectSection = (key) => {
    // A wizard occupies cw-main and pins the sidebar to its own section —
    // picking another section only makes sense back on the wall itself.
    if (showMasjidWizard || showCampaignWizard || showGreenTickWizard || showJobForm) {
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
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [myJobs, setMyJobs] = useState(null);
  const [myJobsError, setMyJobsError] = useState("");

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

  useEffect(() => {
    if (!user) {
      setMyJobs(null);
      return;
    }
    jobApi
      .get("/mine")
      .then(({ data }) => setMyJobs(data.jobs))
      .catch(() => setMyJobsError("Couldn't load your jobs."));
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

  // Community-wide snapshot for the Wall's left sidebar (verified masjids,
  // active campaigns, members, total raised) — fetched once since it's a
  // slow-moving aggregate, not something that needs to track live activity.
  const [communityStats, setCommunityStats] = useState(null);
  useEffect(() => {
    communityApi.get("/stats").then(({ data }) => setCommunityStats(data)).catch(() => {});
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
            <aside className="cw-side">
              <div className="cw-side-card">
                <h4>Community Impact</h4>
                <div className="cw-side-stats">
                  <div>
                    <strong>{communityStats ? communityStats.masjidCount.toLocaleString("en-IN") : "—"}</strong>
                    <span>Verified Masjids</span>
                  </div>
                  <div>
                    <strong>{communityStats ? communityStats.campaignCount.toLocaleString("en-IN") : "—"}</strong>
                    <span>Active Campaigns</span>
                  </div>
                  <div>
                    <strong>{communityStats ? communityStats.memberCount.toLocaleString("en-IN") : "—"}</strong>
                    <span>Community Members</span>
                  </div>
                  <div>
                    <strong>{communityStats ? `₹${communityStats.totalRaised.toLocaleString("en-IN")}` : "—"}</strong>
                    <span>Total Raised</span>
                  </div>
                </div>
              </div>
            </aside>

            <div className="cw-main">
              {showMasjidWizard ? (
                <RequireUserAuth>
                  <MasjidWizard embedded />
                </RequireUserAuth>
              ) : showGreenTickWizard ? (
                <RequireUserAuth>
                  <GreenTickWizard embedded />
                </RequireUserAuth>
              ) : showCampaignWizard ? (
                <RequireUserAuth>
                  <CampaignWizard embedded />
                </RequireUserAuth>
              ) : showJobForm ? (
                <RequireUserAuth>
                  <JobForm embedded />
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
                <h4>{t("community.explore.heading", "Explore")}</h4>
                <div className="cw-section-menu">
                  {COMMUNITY_SECTIONS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      className={`cw-section-chip${section === s.key ? " active" : ""}`}
                      onClick={() => selectSection(s.key)}
                    >
                      <Icon name={s.icon} size={15} /> {t(s.labelKey, s.label)}
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

              {section === "jobs" && (
                <>
                  <div className="cw-side-card cw-side-card-cta">
                    <h4>Add a Job</h4>
                    <p className="cw-side-card-sub">Share an opening with the community.</p>
                    <Link to="/account/my-jobs/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                      <Icon name="plus" size={16} /> Add a Job
                    </Link>
                  </div>

                  {user && (
                    <div className="cw-side-card">
                      <h4>My Jobs</h4>
                      {myJobsError && <p className="cw-side-card-sub">{myJobsError}</p>}
                      {myJobs && myJobs.length === 0 && (
                        <p className="cw-side-card-sub">You haven't posted a job yet — add one above to get started.</p>
                      )}
                      {myJobs && myJobs.length > 0 && (
                        <>
                          <ul className="cw-side-list cw-side-my-masjids">
                            {(showAllJobs ? myJobs : myJobs.slice(0, SIDE_LIST_PREVIEW_COUNT)).map((j) => (
                              <li key={j.id}>
                                <Link to={`/account/my-jobs/${j.id}`} className="cw-my-masjid-item">
                                  <span className="cw-my-masjid-thumb">
                                    <MediaThumb src={null} />
                                  </span>
                                  <span className="cw-my-masjid-body">
                                    <span className="cw-my-masjid-name">{j.title}</span>
                                    <span className={`acct-status-pill ${JOB_STATUS_PILL_CLASS[j.status] || j.status}`}>{JOB_STATUS_LABEL[j.status] || j.status}</span>
                                  </span>
                                  <span className="cw-my-masjid-time">{timeAgo(j.createdAt)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {myJobs.length > SIDE_LIST_PREVIEW_COUNT && (
                            <button type="button" className="cw-side-link" onClick={() => setShowAllJobs((v) => !v)}>
                              {showAllJobs ? "Show less" : `View All (${myJobs.length})`} <span className="btn-arrow">{showAllJobs ? "↑" : "→"}</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {section && !["masjid", "campaign", "jobs"].includes(section) && (
                <div className="cw-side-card cw-side-card-soon">
                  <h4>
                    <Icon name={COMMUNITY_SECTIONS.find((s) => s.key === section)?.icon} size={15} />{" "}
                    {(() => {
                      const cfg = COMMUNITY_SECTIONS.find((s) => s.key === section);
                      return cfg ? t(cfg.labelKey, cfg.label) : null;
                    })()}
                  </h4>
                  <p className="cw-side-card-sub">{t("community.explore.comingSoon", "This feature is coming soon — stay tuned!")}</p>
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
