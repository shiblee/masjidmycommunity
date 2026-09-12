import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import userApi from "../services/userApi.js";
import communityApi from "../services/communityApi.js";
import reportApi from "../services/reportApi.js";
import { updateStoredUser, getStoredUser } from "../utils/userAuthStorage.js";
import { API_ORIGIN } from "../config.js";
import ProfilePhotoCard from "../components/profile/ProfilePhotoCard.jsx";
import PersonalDetailsCard, { PersonalDetailsForm } from "../components/profile/PersonalDetailsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import WorkExperienceCard from "../components/profile/WorkExperienceCard.jsx";
import SkillsCard from "../components/profile/SkillsCard.jsx";
import HobbiesCard from "../components/profile/HobbiesCard.jsx";
import SecurityCard from "../components/profile/SecurityCard.jsx";
import ProfileCompletion from "../components/profile/ProfileCompletion.jsx";
import PostComposer from "../components/PostComposer.jsx";
import ShareMenu from "../components/ShareMenu.jsx";
import ReportModal from "../components/ReportModal.jsx";
import ImageViewer from "../components/ImageViewer.jsx";
import CommunityPost, { mapLiveActivity, EditCommunityPostModal, DeleteCommunityPostModal } from "../components/community/CommunityPost.jsx";
import FollowListModal from "../components/profile/FollowListModal.jsx";

const SIDE_LIST_PREVIEW_COUNT = 3;
const POSTS_PAGE_SIZE = 10;

const PROFILE_NAV_SECTIONS = [
  { key: "wall", labelKey: "profile.nav.wall.label", label: "My Wall", descKey: "profile.nav.wall.desc", desc: "Your posts & activity", icon: "grid" },
  { key: "personal", labelKey: "profile.nav.personal.label", label: "Profile Details", descKey: "profile.nav.personal.desc", desc: "Bio, contact & personal info", icon: "people" },
  { key: "education", labelKey: "profile.nav.education.label", label: "Education", descKey: "profile.nav.education.desc", desc: "Your academic background", icon: "book" },
  { key: "work-experience", labelKey: "profile.nav.workExperience.label", label: "Work Experience", descKey: "profile.nav.workExperience.desc", desc: "Where you've worked", icon: "building" },
  { key: "hobbies", labelKey: "profile.nav.hobbies.label", label: "Hobbies & Interests", descKey: "profile.nav.hobbies.desc", desc: "What you enjoy", icon: "star" },
  { key: "skills", labelKey: "profile.nav.skills.label", label: "Skills", descKey: "profile.nav.skills.desc", desc: "What you're good at", icon: "bulb" },
  { key: "security", labelKey: "profile.nav.security.label", label: "Security", descKey: "profile.nav.security.desc", desc: "Password & account safety", icon: "shieldCheck" },
];

