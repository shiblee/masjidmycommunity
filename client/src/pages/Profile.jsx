import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import userApi from "../services/userApi.js";
import communityApi from "../services/communityApi.js";
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
import MediaThumb from "../components/MediaThumb.jsx";

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

function ProfilePostCard({ post, fallbackAuthor }) {
  const { t } = useTranslation();
  const authorName = post.author?.fullName || fallbackAuthor?.fullName || "";
  return (
    <article className="cw-post">
      <div className="cw-post-head">
        {fallbackAuthor?.profilePhoto ? (
          <img className="cw-composer-avatar cw-composer-avatar-photo" src={`${API_ORIGIN}${fallbackAuthor.profilePhoto}`} alt={authorName} />
        ) : (
          <div className="cw-composer-avatar">{initialsOf(authorName)}</div>
        )}
        <div className="cw-post-headtext">
          <div className="cw-post-name">{authorName}</div>
          <div className="cw-post-meta">{timeAgo(post.publishedAt || post.createdAt, t)}</div>
        </div>
      </div>

      {post.body && <p className="cw-post-text">{post.body}</p>}

      {post.images?.length > 0 && (
        <div className="cw-composer-media-grid">
          {post.images.slice(0, 4).map((img) => (
            <div className="cw-composer-media-item" key={img.id || img.url}>
              <img src={`${API_ORIGIN}${img.url}`} alt="" />
            </div>
          ))}
        </div>
      )}

      {post.mediaVideoUrl && (
        <div className="cw-post-media cw-post-video">
          <MediaThumb
            src={`${API_ORIGIN}${post.mediaVideoUrl}`}
            poster={post.mediaVideoPosterUrl ? `${API_ORIGIN}${post.mediaVideoPosterUrl}` : undefined}
            mediaType="video"
            videoProps={{ controls: true }}
          />
        </div>
      )}

      <div className="cw-post-actions">
        <div className="cw-post-secondary-actions">
          <span className="cw-comment-toggle" style={{ cursor: "default" }}>
            <Icon name="heart" size={15} /> {post.likeCount || 0}
          </span>
          <span className="cw-comment-toggle" style={{ cursor: "default" }}>
            {post.commentCount || 0} {post.commentCount === 1 ? t("profile.post.commentSingular", "Comment") : t("profile.post.commentPlural", "Comments")}
          </span>
        </div>
      </div>
    </article>
  );
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

function Profile() {
  const { t } = useTranslation();
  const { username, tab: section } = useParams();
  const viewer = getStoredUser();

  const [profile, setProfile] = useState(null);
  const [education, setEducation] = useState([]);
  const [workExperience, setWorkExperience] = useState([]);
  const [skills, setSkills] = useState([]);
  const [hobbies, setHobbies] = useState([]);
  const [masjids, setMasjids] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [posts, setPosts] = useState([]);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAllMasjids, setShowAllMasjids] = useState(false);
  const [showAllCampaigns, setShowAllCampaigns] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [contentLimits, setContentLimits] = useState({ maxPostLength: 2000 });
  const activeSection = PROFILE_NAV_KEYS.includes(section) ? section : "wall";

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    userApi
      .get(`/public/${username}`)
      .then(({ data }) => {
        setProfile(data.user);
        setEducation(data.education);
        setWorkExperience(data.workExperience);
        setSkills(data.skills);
        setHobbies(data.hobbies);
        setMasjids(data.masjids);
        setCampaigns(data.campaigns);
        setJobs(data.jobs);
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
  }, []);

  useEffect(() => {
    if (!profile) return;
    setPostsLoading(true);
    communityApi
      .get("/activities", { params: { userId: profile.id, limit: POSTS_PAGE_SIZE } })
      .then(({ data }) => {
        setPosts(data.activities);
        setPostsHasMore(!!data.hasMore);
      })
      .finally(() => setPostsLoading(false));
  }, [profile?.id]);

  const handlePostCreated = () => {
    setPostsLoading(true);
    communityApi
      .get("/activities", { params: { userId: profile.id, limit: POSTS_PAGE_SIZE } })
      .then(({ data }) => {
        setPosts(data.activities);
        setPostsHasMore(!!data.hasMore);
      })
      .finally(() => setPostsLoading(false));
  };

  const loadMorePosts = () => {
    setPostsLoading(true);
    communityApi
      .get("/activities", { params: { userId: profile.id, limit: POSTS_PAGE_SIZE, offset: posts.length } })
      .then(({ data }) => {
        setPosts((p) => [...p, ...data.activities]);
        setPostsHasMore(!!data.hasMore);
      })
      .finally(() => setPostsLoading(false));
  };

  const handleUserUpdated = (updatedUser) => {
    setProfile((p) => ({ ...p, ...updatedUser }));
    if (viewer) updateStoredUser({ ...viewer, ...updatedUser });
  };


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

  return (
    <main className="cw-page">
      <section className="py-sm">
        <div className="wrap">
          <div className="cw-layout">
            <aside className="cw-side">
              <div className="cw-side-card" style={{ textAlign: "center" }}>
                {isOwner ? (
                  <ProfilePhotoCard user={profile} onUserUpdated={handleUserUpdated} />
                ) : profile.profilePhoto ? (
                  <div className="profile-avatar-wrap"><img className="profile-avatar-img" src={`${API_ORIGIN}${profile.profilePhoto}`} alt={profile.fullName} /></div>
                ) : (
                  <div className="profile-avatar-wrap"><div className="acct-avatar profile-avatar-fallback">{initialsOf(profile.fullName)}</div></div>
                )}
                <h3 style={{ marginTop: 14, marginBottom: 2 }}>{profile.fullName}</h3>
                <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>@{profile.username}</p>
              </div>

              {isOwner ? (
                <>
                  <div className="cw-side-card pf-nav-card">
                    <nav className="pf-section-nav">
                      {PROFILE_NAV_SECTIONS.map((s) => (
                        <Link
                          key={s.key}
                          to={s.key === "personal" ? `/profile/${username}` : `/profile/${username}/${s.key}`}
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
                <>
                  <PersonalDetailsCard user={profile} mode={mode} onUserUpdated={handleUserUpdated} />
                  <EducationCard mode={mode} entries={education} />
                  <WorkExperienceCard mode={mode} entries={workExperience} />
                  <SkillsCard mode={mode} entries={skills} />
                  <HobbiesCard mode={mode} entries={hobbies} />
                </>
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
                            <ProfilePostCard key={post.id} post={post} fallbackAuthor={profile} />
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
                    <ProfilePostCard key={post.id} post={post} fallbackAuthor={profile} />
                  ))}
                </div>
              )}

              {!isOwner && postsHasMore && (
                <button type="button" className="btn btn-outline-ink" style={{ marginTop: 20 }} disabled={postsLoading} onClick={loadMorePosts}>
                  {postsLoading ? t("masjidWizard.loading", "Loading…") : t("profile.posts.loadMore", "Load more posts")}
                </button>
              )}
            </div>

            <aside className="cw-side">
              {isOwner && (
                <div className="cw-side-card cw-side-card-cta">
                  <h4>{t("communityWall.masjid.registerHeading", "Register Your Masjid")}</h4>
                  <p className="cw-side-card-sub">{t("communityWall.masjid.registerSub", "Get verified and featured on the wall.")}</p>
                  <Link to="/account/my-masjids/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                    <Icon name="plus" size={16} /> {t("communityWall.masjid.addMasjid", "Add a Masjid")}
                  </Link>
                </div>
              )}
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
                linkBase={isOwner ? "/account/my-masjids" : "/masjid"}
                icon="mosque"
              />

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
                linkBase={isOwner ? "/account/my-jobs" : "/job"}
                linkKey={isOwner ? "id" : "slug"}
                icon="building"
              />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Profile;
