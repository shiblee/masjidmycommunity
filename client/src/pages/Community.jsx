import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { API_ORIGIN } from "../config.js";
import { getStoredUser } from "../utils/userAuthStorage.js";
import communityApi from "../services/communityApi.js";
import masjidApi from "../services/masjidApi.js";
import campaignApi from "../services/campaignApi.js";
import jobApi from "../services/jobApi.js";
import reportApi from "../services/reportApi.js";
import userApi from "../services/userApi.js";
import publicJobApi from "../services/publicJobApi.js";
import MasjidPickerModal from "../components/MasjidPickerModal.jsx";
import SalahTracker from "../components/profile/SalahTracker.jsx";
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
import ReelsRail from "../components/community/ReelsRail.jsx";
import RegisteredUsersRail from "../components/community/RegisteredUsersRail.jsx";


// Every acct-status-pill value that can show up across the masjid/campaign/job
// sidebar lists, mapped to its i18n key + English fallback — looked up via the
// statusLabel() helper inside the component (needs t(), so it can't live at
// module scope).
const STATUS_LABEL_ENTRIES = {
  draft: ["communityWall.status.draft", "Draft"],
  submitted: ["communityWall.status.submitted", "Submitted"],
  under_review: ["communityWall.status.underReview", "Under Review"],
  changes_requested: ["communityWall.status.changesRequested", "Changes Requested"],
  approved: ["communityWall.status.approved", "Approved"],
  rejected: ["communityWall.status.rejected", "Rejected"],
  inactive: ["communityWall.status.inactive", "Inactive"],
  active: ["communityWall.status.active", "Active"],
  paused: ["communityWall.status.paused", "Paused"],
  goal_reached: ["communityWall.status.goalReached", "Goal Reached"],
  completed: ["communityWall.status.completed", "Completed"],
  cancelled: ["communityWall.status.cancelled", "Cancelled"],
  closed: ["communityWall.status.closed", "Closed"],
  expired: ["communityWall.status.expired", "Expired"],
  deleted: ["communityWall.status.deleted", "Deleted"],
};
// Reuses the acct-status-pill classes already styled for other statuses,
// same mapping as pages/jobs/MyJobs.jsx, rather than adding new CSS.
const JOB_STATUS_PILL_CLASS = { active: "active", closed: "inactive", expired: "cancelled", deleted: "cancelled" };

// Registry of top-level community categories shown in the right-hand menu.
// Adding a future real category is one more entry here (plus its own action
// panel below, mirroring "masjid"/"campaign") — nothing else needs to change.
const COMMUNITY_SECTIONS = [
  { key: "masjid", labelKey: "community.explore.masjid", label: "Masjid", icon: "mosque", wallFilter: "masjid_update" },
  { key: "campaign", labelKey: "community.explore.campaign", label: "Campaign", icon: "flag", wallFilter: "fundraising" },
  { key: "jobs", labelKey: "community.explore.jobs", label: "Jobs", icon: "building", wallFilter: "job_posted" },
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
  { key: "job_posted", label: "Jobs" },
];

function matchesFilter(post, key) {
  if (key === "all") return true;
  if (key === "fundraising") return post.type === "campaign_launch" || post.type === "milestone";
  return post.type === key;
}

