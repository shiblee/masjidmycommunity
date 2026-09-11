import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import communityApi from "../services/communityApi.js";
import reportApi from "../services/reportApi.js";
import { getStoredUser } from "../utils/userAuthStorage.js";
import { API_ORIGIN } from "../config.js";
import { mapLiveActivity, ThumbUpIcon, CommentIcon, ShareButton } from "../components/community/CommunityPost.jsx";
import MediaThumb from "../components/MediaThumb.jsx";
import PostBodyText from "../components/PostBodyText.jsx";
import CommentSection from "../components/CommentSection.jsx";
import ReportModal from "../components/ReportModal.jsx";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const PAGE_SIZE = 10;

function ReelSlide({ post, user, navigate, onVote, onOpenComments, onReport }) {
  const { t } = useTranslation();
  const vote = (value) => {
    if (!user) { navigate("/auth"); return; }
    onVote(post.activityId, value);
  };

  return (
    <div className="reel-slide">
      <div className="reel-slide-video-wrap">
        <MediaThumb src={post.videoUrl} poster={post.videoPosterUrl} mediaType="video" videoProps={{ playsInline: true, loop: true }} />
      </div>
      <div className="reel-slide-scrim" />

      <div className="reel-slide-info">
        {post.author?.username ? (
          <Link to={`/profile/${post.author.username}`} className="reel-slide-author">
            <MediaThumb src={post.author.profilePhoto ? `${API_ORIGIN}${post.author.profilePhoto}` : null} />
            <strong>{post.author.fullName}</strong>
          </Link>
        ) : (
          <span className="reel-slide-author"><strong>{post.actor?.name || t("reels.viewer.anonymous", "Community Member")}</strong></span>
        )}
        {post.text && (
          <p className="reel-slide-caption">
            <PostBodyText text={post.text} onHashtagClick={(tag) => navigate(`/my-community?hashtag=${encodeURIComponent(tag)}`)} />
          </p>
        )}
      </div>

      <div className="reel-slide-actions">
        <button type="button" className={`reel-action-btn${post.userVote === "like" ? " active" : ""}`} onClick={() => vote("like")} aria-label="Like">
          <span className="reel-action-icon"><ThumbUpIcon /></span>
          <span className="reel-action-count">{post.likeCount}</span>
        </button>
        <button type="button" className="reel-action-btn" onClick={() => onOpenComments(post)} aria-label="Comments">
          <span className="reel-action-icon"><CommentIcon /></span>
          <span className="reel-action-count">{post.commentCount}</span>
        </button>
        <div className="reel-action-btn">
          <span className="reel-action-icon">
            <ShareButton post={post} />
          </span>
        </div>
        <button
          type="button"
          className="reel-action-btn"
          onClick={() => { if (!user) { navigate("/auth"); return; } onReport(post); }}
          aria-label={t("reels.viewer.report", "Report")}
        >
          <span className="reel-action-icon"><Icon name="flag" size={20} /></span>
        </button>
      </div>
    </div>
  );
}

function Reels() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getStoredUser();
  const scrollRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const [reels, setReels] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [contentLimits, setContentLimits] = useState({ maxCommentLength: 1000, maxReplyLength: 1000 });
  const [commentsFor, setCommentsFor] = useState(null);

  const [reportReasons, setReportReasons] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    communityApi.get("/content-settings").then(({ data }) => setContentLimits(data)).catch(() => {});
    reportApi.get("/reasons").then(({ data }) => setReportReasons(data.reasons)).catch(() => {});
  }, []);

  useEffect(() => {
    communityApi
      .get("/reels", { params: { limit: PAGE_SIZE, offset: 0 } })
      .then(({ data }) => { setReels(data.reels.map(mapLiveActivity)); setHasMore(data.hasMore); })
      .catch(() => setReels([]));
  }, []);

  const loadMore = () => {
    if (loadingMoreRef.current || !hasMore || !reels) return;
    loadingMoreRef.current = true;
    communityApi
      .get("/reels", { params: { limit: PAGE_SIZE, offset: reels.length } })
      .then(({ data }) => {
        setReels((prev) => [...prev, ...data.reels.map(mapLiveActivity)]);
        setHasMore(data.hasMore);
      })
      .finally(() => { loadingMoreRef.current = false; });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - el.clientHeight) loadMore();
  };

  const castVote = (activityId, value) => {
    const prev = reels;
    setReels((list) =>
      list.map((a) => {
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
    communityApi.post(`/activities/${activityId}/vote`, { value }).catch(() => setReels(prev));
  };

  const onCommentCountChange = (activityId, count) => {
    setReels((list) => list.map((a) => (a.activityId === activityId ? { ...a, commentCount: count } : a)));
  };

  const submitReport = async ({ reason, comment }) => {
    if (!user) { navigate("/auth"); return; }
    setReportBusy(true);
    setReportError("");
    try {
      await reportApi.post("/", { targetType: "activity", targetId: reportTarget.activityId, activityId: reportTarget.activityId, reason, comment });
      setReportSuccess(true);
    } catch (err) {
      setReportError(err.response?.data?.message || t("campaignProfile.post.reportError", "Couldn't submit this report. Please try again."));
    } finally {
      setReportBusy(false);
    }
  };

  const closeReportModal = () => { setReportTarget(null); setReportError(""); setReportSuccess(false); };

  return (
    <div className="reel-viewer">
      <button type="button" className="reel-viewer-close" onClick={() => navigate(-1)} aria-label={t("reels.viewer.close", "Close")}>
        <Icon name="x" size={20} />
      </button>

      {reels === null ? (
        <div className="reel-viewer-loading">{t("reels.rail.loading", "Loading…")}</div>
      ) : reels.length === 0 ? (
        <div className="reel-viewer-empty">
          <Icon name="play" size={30} />
          <h3>{t("reelsPage.empty.title", "No Reels yet")}</h3>
          <p>{t("reelsPage.empty.body", "Be the first to share a Reel from the Home Page feed.")}</p>
        </div>
      ) : (
        <div className="reel-viewer-scroll" ref={scrollRef} onScroll={onScroll}>
          {reels.map((post) => (
            <ReelSlide
              key={post.id}
              post={post}
              user={user}
              navigate={navigate}
              onVote={castVote}
              onOpenComments={setCommentsFor}
              onReport={setReportTarget}
            />
          ))}
        </div>
      )}

      {commentsFor && (
        <div className="reel-comments-drawer" onClick={() => setCommentsFor(null)}>
          <div className="reel-comments-panel" onClick={(e) => e.stopPropagation()}>
            <div className="reel-comments-panel-head">
              <h4>{t("reels.viewer.comments", "Comments")}</h4>
              <button type="button" className="msj-modal-close" onClick={() => setCommentsFor(null)} aria-label="Close">
                <Icon name="x" size={16} />
              </button>
            </div>
            <CommentSection
              activityId={commentsFor.activityId}
              user={user}
              navigate={navigate}
              onCountChange={(count) => onCommentCountChange(commentsFor.activityId, count)}
              commentMaxLength={contentLimits.maxCommentLength}
              replyMaxLength={contentLimits.maxReplyLength}
            />
          </div>
        </div>
      )}

      {reportTarget && (
        <ReportModal
          title={t("campaignProfile.post.reportTitle", "Report Post")}
          reasons={reportReasons}
          busy={reportBusy}
          error={reportError}
          success={reportSuccess}
          onCancel={closeReportModal}
          onSubmit={submitReport}
        />
      )}
    </div>
  );
}

export default Reels;
