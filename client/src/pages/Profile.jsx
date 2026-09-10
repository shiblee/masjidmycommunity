import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import userApi from "../services/userApi.js";
import communityApi from "../services/communityApi.js";
import publicMasjidApi from "../services/publicMasjidApi.js";
import { updateStoredUser, getStoredUser } from "../utils/userAuthStorage.js";
import { API_ORIGIN } from "../config.js";
import ProfilePhotoCard from "../components/profile/ProfilePhotoCard.jsx";
import PersonalDetailsCard from "../components/profile/PersonalDetailsCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import WorkExperienceCard from "../components/profile/WorkExperienceCard.jsx";
import SkillsCard from "../components/profile/SkillsCard.jsx";
import HobbiesCard from "../components/profile/HobbiesCard.jsx";
import SecurityCard from "../components/profile/SecurityCard.jsx";
import ProfileCompletion from "../components/profile/ProfileCompletion.jsx";
import MediaThumb from "../components/MediaThumb.jsx";
import ShareMenu from "../components/ShareMenu.jsx";
import MasjidPickerModal from "../components/MasjidPickerModal.jsx";
import SalahTracker from "../components/profile/SalahTracker.jsx";

const SIDE_LIST_PREVIEW_COUNT = 3;
const POSTS_PAGE_SIZE = 10;

const TAB_KEYS = ["about", "primary-masjid", "masjid", "jobs"];

const MASJID_STATUS_LABEL_KEYS = {
  draft: ["masjidWizard.status.draft", "Draft"],
  submitted: ["masjidWizard.status.submitted", "Submitted"],
  under_review: ["masjidWizard.status.underReview", "Under Review"],
  changes_requested: ["masjidWizard.status.changesRequested", "Changes Requested"],
  approved: ["masjidWizard.status.approved", "Approved"],
  rejected: ["masjidWizard.status.rejected", "Rejected"],
  inactive: ["masjidWizard.status.inactive", "Inactive"],
};
const CAMPAIGN_STATUS_LABEL_KEYS = {
  draft: ["communityWall.status.draft", "Draft"],
  submitted: ["communityWall.status.submitted", "Submitted"],
  under_review: ["communityWall.status.underReview", "Under Review"],
  changes_requested: ["communityWall.status.changesRequested", "Changes Requested"],
  approved: ["communityWall.status.approved", "Approved"],
  active: ["communityWall.status.active", "Active"],
  paused: ["communityWall.status.paused", "Paused"],
  goal_reached: ["communityWall.status.goalReached", "Goal Reached"],
  completed: ["communityWall.status.completed", "Completed"],
  rejected: ["communityWall.status.rejected", "Rejected"],
  cancelled: ["communityWall.status.cancelled", "Cancelled"],
};
const JOB_STATUS_LABEL_KEYS = {
  active: ["communityWall.status.active", "Active"],
  closed: ["communityWall.status.closed", "Closed"],
  expired: ["communityWall.status.expired", "Expired"],
};

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