function Community() {
  const { t } = useTranslation();
  const statusLabel = (status) => {
    const entry = STATUS_LABEL_ENTRIES[status];
    return entry ? t(entry[0], entry[1]) : status;
  };
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

  // undefined = not checked yet, null = checked and none set, object = set.
  // Drives the right-side masjid card / empty CTA only now -- the left
  // sidebar's actual prayer display is the self-contained SalahTracker
  // below, which fetches its own day data (including the Mark Done state).
  const [primaryMasjid, setPrimaryMasjid] = useState(undefined);
  const [pmPickerOpen, setPmPickerOpen] = useState(false);

  // Personalized discovery widgets -- both login-gated (same as Primary
  // Masjid/SalahTracker on this page), null until fetched, empty array
  // meaning "checked, nothing to show" so the widget cleanly hides itself.
  const [recommendedJobs, setRecommendedJobs] = useState(null);
  const [nearbyMasjids, setNearbyMasjids] = useState(null);

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  useEffect(() => {
    if (!user) {
      setPrimaryMasjid(undefined);
      return;
    }
    userApi
      .get("/me/primary-masjid-status")
      .then(({ data }) => setPrimaryMasjid(data.primaryMasjid || null))
      .catch(() => setPrimaryMasjid(null));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setRecommendedJobs(null);
      setNearbyMasjids(null);
      return;
    }
    publicJobApi
      .get("/by-skills", { params: { limit: 4 } })
      .then(({ data }) => setRecommendedJobs(data.jobs || []))
      .catch(() => setRecommendedJobs([]));

    const loadNearby = (params) => {
      userApi
        .get("/me/nearby-masjids", { params })
        .then(({ data }) => setNearbyMasjids((data.masjids || []).slice(0, 4)))
        .catch(() => setNearbyMasjids([]));
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadNearby({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => loadNearby(undefined),
        { timeout: 6000 }
      );
    } else {
      loadNearby(undefined);
    }
  }, [user]);

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
      .catch(() => setMyMasjidsError(t("communityWall.masjid.loadError", "Couldn't load your masjids.")));
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
      .catch(() => setMyCampaignsError(t("communityWall.campaign.loadError", "Couldn't load your campaigns.")));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMyJobs(null);
      return;
    }
    jobApi
      .get("/mine")
      .then(({ data }) => setMyJobs(data.jobs))
      .catch(() => setMyJobsError(t("communityWall.jobs.loadError", "Couldn't load your jobs.")));
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
  const [contentLimits, setContentLimits] = useState({ maxPostLength: 2000, maxCommentLength: 1000, maxReplyLength: 1000, reelsIntervalPosts: 3 });
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
      setPostError(err.response?.data?.message || t("communityWall.editPost.saveError", "Couldn't save this post. Please try again."));
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
      setPostError(err.response?.data?.message || t("communityWall.editPost.deleteError", "Couldn't delete this post. Please try again."));
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
      setPostError(err.response?.data?.message || t("campaignProfile.post.reportError", "Couldn't submit this report. Please try again."));
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
    return liveActivities.map((a) => {
      const ownsMasjid = !!user && a.relatedMasjidId && ownedMasjidIds.has(a.relatedMasjidId);
      const ownsCampaign = !!user && a.relatedCampaignId && ownedCampaignIds.has(a.relatedCampaignId);
      const ownsCommunityPost = !!user && a.type === "community_post" && a.relatedUserId === user.id;
      // Delete is only wired up for masjid-owned and self-authored community
      // posts today (the former reuses the My Masjids delete-with-reason
      // workflow, the latter its own confirm+delete) — campaigns don't have
      // an equivalent flow yet, so those posts can still be edited but not deleted.
      return { ...a, ownerKind: ownsCommunityPost ? "community_post" : ownsMasjid ? "masjid" : ownsCampaign ? "campaign" : null };
    });
  }, [liveActivities, user, ownedMasjidIds, ownedCampaignIds]);
  const filteredPosts = useMemo(() => allPosts.filter((p) => matchesFilter(p, filter)), [allPosts, filter]);

  // Randomly picks Reels vs. Registered Users at each feed checkpoint --
  // computed once per checkpoint count (not on every render, e.g. a vote
  // triggering a re-render) so the choice at a given position stays put
  // instead of flipping under the reader as they interact with the page.
  const railCheckpointCount = Math.floor(filteredPosts.length / contentLimits.reelsIntervalPosts);
  const railTypes = useMemo(
    () => Array.from({ length: railCheckpointCount }, () => (Math.random() < 0.5 ? "reels" : "users")),
    [railCheckpointCount, contentLimits.reelsIntervalPosts]
  );

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
              {user && recommendedJobs && (
                <div className="cw-side-card">
                  <h4><Icon name="target" size={15} /> {t("jobs.rails.bySkills.title", "Based on Your Skills")}</h4>
                  {recommendedJobs.length === 0 ? (
                    <p className="cw-side-card-sub">{t("jobs.rails.bySkills.empty", "No jobs match your skills right now — check back later.")}</p>
                  ) : (
                    <ul className="cw-side-list cw-side-my-masjids">
                      {recommendedJobs.map((j) => (
                        <li key={j.id}>
                          <Link to={`/job/${j.slug}`} className="cw-my-masjid-item">
                            <span className="cw-my-masjid-thumb"><Icon name="briefcase" size={18} /></span>
                            <span className="cw-my-masjid-body">
                              <span className="cw-my-masjid-name">{j.title}</span>
                              <span className="cw-side-card-sub" style={{ marginBottom: 0 }}>{j.postedBy}{j.location ? ` · ${j.location}` : ""}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link to="/jobs" className="cw-side-link">
                    {t("communityWall.sideList.viewAllJobs", "See All Jobs")} <span className="btn-arrow">→</span>
                  </Link>
                </div>
              )}

              <div className="cw-side-card">
                <h4><Icon name="chartUp" size={15} /> {t("communityWall.impact.heading", "Community Impact")}</h4>
                <div className="cw-side-stats">
                  <div className="cw-impact-stat">
                    <span className="cw-impact-icon"><Icon name="mosque" size={16} /></span>
                    <span className="cw-impact-stat-body">
                      <strong>{communityStats ? communityStats.masjidCount.toLocaleString("en-IN") : "—"}</strong>
                      <span>{t("communityWall.impact.verifiedMasjids", "Verified Masjids")}</span>
                    </span>
                  </div>
                  <div className="cw-impact-stat">
                    <span className="cw-impact-icon"><Icon name="megaphone" size={16} /></span>
                    <span className="cw-impact-stat-body">
                      <strong>{communityStats ? communityStats.campaignCount.toLocaleString("en-IN") : "—"}</strong>
                      <span>{t("communityWall.impact.activeCampaigns", "Active Campaigns")}</span>
                    </span>
                  </div>
                  <div className="cw-impact-stat">
                    <span className="cw-impact-icon"><Icon name="people" size={16} /></span>
                    <span className="cw-impact-stat-body">
                      <strong>{communityStats ? communityStats.memberCount.toLocaleString("en-IN") : "—"}</strong>
                      <span>{t("communityWall.impact.communityMembers", "Community Members")}</span>
                    </span>
                  </div>
                  <div className="cw-impact-stat">
                    <span className="cw-impact-icon"><Icon name="wallet" size={16} /></span>
                    <span className="cw-impact-stat-body">
                      <strong>{communityStats ? `₹${communityStats.totalRaised.toLocaleString("en-IN")}` : "—"}</strong>
                      <span>{t("communityWall.impact.totalRaised", "Total Raised")}</span>
                    </span>
                  </div>
                </div>
              </div>

              {user && primaryMasjid && <SalahTracker compact />}
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
                      <span>{t("communityWall.hashtag.postsTagged", "Posts tagged")} <strong>#{hashtag}</strong></span>
                      <button type="button" onClick={clearHashtag}>{t("communityWall.hashtag.clear", "Clear")} <Icon name="x" size={13} /></button>
                    </div>
                  )}

                  <div className="cw-feed">
                    {filteredPosts.map((post, i) => (
                      <React.Fragment key={post.id}>
                      <div className="reveal" style={{ transitionDelay: `${Math.min(i, 6) * 0.05}s` }}>
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
                      {(i + 1) % contentLimits.reelsIntervalPosts === 0 && (
                        // Randomly Reels or Registered Users at each
                        // checkpoint (see railTypes above) rather than
                        // stacking both every time -- still repeats
                        // endlessly through the feed exactly like Reels
                        // did on its own, just in an unpredictable order.
                        railTypes[(i + 1) / contentLimits.reelsIntervalPosts - 1] === "reels" ? (
                          <ReelsRail user={user} />
                        ) : (
                          <RegisteredUsersRail />
                        )
                      )}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="cw-feed-end">
                    <span>{t("communityWall.feedEnd", "You're all caught up — check back soon for new activity.")}</span>
                  </div>
                </>
              )}
            </div>

            <aside className="cw-side">
              <div className="cw-side-card">
                <h4><Icon name="compass" size={15} /> {t("community.explore.heading", "Explore")}</h4>
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


              {nearbyMasjids && nearbyMasjids.length > 0 && (
                <div className="cw-side-card">
                  <h4><Icon name="mapPin" size={15} /> {t("community.nearbyMasjids.heading", "Nearby Masjids")}</h4>
                  <ul className="cw-side-list cw-side-my-masjids">
                    {nearbyMasjids.map((m) => (
                      <li key={m.id}>
                        <Link to={`/masjid/${m.id}`} className="cw-my-masjid-item">
                          <span className="cw-my-masjid-thumb">
                            {m.coverPhotoUrl ? <img src={`${API_ORIGIN}${m.coverPhotoUrl}`} alt="" /> : <Icon name="mosque" size={18} />}
                          </span>
                          <span className="cw-my-masjid-body">
                            <span className="cw-my-masjid-name">{m.name}</span>
                            <span className="cw-side-card-sub" style={{ marginBottom: 0 }}>{[m.city, m.country].filter(Boolean).join(", ")}</span>
                          </span>
                          {m.distanceKm != null && (
                            <span className="cw-my-masjid-time">{m.distanceKm < 1 ? `${Math.round(m.distanceKm * 1000)} m` : `${m.distanceKm.toFixed(1)} km`}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link to="/explore-masjids" className="cw-side-link">
                    {t("communityWall.sideList.viewAllMasjids", "See All Masjids")} <span className="btn-arrow">→</span>
                  </Link>
                </div>
              )}

              {user && (primaryMasjid ? (
                <div className="cw-side-card cw-pm-card">
                  <h4><Icon name="mosque" size={15} /> {t("community.pmCard.heading", "Primary Masjid")}</h4>
                  <MediaThumb src={primaryMasjid.coverPhotoUrl ? `${API_ORIGIN}${primaryMasjid.coverPhotoUrl}` : null} className="cw-pm-card-thumb" />
                  <strong className="cw-pm-card-name">{primaryMasjid.name}</strong>
                  {(primaryMasjid.city || primaryMasjid.country) && (
                    <span className="cw-pm-card-location"><Icon name="mapPin" size={13} />{[primaryMasjid.city, primaryMasjid.country].filter(Boolean).join(", ")}</span>
                  )}
                  <div className="cw-pm-card-actions">
                    <Link to={`/masjid/${primaryMasjid.id}`} className="btn btn-outline-ink" style={{ width: "100%", justifyContent: "center" }}>
                      {t("profile.pm.viewMasjid", "View Masjid")}
                    </Link>
                    <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={() => setPmPickerOpen(true)}>
                      {t("profile.pm.change", "Change Primary Masjid")}
                    </button>
                  </div>
                </div>
              ) : primaryMasjid === null ? (
                <div className="cw-side-card cw-side-card-cta">
                  <h4><Icon name="mosque" size={15} /> {t("community.pmCard.emptyHeading", "Set Your Primary Masjid")}</h4>
                  <p className="cw-side-card-sub">{t("community.pmCard.emptySub", "Pick a nearby masjid to see its prayer timings right here.")}</p>
                  <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => setPmPickerOpen(true)}>
                    {t("profile.pm.selectOne", "Select One")}
                  </button>
                </div>
              ) : null)}

              {section === "masjid" && (
                <>
                  <div className="cw-side-card cw-side-card-cta">
                    <h4>{t("communityWall.masjid.registerHeading", "Register Your Masjid")}</h4>
                    <p className="cw-side-card-sub">{t("communityWall.masjid.registerSub", "Get verified and featured on the wall.")}</p>
                    <Link to="/account/my-masjids/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                      <Icon name="plus" size={16} /> {t("communityWall.masjid.addMasjid", "Add a Masjid")}
                    </Link>
                  </div>

                  {user && (
                    <div className="cw-side-card">
                      <h4>{t("communityWall.masjid.myMasjidsHeading", "My Masjids")}</h4>
                      {myMasjidsError && <p className="cw-side-card-sub">{myMasjidsError}</p>}
                      {myMasjids && myMasjids.length === 0 && (
                        <p className="cw-side-card-sub">{t("communityWall.masjid.empty", "You haven't registered a masjid yet — add one above to get started.")}</p>
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
                                    <span className={`acct-status-pill ${m.status}`}>{statusLabel(m.status)}</span>
                                  </span>
                                  <span className="cw-my-masjid-time">{timeAgo(m.createdAt)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {myMasjids.length > SIDE_LIST_PREVIEW_COUNT && (
                            <button type="button" className="cw-side-link" onClick={() => setShowAllMasjids((v) => !v)}>
                              {showAllMasjids ? t("communityWall.sideList.showLess", "Show less") : t("communityWall.sideList.viewAll", "View All ({count})").replace("{count}", myMasjids.length)} <span className="btn-arrow">{showAllMasjids ? "↑" : "→"}</span>
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
                    <h4>{t("communityWall.campaign.startHeading", "Start a Campaign")}</h4>
                    <p className="cw-side-card-sub">{t("communityWall.campaign.startSub", "Raise funds for your masjid's next project.")}</p>
                    <Link to="/account/my-campaigns/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                      <Icon name="plus" size={16} /> {t("communityWall.campaign.addCampaign", "Add a Campaign")}
                    </Link>
                  </div>

                  {user && (
                    <div className="cw-side-card">
                      <h4>{t("communityWall.campaign.myCampaignsHeading", "My Campaigns")}</h4>
                      {myCampaignsError && <p className="cw-side-card-sub">{myCampaignsError}</p>}
                      {myCampaigns && myCampaigns.length === 0 && (
                        <p className="cw-side-card-sub">{t("communityWall.campaign.empty", "You haven't started a campaign yet — add one above to get started.")}</p>
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
                                    <span className={`acct-status-pill ${c.status}`}>{statusLabel(c.status)}</span>
                                  </span>
                                  <span className="cw-my-masjid-time">{timeAgo(c.createdAt)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {myCampaigns.length > SIDE_LIST_PREVIEW_COUNT && (
                            <button type="button" className="cw-side-link" onClick={() => setShowAllCampaigns((v) => !v)}>
                              {showAllCampaigns ? t("communityWall.sideList.showLess", "Show less") : t("communityWall.sideList.viewAll", "View All ({count})").replace("{count}", myCampaigns.length)} <span className="btn-arrow">{showAllCampaigns ? "↑" : "→"}</span>
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
                    <h4>{t("communityWall.jobs.addJob", "Add a Job")}</h4>
                    <p className="cw-side-card-sub">{t("communityWall.jobs.sub", "Share an opening with the community.")}</p>
                    <Link to="/account/my-jobs/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                      <Icon name="plus" size={16} /> {t("communityWall.jobs.addJob", "Add a Job")}
                    </Link>
                  </div>

                  {user && (
                    <div className="cw-side-card">
                      <h4>{t("communityWall.jobs.myJobsHeading", "My Jobs")}</h4>
                      {myJobsError && <p className="cw-side-card-sub">{myJobsError}</p>}
                      {myJobs && myJobs.length === 0 && (
                        <p className="cw-side-card-sub">{t("communityWall.jobs.empty", "You haven't posted a job yet — add one above to get started.")}</p>
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
                                    <span className={`acct-status-pill ${JOB_STATUS_PILL_CLASS[j.status] || j.status}`}>{statusLabel(j.status)}</span>
                                  </span>
                                  <span className="cw-my-masjid-time">{timeAgo(j.createdAt)}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {myJobs.length > SIDE_LIST_PREVIEW_COUNT && (
                            <button type="button" className="cw-side-link" onClick={() => setShowAllJobs((v) => !v)}>
                              {showAllJobs ? t("communityWall.sideList.showLess", "Show less") : t("communityWall.sideList.viewAll", "View All ({count})").replace("{count}", myJobs.length)} <span className="btn-arrow">{showAllJobs ? "↑" : "→"}</span>
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
          title={t("campaignProfile.post.reportTitle", "Report Post")}
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

      {pmPickerOpen && (
        <MasjidPickerModal
          title={primaryMasjid ? t("profile.pm.changeTitle", "Change Primary Masjid") : undefined}
          onClose={() => setPmPickerOpen(false)}
          onSelected={(masjid) => {
            setPrimaryMasjid(masjid);
            setPmPickerOpen(false);
          }}
        />
      )}
    </main>
  );
}

export default Community;
