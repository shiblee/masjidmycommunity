import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import communityApi from "../services/communityApi.js";
import reportApi from "../services/reportApi.js";
import { getStoredUser } from "../utils/userAuthStorage.js";
import CommunityPost, { mapLiveActivity } from "../components/community/CommunityPost.jsx";
import ReportModal from "../components/ReportModal.jsx";
import { Icon } from "../components/Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

const PAGE_SIZE = 10;

function Reels() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = getStoredUser();

  const [reels, setReels] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [contentLimits, setContentLimits] = useState({ maxCommentLength: 1000, maxReplyLength: 1000 });

  useEffect(() => {
    communityApi.get("/content-settings").then(({ data }) => setContentLimits(data)).catch(() => {});
  }, []);

  const [reportReasons, setReportReasons] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    reportApi.get("/reasons").then(({ data }) => setReportReasons(data.reasons)).catch(() => {});
  }, []);

  useEffect(() => {
    communityApi
      .get("/reels", { params: { limit: PAGE_SIZE, offset: 0 } })
      .then(({ data }) => { setReels(data.reels.map(mapLiveActivity)); setHasMore(data.hasMore); })
      .catch(() => setReels([]));
  }, []);

  const loadMore = () => {
    setLoadingMore(true);
    communityApi
      .get("/reels", { params: { limit: PAGE_SIZE, offset: reels.length } })
      .then(({ data }) => {
        setReels((prev) => [...prev, ...data.reels.map(mapLiveActivity)]);
        setHasMore(data.hasMore);
      })
      .finally(() => setLoadingMore(false));
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
    <main className="msj-page">
      <section className="cw-hero msj-explore-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">{t("reels.rail.heading", "Reels")}</span>
          <h1>{t("reelsPage.hero.title", "Reels from the community")}</h1>
          <p>{t("reelsPage.hero.intro", "Short videos shared by members of Masjid My Community.")}</p>
        </div>
      </section>

      <section className="py-md">
        <div className="wrap" style={{ maxWidth: 640 }}>
          {reels === null ? (
            <p className="msj-note">{t("reels.rail.loading", "Loading…")}</p>
          ) : reels.length === 0 ? (
            <div className="msj-empty-state">
              <Icon name="play" size={30} />
              <h3>{t("reelsPage.empty.title", "No Reels yet")}</h3>
              <p>{t("reelsPage.empty.body", "Be the first to share a Reel from the Home Page feed.")}</p>
            </div>
          ) : (
            <>
              <div className="cw-feed">
                {reels.map((post) => (
                  <CommunityPost
                    key={post.id}
                    post={post}
                    user={user}
                    navigate={navigate}
                    onVote={castVote}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onReport={(p) => {
                      if (!user) { navigate("/auth"); return; }
                      setReportTarget(p);
                    }}
                    onHashtagClick={(tag) => navigate(`/my-community?hashtag=${encodeURIComponent(tag)}`)}
                    onOpenImage={() => {}}
                    commentMaxLength={contentLimits.maxCommentLength}
                    replyMaxLength={contentLimits.maxReplyLength}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="msj-load-more">
                  <button type="button" className="btn btn-outline-ink" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? t("exploreMasjidsPage.loading", "Loading…") : t("exploreMasjidsPage.loadMore", "Load More")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

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
    </main>
  );
}

export default Reels;