function OwnedAssetList({ title, items, showAll, onToggleShowAll, statusLabelKeys, nameKey, linkBase, linkKey = "id", icon }) {
  const { t } = useTranslation();
  if (!items || items.length === 0) return null;
  const visible = showAll ? items : items.slice(0, SIDE_LIST_PREVIEW_COUNT);
  return (
    <div className="cw-side-card">
      <h4>{title}</h4>
      <ul className="cw-side-list cw-side-my-masjids">
        {visible.map((item) => {
          const statusLabel = statusLabelKeys[item.status];
          return (
            <li key={item.id}>
              <Link to={`${linkBase}/${item[linkKey]}`} className="cw-my-masjid-item">
                <span className="cw-my-masjid-thumb"><Icon name={icon} size={18} /></span>
                <span className="cw-my-masjid-body">
                  <span className="cw-my-masjid-name">{item[nameKey]}</span>
                  <span className={`acct-status-pill ${item.status}`}>{statusLabel ? t(statusLabel[0], statusLabel[1]) : item.status}</span>
                </span>
                <span className="cw-my-masjid-time">{timeAgo(item.createdAt, t)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {items.length > SIDE_LIST_PREVIEW_COUNT && (
        <button type="button" className="cw-side-link" onClick={onToggleShowAll}>
          {showAll ? t("communityWall.sideList.showLess", "Show less") : t("communityWall.sideList.viewAll", "View All ({count})").replace("{count}", items.length)} <span className="btn-arrow">{showAll ? "↑" : "→"}</span>
        </button>
      )}
    </div>
  );
}

function PrimaryMasjidPanel({ profile, isOwner, onChanged }) {
  const { t } = useTranslation();
  const [roster, setRoster] = useState(null);
  const [rosterError, setRosterError] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const masjid = profile.primaryMasjid;

  useEffect(() => {
    // Owners get the interactive SalahTracker below instead, which fetches
    // its own day data — this read-only roster is only needed for viewers.
    if (!masjid || isOwner) return;
    setRoster(null);
    setRosterError(false);
    publicMasjidApi
      .get(`/${masjid.id}/prayer-times`)
      .then(({ data }) => setRoster(data.roster || []))
      .catch(() => setRosterError(true));
  }, [masjid?.id, isOwner]);

  return (
    <div className="pf-pm-tab">
      {masjid ? (
        <>
          <div className="pf-pm-header">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="pf-pm-header-thumb" />
            <div className="pf-pm-header-body">
              <h3>{masjid.name}</h3>
              <span><Icon name="mapPin" size={13} />{[masjid.city, masjid.country].filter(Boolean).join(", ") || masjid.formattedAddress}</span>
            </div>
            <div className="pf-pm-header-actions">
              <Link to={`/masjid/${masjid.id}`} className="btn btn-outline-ink">{t("profile.pm.viewMasjid", "View Masjid")}</Link>
              {isOwner && (
                <button type="button" className="btn btn-gold" onClick={() => setPickerOpen(true)}>
                  {t("profile.pm.change", "Change Primary Masjid")}
                </button>
              )}
            </div>
          </div>

          {isOwner ? (
            <SalahTracker />
          ) : (
            <div className="pf-pm-prayer">
              <h4><Icon name="clock" size={16} /> {t("prayer.rosterHeading", "Today's Prayer Times")}</h4>
              {rosterError ? (
                <p className="msj-note">{t("profile.pm.noRoster", "This masjid hasn't published its prayer times yet.")}</p>
              ) : roster === null ? (
                <p className="msj-note">{t("masjidWizard.loading", "Loading…")}</p>
              ) : roster.length === 0 ? (
                <p className="msj-note">{t("profile.pm.noRoster", "This masjid hasn't published its prayer times yet.")}</p>
              ) : (
                <div className="msj-review-prayer-grid">
                  {roster.map((p) => (
                    <div className="msj-review-prayer-card" key={p.prayerId}>
                      <span className="msj-review-prayer-name">{t(`prayer.${p.name.toLowerCase()}`, p.name)}</span>
                      <span className="msj-review-prayer-time">{p.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : isOwner ? (
        <div className="cw-side-card pf-pm-empty" style={{ textAlign: "center" }}>
          <Icon name="mosque" size={26} />
          <h4>{t("profile.pm.emptyTitle", "No Primary Masjid selected yet")}</h4>
          <p className="cw-side-card-sub">{t("profile.pm.emptyBody", "Pick the masjid closest to you or the one you regularly visit.")}</p>
          <button type="button" className="btn btn-gold" onClick={() => setPickerOpen(true)}>{t("profile.pm.selectOne", "Select One")}</button>
        </div>
      ) : (
        <div className="cw-side-card" style={{ textAlign: "center" }}>
          <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
            {t("profile.pm.noneOther", "{name} hasn't set a Primary Masjid yet.").replace("{name}", profile.fullName)}
          </p>
        </div>
      )}

      {pickerOpen && (
        <MasjidPickerModal
          title={t("profile.pm.changeTitle", "Change Primary Masjid")}
          onClose={() => setPickerOpen(false)}
          onSelected={(newMasjid) => {
            setPickerOpen(false);
            onChanged(newMasjid);
          }}
        />
      )}
    </div>
  );
}

function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username, tab: tabParam } = useParams();
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
  const [shareOpen, setShareOpen] = useState(false);
  const shareBtnRef = useRef(null);
  const activeTab = TAB_KEYS.includes(tabParam) ? tabParam : "about";

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

  const handlePrimaryMasjidChanged = (masjid) => {
    setProfile((p) => ({ ...p, primaryMasjidId: masjid.id, primaryMasjid: masjid }));
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

  const badges = [
    masjids.length > 0 && { key: "masjidOwner", icon: "mosque", label: t("profile.badge.masjidOwner", "Masjid Owner") },
    jobs.length > 0 && { key: "jobPoster", icon: "briefcase", label: t("profile.badge.jobPoster", "Job Poster") },
    campaigns.length > 0 && { key: "campaignOrganizer", icon: "flag", label: t("profile.badge.campaignOrganizer", "Campaign Organizer") },
    profile.verified && { key: "verifiedMember", icon: "shieldCheck", label: t("profile.badge.verifiedMember", "Verified Member") },
  ].filter(Boolean);

  const setTab = (key) => navigate(key === "about" ? `/profile/${username}` : `/profile/${username}/${key}`);

  const TABS = [
    { key: "about", label: t("profile.tabs.about", "About") },
    { key: "primary-masjid", label: t("profile.tabs.primaryMasjid", "Primary Masjid") },
    { key: "masjid", label: t("profile.tabs.masjid", "Masjid") },
    { key: "jobs", label: t("profile.tabs.jobs", "Jobs") },
  ];

  return (
    <main className="cw-page">
      <section className="py-sm">
        <div className="wrap">
          <div className="pf-profile-header">
            <div className="pf-profile-header-avatar">
              {isOwner ? (
                <ProfilePhotoCard user={profile} onUserUpdated={handleUserUpdated} />
              ) : profile.profilePhoto ? (
                <div className="profile-avatar-wrap"><img className="profile-avatar-img" src={`${API_ORIGIN}${profile.profilePhoto}`} alt={profile.fullName} /></div>
              ) : (
                <div className="profile-avatar-wrap"><div className="acct-avatar profile-avatar-fallback">{initialsOf(profile.fullName)}</div></div>
              )}
            </div>
            <div className="pf-profile-header-info">
              <h1>{profile.fullName}</h1>
              <p className="pf-profile-header-username">@{profile.username}</p>
              {profile.bio && <p className="pf-profile-header-bio">{profile.bio}</p>}
              {profile.locationLabel && <span className="pf-profile-header-location"><Icon name="mapPin" size={14} />{profile.locationLabel}</span>}
            </div>
          </div>
        </div>
      </section>

      <div className="msj-hub-tabs-bar">
        <div className="wrap msj-hub-tabs">
          {TABS.map((tabDef) => (
            <button key={tabDef.key} type="button" className={activeTab === tabDef.key ? "active" : ""} onClick={() => setTab(tabDef.key)}>{tabDef.label}</button>
          ))}
        </div>
      </div>

      <section className="py-md">
        <div className="wrap">
          {activeTab === "about" && (
            <div className="cw-layout">
              <aside className="cw-side">
                {isOwner && <div className="cw-side-card"><ProfileCompletion user={profile} /></div>}
                <PersonalDetailsCard user={profile} mode={mode} onUserUpdated={handleUserUpdated} />
                <EducationCard mode={mode} entries={education} />
                <WorkExperienceCard mode={mode} entries={workExperience} />
                <SkillsCard mode={mode} entries={skills} />
                <HobbiesCard mode={mode} entries={hobbies} />
                {isOwner && (
                  <div className="cw-side-card">
                    <h4>{t("profile.nav.security.label", "Security")}</h4>
                    <SecurityCard />
                  </div>
                )}
              </aside>

              <div className="cw-main">
                {postsLoading && posts.length === 0 ? (
                  <p className="msj-note">{t("profile.posts.loading", "Loading posts…")}</p>
                ) : posts.length === 0 ? (
                  <div className="cw-side-card" style={{ textAlign: "center" }}>
                    <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
                      {isOwner
                        ? t("profile.posts.emptyOwner", "You haven't shared anything on the Community Wall yet.")
                        : t("profile.posts.empty", "{name} hasn't shared anything on the Community Wall yet.").replace("{name}", profile.fullName)}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
              </div>

              <aside className="cw-side">
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
                  statusLabelKeys={CAMPAIGN_STATUS_LABEL_KEYS}
                  nameKey="title"
                  linkBase={isOwner ? "/account/my-campaigns" : "/campaign"}
                  linkKey={isOwner ? "id" : "slug"}
                  icon="flag"
                />
              </aside>
            </div>
          )}

          {activeTab === "primary-masjid" && (
            <PrimaryMasjidPanel profile={profile} isOwner={isOwner} onChanged={handlePrimaryMasjidChanged} />
          )}

          {activeTab === "masjid" && (
            <div className="pf-single-col">
              {isOwner && (
                <div className="cw-side-card cw-side-card-cta">
                  <h4>{t("communityWall.masjid.registerHeading", "Register Your Masjid")}</h4>
                  <p className="cw-side-card-sub">{t("communityWall.masjid.registerSub", "Get verified and featured on the wall.")}</p>
                  <Link to="/account/my-masjids/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                    <Icon name="plus" size={16} /> {t("communityWall.masjid.addMasjid", "Add a Masjid")}
                  </Link>
                </div>
              )}
              {masjids.length === 0 ? (
                <div className="cw-side-card" style={{ textAlign: "center" }}>
                  <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
                    {isOwner
                      ? t("profile.masjidTab.emptyOwner", "You haven't added any masjids yet.")
                      : t("profile.masjidTab.emptyOther", "{name} hasn't added any masjids yet.").replace("{name}", profile.fullName)}
                  </p>
                </div>
              ) : (
                <OwnedAssetList
                  title={t("communityWall.masjid.myMasjidsHeading", "My Masjids")}
                  items={masjids}
                  showAll={showAllMasjids}
                  onToggleShowAll={() => setShowAllMasjids((v) => !v)}
                  statusLabelKeys={MASJID_STATUS_LABEL_KEYS}
                  nameKey="name"
                  linkBase={isOwner ? "/account/my-masjids" : "/masjid"}
                  icon="mosque"
                />
              )}
            </div>
          )}

          {activeTab === "jobs" && (
            <div className="pf-single-col">
              {isOwner && (
                <div className="cw-side-card cw-side-card-cta">
                  <h4>{t("profile.cta.job.title", "Post a Job Opening")}</h4>
                  <p className="cw-side-card-sub">{t("profile.cta.job.sub", "Reach the community looking for their next role.")}</p>
                  <Link to="/account/my-jobs/new" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }}>
                    <Icon name="plus" size={16} /> {t("communityWall.jobs.addJob", "Add a Job")}
                  </Link>
                </div>
              )}
              {jobs.length === 0 ? (
                <div className="cw-side-card" style={{ textAlign: "center" }}>
                  <p className="cw-side-card-sub" style={{ marginBottom: 0 }}>
                    {isOwner
                      ? t("profile.jobsTab.emptyOwner", "You haven't posted any jobs yet.")
                      : t("profile.jobsTab.emptyOther", "{name} hasn't posted any jobs yet.").replace("{name}", profile.fullName)}
                  </p>
                </div>
              ) : (
                <OwnedAssetList
                  title={t("communityWall.jobs.myJobsHeading", "My Jobs")}
                  items={jobs}
                  showAll={showAllJobs}
                  onToggleShowAll={() => setShowAllJobs((v) => !v)}
                  statusLabelKeys={JOB_STATUS_LABEL_KEYS}
                  nameKey="title"
                  linkBase={isOwner ? "/account/my-jobs" : "/job"}
                  linkKey={isOwner ? "id" : "slug"}
                  icon="building"
                />
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Profile;