function timeAgo(dateStr, t) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("commentSection.time.justNow", "Just now");
  if (mins < 60) return t("commentSection.time.minutesAgo", "{count}m ago").replace("{count}", mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("commentSection.time.hoursAgo", "{count}h ago").replace("{count}", hrs);
  const days = Math.floor(hrs / 24);
  if (days < 30) return t("commentSection.time.daysAgo", "{count}d ago").replace("{count}", days);
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function OwnedAssetList({ title, items, showAll, onToggleShowAll, statusLabel, nameKey, linkBase, linkKey = "id", icon }) {
  const { t } = useTranslation();
  if (!items || items.length === 0) return null;
  const visible = showAll ? items : items.slice(0, SIDE_LIST_PREVIEW_COUNT);
  return (
    <div className="cw-side-card">
      <h4>{title}</h4>
      <ul className="cw-side-list cw-side-my-masjids">
        {visible.map((item) => (
          <li key={item.id}>
            <Link to={`${linkBase}/${item[linkKey]}`} className="cw-my-masjid-item">
              <span className="cw-my-masjid-thumb"><Icon name={icon} size={18} /></span>
              <span className="cw-my-masjid-body">
                <span className="cw-my-masjid-name">{item[nameKey]}</span>
                <span className={`acct-status-pill ${item.status}`}>{statusLabel[item.status] || item.status}</span>
              </span>
              <span className="cw-my-masjid-time">{timeAgo(item.createdAt, t)}</span>
            </Link>
          </li>
        ))}
      </ul>
      {items.length > SIDE_LIST_PREVIEW_COUNT && (
        <button type="button" className="cw-side-link" onClick={onToggleShowAll}>
          {showAll ? t("communityWall.sideList.showLess", "Show less") : t("communityWall.sideList.viewAll", "View All ({count})").replace("{count}", items.length)} <span className="btn-arrow">{showAll ? "↑" : "→"}</span>
        </button>
      )}
    </div>
  );
}

const PROFILE_NAV_KEYS = PROFILE_NAV_SECTIONS.map((s) => s.key);

const VIEWER_TABS = [
  { key: "about", labelKey: "profile.tabs.about", label: "About" },
  { key: "background", labelKey: "profile.tabs.background", label: "Background" },
  { key: "masjid", labelKey: "profile.tabs.masjid", label: "Masjid" },
  { key: "jobs", labelKey: "profile.tabs.jobs", label: "Jobs" },
];
const VIEWER_TAB_KEYS = VIEWER_TABS.map((s) => s.key);

function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username, tab: section } = useParams();
  const viewer = getStoredUser();

  const [profile, setProfile] = useState(null);
  const [education, setEducation] = useState([]);
  const [workExperience, setWorkExperience] = useState([]);
  const [skills, setSkills] = useState([]);
  const [hobbies, setHobbies] = useState([]);
  const [masjids, setMasjids] = useState([]);
  const [likedMasjids, setLikedMasjids] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [likedJobs, setLikedJobs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAllMasjids, setShowAllMasjids] = useState(false);
  const [showAllLikedMasjids, setShowAllLikedMasjids] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [showAllLikedJobs, setShowAllLikedJobs] = useState(false);
  const [contentLimits, setContentLimits] = useState({ maxPostLength: 2000, maxCommentLength: 1000, maxReplyLength: 1000 });
  const [imageViewer, setImageViewer] = useState(null); // null | { post, index }
  const [postModal, setPostModal] = useState(null); // null | { type: "report"|"edit-community-post"|"delete-community-post", post }
  const [postBusy, setPostBusy] = useState(false);
  const [postError, setPostError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportReasons, setReportReasons] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [followModal, setFollowModal] = useState(null); // null | "followers" | "following"
  const shareBtnRef = useRef(null);
  const activeSection = PROFILE_NAV_KEYS.includes(section) ? section : "wall";
  const activeViewerTab = VIEWER_TAB_KEYS.includes(section) ? section : "about";

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    userApi
      .get(`/public/${username}`)
      .then(({ data }) => {
        setProfile(data.user);
        setFollowing(!!data.user.isFollowing);
        setFollowersCount(data.user.followersCount || 0);
        setFollowingCount(data.user.followingCount || 0);
        setEducation(data.education);
        setWorkExperience(data.workExperience);
        setSkills(data.skills);
        setHobbies(data.hobbies);
        setMasjids(data.masjids);
        setLikedMasjids(data.likedMasjids);
        setCampaigns(data.campaigns);
        setJobs(data.jobs);
        setLikedJobs(data.likedJobs);
        // Keep the navbar/session copy of "my own" data in sync if I'm
        // looking at my own profile (e.g. after an admin edited it elsewhere).
        if (data.user.isOwner && viewer) updateStoredUser({ ...viewer, ...data.user });
      })
      .catch((err) => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(() => {
    communityApi.get("/content-settings").then(({ data }) => setContentLimits(data)).catch(() => {});
    reportApi.get("/reasons").then(({ data }) => setReportReasons(data.reasons)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!profile) return;
    setPostsLoading(true);
    communityApi
      .get("/activities", { params: { userId: profile.id, limit: POSTS_PAGE_SIZE } })
      .then(({ data }) => {
        setPosts(data.activities.map(mapLiveActivity));
        setPostsHasMore(!!data.hasMore);
      })
      .finally(() => setPostsLoading(false));
  }, [profile?.id]);

  const handlePostCreated = () => {
    setPostsLoading(true);
    communityApi
      .get("/activities", { params: { userId: profile.id, limit: POSTS_PAGE_SIZE } })
      .then(({ data }) => {
        setPosts(data.activities.map(mapLiveActivity));
        setPostsHasMore(!!data.hasMore);
      })
      .finally(() => setPostsLoading(false));
  };

  const loadMorePosts = () => {
    setPostsLoading(true);
    communityApi
      .get("/activities", { params: { userId: profile.id, limit: POSTS_PAGE_SIZE, offset: posts.length } })
      .then(({ data }) => {
        setPosts((p) => [...p, ...data.activities.map(mapLiveActivity)]);
        setPostsHasMore(!!data.hasMore);
      })
      .finally(() => setPostsLoading(false));
  };

  const handleUserUpdated = (updatedUser) => {
    setProfile((p) => ({ ...p, ...updatedUser }));
    if (viewer) updateStoredUser({ ...viewer, ...updatedUser });
  };

  const castVote = (activityId, value) => {
    const prev = posts;
    setPosts((acts) =>
      acts.map((a) => {
        if (a.activityId !== activityId) return a;
        const next = { ...a };
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
    communityApi.post(`/activities/${activityId}/vote`, { value }).catch(() => setPosts(prev));
  };

  const openImage = (post, index) => setImageViewer({ post, index });
  const onViewerImagesChange = (images) => {
    setPosts((acts) => acts.map((a) => (a.activityId === imageViewer.post.activityId ? { ...a, images } : a)));
  };

  const closePostModal = () => {
    setPostModal(null);
    setPostError("");
    setReportSuccess(false);
  };

  const editPost = (post) => setPostModal({ type: "edit-community-post", post });
  const deletePost = (post) => setPostModal({ type: "delete-community-post", post });
  const reportPost = (post) => {
    if (!viewer) { navigate("/auth"); return; }
    setPostModal({ type: "report", post });
  };

  const toggleFollow = async () => {
    if (!viewer) { navigate("/auth"); return; }
    if (followBusy) return;
    setFollowBusy(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setFollowersCount((c) => Math.max(0, c + (wasFollowing ? -1 : 1)));
    try {
      if (wasFollowing) await userApi.delete(`/${profile.id}/follow`);
      else await userApi.post(`/${profile.id}/follow`);
    } catch {
      setFollowing(wasFollowing);
      setFollowersCount((c) => Math.max(0, c + (wasFollowing ? 1 : -1)));
    } finally {
      setFollowBusy(false);
    }
  };

  const saveCommunityPostEdit = async ({ body }) => {
    setPostBusy(true);
    setPostError("");
    try {
      await communityApi.patch(`/posts/${postModal.post.activityId}`, { body });
      setPosts((acts) => acts.map((a) => (a.activityId === postModal.post.activityId ? { ...a, text: body } : a)));
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
      setPosts((acts) => acts.filter((a) => a.activityId !== postModal.post.activityId));
      closePostModal();
    } catch (err) {
      setPostError(err.response?.data?.message || t("communityWall.editPost.deleteError", "Couldn't delete this post. Please try again."));
    } finally {
      setPostBusy(false);
    }
  };

  const submitReport = async ({ reason, comment }) => {
    const post = postModal.post;
    setPostBusy(true);
    setPostError("");
    try {
      await reportApi.post("/", { targetType: "activity", targetId: post.activityId, activityId: post.activityId, reason, comment });
      setReportSuccess(true);
    } catch (err) {
      setPostError(err.response?.data?.message || t("campaignProfile.post.reportError", "Couldn't submit this report. Please try again."));
    } finally {
      setPostBusy(false);
    }
  };

  const openHashtag = (tag) => navigate(`/my-community?hashtag=${encodeURIComponent(tag)}`);


  if (loading) {
    return (
      <main className="cw-page">
        <section className="py-sm"><div className="wrap"><p className="msj-note">{t("profile.loading", "Loading profile…")}</p></div></section>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="cw-page">
        <section className="py-sm">
          <div className="wrap" style={{ textAlign: "center", padding: "60px 0" }}>
            <h2>{t("profile.notFound.title", "Profile not found")}</h2>
            <p className="msj-note">{t("profile.notFound.body", "This member doesn't exist, or their profile isn't available right now.")}</p>
            <Link to="/my-community" className="btn btn-gold" style={{ marginTop: 16 }}>{t("masjidWizard.backToCommunityWall", "Back to Community Wall")}</Link>
          </div>
        </section>
      </main>
    );
  }

  const isOwner = !!profile.isOwner;
  const mode = isOwner ? "self" : "view";

  const badges = [
    masjids.length > 0 && { key: "masjidOwner", icon: "mosque", label: t("profile.badge.masjidOwner", "Masjid Owner") },
    jobs.length > 0 && { key: "jobPoster", icon: "briefcase", label: t("profile.badge.jobPoster", "Job Poster") },
    campaigns.length > 0 && { key: "campaignOrganizer", icon: "flag", label: t("profile.badge.campaignOrganizer", "Campaign Organizer") },
    profile.verified && { key: "verifiedMember", icon: "shieldCheck", label: t("profile.badge.verifiedMember", "Verified Member") },
  ].filter(Boolean);

  return (
    <main className="cw-page">
      {!isOwner && (
        <section className="py-sm pf-header-section">
          <div className="wrap">
            <div className="pf-profile-header">
              <div className="pf-profile-header-avatar">
                {profile.profilePhoto ? (
                  <div className="profile-avatar-wrap"><img className="profile-avatar-img" src={`${API_ORIGIN}${profile.profilePhoto}`} alt={profile.fullName} /></div>
                ) : (
                  <div className="profile-avatar-wrap"><div className="acct-avatar profile-avatar-fallback">{initialsOf(profile.fullName)}</div></div>
                )}
              </div>
              <div className="pf-profile-header-info">
                <h1>{profile.fullName}</h1>
                <p className="pf-profile-header-username">
                  @{profile.username}
                  {profile.isFollowedBy && <span className="pf-follows-you-badge">{t("profile.follow.followsYou", "Follows you")}</span>}
                </p>
                {profile.bio && <p className="pf-profile-header-bio">{profile.bio}</p>}
                {profile.locationLabel && <span className="pf-profile-header-location"><Icon name="mapPin" size={14} />{profile.locationLabel}</span>}

                <div className="pf-follow-stats">
                  <button type="button" onClick={() => setFollowModal("followers")}>
                    <strong>{followersCount}</strong> {t("profile.follow.followers", "Followers")}
                  </button>
                  <button type="button" onClick={() => setFollowModal("following")}>
                    <strong>{followingCount}</strong> {t("profile.follow.followingCount", "Following")}
                  </button>
                </div>

                <button
                  type="button"
                  className={`pf-follow-btn${following ? " is-following" : ""}`}
                  disabled={followBusy}
                  onClick={toggleFollow}
                >
                  <Icon name={following ? "check" : "plus"} size={15} />
                  {following ? t("profile.follow.following", "Following") : t("profile.follow.follow", "Follow")}
                </button>
              </div>
            </div>
          </div>
          <div className="msj-hub-tabs-bar">
            <div className="wrap msj-hub-tabs">
              {VIEWER_TABS.map((tabDef) => (
                <button
                  key={tabDef.key}
                  type="button"
                  className={activeViewerTab === tabDef.key ? "active" : ""}
                  onClick={() => navigate(tabDef.key === "about" ? `/profile/${username}` : `/profile/${username}/${tabDef.key}`)}
                >
                  {t(tabDef.labelKey, tabDef.label)}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      {(isOwner || activeViewerTab === "about" || activeViewerTab === "background" || activeViewerTab === "masjid" || activeViewerTab === "jobs") && (
      <section className="py-sm">
        <div className="wrap">
          <div className="cw-layout">
            <aside className="cw-side">
              {isOwner && (
                <div className="cw-side-card" style={{ textAlign: "center" }}>
                  <ProfilePhotoCard user={profile} onUserUpdated={handleUserUpdated} />
                  <h3 style={{ marginTop: 14, marginBottom: 2 }}>{profile.fullName}</h3>
                  <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>@{profile.username}</p>
                  <div className="pf-follow-stats pf-follow-stats-center">
                    <button type="button" onClick={() => setFollowModal("followers")}>
                      <strong>{followersCount}</strong> {t("profile.follow.followers", "Followers")}
                    </button>
                    <button type="button" onClick={() => setFollowModal("following")}>
                      <strong>{followingCount}</strong> {t("profile.follow.followingCount", "Following")}
                    </button>
                  </div>
                </div>
              )}

              {isOwner ? (
                <>
                  <div className="cw-side-card pf-nav-card">
                    <nav className="pf-section-nav">
                      {PROFILE_NAV_SECTIONS.map((s) => (
                        <Link
                          key={s.key}
                          to={s.key === "wall" ? `/profile/${username}` : `/profile/${username}/${s.key}`}
                          className={`pf-section-nav-item${activeSection === s.key ? " active" : ""}`}
                        >
                          <span className="pf-section-nav-icon"><Icon name={s.icon} size={17} /></span>
                          <span className="pf-section-nav-text">
                            <span className="pf-section-nav-label">{t(s.labelKey, s.label)}</span>
                            <span className="pf-section-nav-desc">{t(s.descKey, s.desc)}</span>
                          </span>
                          <Icon name="chevronRight" size={14} className="pf-section-nav-chevron" />
                        </Link>
                      ))}
                    </nav>
                  </div>
                  <div className="cw-side-card"><ProfileCompletion user={profile} /></div>
                </>
              ) : (
                <PersonalDetailsCard user={profile} mode={mode} onUserUpdated={handleUserUpdated} />
              )}
            </aside>

            <div className="cw-main">
              {isOwner ? (
                <div className="pf-section-content" key={activeSection}>
                  {activeSection === "wall" && (
                    <>
                      <PostComposer user={profile} onPosted={handlePostCreated} maxLength={contentLimits.maxPostLength} />
                      {postsLoading && posts.length === 0 ? (
                        <p className="msj-note">{t("profile.posts.loading", "Loading posts…")}</p>
                      ) : posts.length === 0 ? (
                        <div className="cw-side-card" style={{ textAlign: "center", marginTop: 20 }}>
                          <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
                            {t("profile.posts.emptyOwner", "You haven't shared anything on the Community Wall yet.")}
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 20 }}>
                          {posts.map((post) => (
                            <CommunityPost
                              key={post.id}
                              post={{ ...post, ownerKind: "community_post" }}
                              user={viewer}
                              navigate={navigate}
                              onVote={castVote}
                              onEdit={editPost}
                              onDelete={deletePost}
                              onReport={reportPost}
                              onHashtagClick={openHashtag}
                              commentMaxLength={contentLimits.maxCommentLength}
                              replyMaxLength={contentLimits.maxReplyLength}
                              onOpenImage={openImage}
                            />
                          ))}
                        </div>
                      )}
                      {postsHasMore && (
                        <button type="button" className="btn btn-outline-ink" style={{ marginTop: 20 }} disabled={postsLoading} onClick={loadMorePosts}>
                          {postsLoading ? t("masjidWizard.loading", "Loading…") : t("profile.posts.loadMore", "Load more posts")}
                        </button>
                      )}
                    </>
                  )}
                  {activeSection === "personal" && (
                    <div className="card profile-card">
                      <div className="profile-card-head">
                        <h3>{t("profile.nav.personal.label", "Profile Details")}</h3>
                      </div>
                      <PersonalDetailsForm user={profile} mode="self" onSaved={handleUserUpdated} />
                    </div>
                  )}
                  {activeSection === "education" && <EducationCard mode="self" />}
                  {activeSection === "work-experience" && <WorkExperienceCard mode="self" />}
                  {activeSection === "hobbies" && <HobbiesCard mode="self" />}
                  {activeSection === "skills" && <SkillsCard mode="self" />}
                  {activeSection === "security" && <SecurityCard />}
                </div>
              ) : activeViewerTab === "background" ? (
                education.length === 0 && workExperience.length === 0 && skills.length === 0 && hobbies.length === 0 ? (
                  <div className="cw-side-card" style={{ textAlign: "center" }}>
                    <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
                      {t("profile.backgroundTab.emptyOther", "{name} hasn't added any background information yet.").replace("{name}", profile.fullName)}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <EducationCard mode={mode} entries={education} />
                    <WorkExperienceCard mode={mode} entries={workExperience} />
                    <SkillsCard mode={mode} entries={skills} />
                    <HobbiesCard mode={mode} entries={hobbies} />
                  </div>
                )
              ) : activeViewerTab === "masjid" ? (
                masjids.length === 0 && likedMasjids.length === 0 ? (
                  <div className="cw-side-card" style={{ textAlign: "center" }}>
                    <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
                      {t("profile.masjidTab.emptyOther", "{name} hasn't added any masjids yet.").replace("{name}", profile.fullName)}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <OwnedAssetList
                      title={t("communityWall.masjid.myMasjidsHeading", "My Masjids")}
                      items={masjids}
                      showAll={showAllMasjids}
                      onToggleShowAll={() => setShowAllMasjids((v) => !v)}
                      statusLabel={{
                        draft: t("masjidWizard.status.draft", "Draft"),
                        submitted: t("masjidWizard.status.submitted", "Submitted"),
                        under_review: t("masjidWizard.status.underReview", "Under Review"),
                        changes_requested: t("masjidWizard.status.changesRequested", "Changes Requested"),
                        approved: t("masjidWizard.status.approved", "Approved"),
                        rejected: t("masjidWizard.status.rejected", "Rejected"),
                        inactive: t("masjidWizard.status.inactive", "Inactive"),
                      }}
                      nameKey="name"
                      linkBase="/masjid"
                      icon="mosque"
                    />
                    <OwnedAssetList
                      title={t("profile.masjidTab.likedHeading", "Liked Masjids")}
                      items={likedMasjids}
                      showAll={showAllLikedMasjids}
                      onToggleShowAll={() => setShowAllLikedMasjids((v) => !v)}
                      statusLabel={{ approved: t("masjidWizard.status.approved", "Approved") }}
                      nameKey="name"
                      linkBase="/masjid"
                      icon="heart"
                    />
                  </div>
                )
              ) : activeViewerTab === "jobs" ? (
                jobs.length === 0 && likedJobs.length === 0 ? (
                  <div className="cw-side-card" style={{ textAlign: "center" }}>
                    <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
                      {t("profile.jobsTab.emptyOther", "{name} hasn't posted any jobs yet.").replace("{name}", profile.fullName)}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <OwnedAssetList
                      title={t("communityWall.jobs.myJobsHeading", "My Jobs")}
                      items={jobs}
                      showAll={showAllJobs}
                      onToggleShowAll={() => setShowAllJobs((v) => !v)}
                      statusLabel={{
                        active: t("communityWall.status.active", "Active"),
                        closed: t("communityWall.status.closed", "Closed"),
                        expired: t("communityWall.status.expired", "Expired"),
                      }}
                      nameKey="title"
                      linkBase="/job"
                      linkKey="slug"
                      icon="building"
                    />
                    <OwnedAssetList
                      title={t("profile.jobsTab.likedHeading", "Liked Jobs")}
                      items={likedJobs}
                      showAll={showAllLikedJobs}
                      onToggleShowAll={() => setShowAllLikedJobs((v) => !v)}
                      statusLabel={{ active: t("communityWall.status.active", "Active") }}
                      nameKey="title"
                      linkBase="/job"
                      linkKey="slug"
                      icon="heart"
                    />
                  </div>
                )
              ) : postsLoading && posts.length === 0 ? (
                <p className="msj-note">{t("profile.posts.loading", "Loading posts…")}</p>
              ) : posts.length === 0 ? (
                <div className="cw-side-card" style={{ textAlign: "center" }}>
                  <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
                    {t("profile.posts.empty", "{name} hasn't shared anything on the Community Wall yet.").replace("{name}", profile.fullName)}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {posts.map((post) => (
                    <CommunityPost
                      key={post.id}
                      post={{ ...post, ownerKind: null }}
                      user={viewer}
                      navigate={navigate}
                      onVote={castVote}
                      onEdit={editPost}
                      onDelete={deletePost}
                      onReport={reportPost}
                      onHashtagClick={openHashtag}
                      commentMaxLength={contentLimits.maxCommentLength}
                      replyMaxLength={contentLimits.maxReplyLength}
                      onOpenImage={openImage}
                    />
                  ))}
                </div>
              )}

              {!isOwner && activeViewerTab === "about" && postsHasMore && (
                <button type="button" className="btn btn-outline-ink" style={{ marginTop: 20 }} disabled={postsLoading} onClick={loadMorePosts}>
                  {postsLoading ? t("masjidWizard.loading", "Loading…") : t("profile.posts.loadMore", "Load more posts")}
                </button>
              )}
            </div>

            <aside className="cw-side">
              {!isOwner && (
                <div className="cw-side-card">
                  <h4>{t("profile.stats.heading", "Profile Stats")}</h4>
                  <div className="pf-stats-grid">
                    <div className="pf-stat-tile"><strong>{postsHasMore ? `${posts.length}+` : posts.length}</strong><span>{t("profile.stats.posts", "Posts")}</span></div>
                    <div className="pf-stat-tile"><strong>{masjids.length}</strong><span>{t("profile.stats.masjids", "Masjids")}</span></div>
                    <div className="pf-stat-tile"><strong>{campaigns.length}</strong><span>{t("profile.stats.campaigns", "Campaigns")}</span></div>
                    <div className="pf-stat-tile"><strong>{jobs.length}</strong><span>{t("profile.stats.jobs", "Jobs")}</span></div>
                  </div>
                  {badges.length > 0 && (
                    <div className="pf-badges-row">
                      {badges.map((b) => (
                        <span key={b.key} className="pf-badge"><Icon name={b.icon} size={13} />{b.label}</span>
                      ))}
                    </div>
                  )}
                  <button type="button" ref={shareBtnRef} className="btn btn-outline-ink" style={{ width: "100%", justifyContent: "center", marginTop: 16 }} onClick={() => setShareOpen((v) => !v)}>
                    <Icon name="link" size={15} /> {t("profile.shareProfile", "Share Profile")}
                  </button>
                  <ShareMenu open={shareOpen} onClose={() => setShareOpen(false)} anchorRef={shareBtnRef} url={`${window.location.origin}/profile/${profile.username}`} title={profile.fullName} />
                </div>
              )}
              {isOwner && (
                <div className="cw-side-card cw-side-card-cta">
                  <h4>{t("communityWall.masjid.registerHeading", "Register Your Masjid")}</h4>
                  <p className="cw-side-card-sub">{t("communityWall.masjid.registerSub", "Get verified and featured on the wall.")}</p>
                  <Link to="/account/my-masjids/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                    <Icon name="plus" size={16} /> {t("communityWall.masjid.addMasjid", "Add a Masjid")}
                  </Link>
                </div>
              )}
              {isOwner && (
                <OwnedAssetList
                  title={t("communityWall.masjid.myMasjidsHeading", "My Masjids")}
                  items={masjids}
                  showAll={showAllMasjids}
                  onToggleShowAll={() => setShowAllMasjids((v) => !v)}
                  statusLabel={{
                    draft: t("masjidWizard.status.draft", "Draft"),
                    submitted: t("masjidWizard.status.submitted", "Submitted"),
                    under_review: t("masjidWizard.status.underReview", "Under Review"),
                    changes_requested: t("masjidWizard.status.changesRequested", "Changes Requested"),
                    approved: t("masjidWizard.status.approved", "Approved"),
                    rejected: t("masjidWizard.status.rejected", "Rejected"),
                    inactive: t("masjidWizard.status.inactive", "Inactive"),
                  }}
                  nameKey="name"
                  linkBase="/account/my-masjids"
                  icon="mosque"
                />
              )}

              {isOwner && (
                <div className="cw-side-card cw-side-card-cta">
                  <h4>{t("communityWall.campaign.startHeading", "Start a Campaign")}</h4>
                  <p className="cw-side-card-sub">{t("communityWall.campaign.startSub", "Raise funds for your masjid's next project.")}</p>
                  <Link to="/account/my-campaigns/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                    <Icon name="plus" size={16} /> {t("communityWall.campaign.addCampaign", "Add a Campaign")}
                  </Link>
                </div>
              )}
              <OwnedAssetList
                title={t("communityWall.campaign.myCampaignsHeading", "My Campaigns")}
                items={campaigns}
                showAll={showAllCampaigns}
                onToggleShowAll={() => setShowAllCampaigns((v) => !v)}
                statusLabel={{
                  draft: t("communityWall.status.draft", "Draft"),
                  submitted: t("communityWall.status.submitted", "Submitted"),
                  under_review: t("communityWall.status.underReview", "Under Review"),
                  changes_requested: t("communityWall.status.changesRequested", "Changes Requested"),
                  approved: t("communityWall.status.approved", "Approved"),
                  active: t("communityWall.status.active", "Active"),
                  paused: t("communityWall.status.paused", "Paused"),
                  goal_reached: t("communityWall.status.goalReached", "Goal Reached"),
                  completed: t("communityWall.status.completed", "Completed"),
                  rejected: t("communityWall.status.rejected", "Rejected"),
                  cancelled: t("communityWall.status.cancelled", "Cancelled"),
                }}
                nameKey="title"
                linkBase={isOwner ? "/account/my-campaigns" : "/campaign"}
                linkKey={isOwner ? "id" : "slug"}
                icon="flag"
              />

              {isOwner && (
                <div className="cw-side-card cw-side-card-cta">
                  <h4>{t("profile.cta.job.title", "Post a Job Opening")}</h4>
                  <p className="cw-side-card-sub">{t("profile.cta.job.sub", "Reach the community looking for their next role.")}</p>
                  <Link to="/account/my-jobs/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                    <Icon name="plus" size={16} /> {t("communityWall.jobs.addJob", "Add a Job")}
                  </Link>
                </div>
              )}
              {isOwner && (
                <OwnedAssetList
                  title={t("communityWall.jobs.myJobsHeading", "My Jobs")}
                  items={jobs}
                  showAll={showAllJobs}
                  onToggleShowAll={() => setShowAllJobs((v) => !v)}
                  statusLabel={{
                    active: t("communityWall.status.active", "Active"),
                    closed: t("communityWall.status.closed", "Closed"),
                    expired: t("communityWall.status.expired", "Expired"),
                  }}
                  nameKey="title"
                  linkBase="/account/my-jobs"
                  icon="building"
                />
              )}
            </aside>
          </div>
        </div>
      </section>
      )}


      {followModal && (
        <FollowListModal
          userId={profile.id}
          type={followModal}
          title={followModal === "followers" ? t("profile.follow.followersTitle", "Followers") : t("profile.follow.followingTitle", "Following")}
          viewer={viewer}
          onClose={() => setFollowModal(null)}
        />
      )}

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

      {imageViewer && (
        <ImageViewer
          post={imageViewer.post}
          startIndex={imageViewer.index}
          user={viewer}
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

export default Profile;
