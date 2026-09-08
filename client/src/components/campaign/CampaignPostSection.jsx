import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import communityApi from "../../services/communityApi.js";
import reportApi from "../../services/reportApi.js";
import { getStoredUser } from "../../utils/userAuthStorage.js";
import ReportModal from "../ReportModal.jsx";
import ImageViewer from "../ImageViewer.jsx";
import CommunityPost, { mapLiveActivity } from "../community/CommunityPost.jsx";

// The campaign IS a Community Wall post — the "campaign_approved" activity
// created once, at approval time (recordCampaignApprovedActivity, called
// from adminCampaignController.js's approve()). This mounts that exact same
// CommunityPost component the Wall itself uses, fetched by campaignId from
// the same /community/activities endpoint (publicCommunityController.js),
// so likes/dislikes/comments/replies live on the one shared activityId —
// there is no separate campaign-detail-page copy of this data to drift out
// of sync. A campaign approved before this system existed (or whose
// activity failed to record) simply has no post to show, so this renders
// nothing rather than fabricating one.
function CampaignPostSection({ campaignId }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [post, setPost] = useState(undefined); // undefined = loading, null = none found
  const [contentLimits, setContentLimits] = useState({ maxCommentLength: 1000, maxReplyLength: 1000 });
  const [reportReasons, setReportReasons] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [imageViewerIndex, setImageViewerIndex] = useState(null);

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  useEffect(() => {
    communityApi.get("/content-settings").then(({ data }) => setContentLimits(data)).catch(() => {});
    reportApi.get("/reasons").then(({ data }) => setReportReasons(data.reasons)).catch(() => {});
  }, []);

  useEffect(() => {
    communityApi
      .get("/activities", { params: { campaignId } })
      .then(({ data }) => {
        const approved = data.activities.find((a) => a.type === "campaign_approved");
        setPost(approved ? mapLiveActivity(approved) : null);
      })
      .catch(() => setPost(null));
  }, [campaignId]);

  const castVote = (activityId, value) => {
    setPost((p) => {
      if (!p || p.activityId !== activityId) return p;
      const next = { ...p };
      if (p.userVote === value) {
        next[value === "like" ? "likeCount" : "dislikeCount"] -= 1;
        next.userVote = null;
      } else {
        if (p.userVote) next[p.userVote === "like" ? "likeCount" : "dislikeCount"] -= 1;
        next[value === "like" ? "likeCount" : "dislikeCount"] += 1;
        next.userVote = value;
      }
      return next;
    });
    communityApi.post(`/activities/${activityId}/vote`, { value }).catch(() => {
      communityApi
        .get("/activities", { params: { campaignId } })
        .then(({ data }) => {
          const approved = data.activities.find((a) => a.type === "campaign_approved");
          setPost(approved ? mapLiveActivity(approved) : null);
        })
        .catch(() => {});
    });
  };

  const openReport = () => {
    if (!user) { navigate("/auth"); return; }
    setReportOpen(true);
  };
  const closeReport = () => {
    setReportOpen(false);
    setReportError("");
    setReportSuccess(false);
  };
  const submitReport = async ({ reason, comment }) => {
    setReportBusy(true);
    setReportError("");
    try {
      await reportApi.post("/", { targetType: "campaign", targetId: post.relatedCampaignId, activityId: post.activityId, reason, comment });
      setReportSuccess(true);
    } catch (err) {
      setReportError(err.response?.data?.message || "Couldn't submit this report. Please try again.");
    } finally {
      setReportBusy(false);
    }
  };

  if (!post) return null;

  return (
    <div className="camp-post-section">
      <CommunityPost
        post={post}
        user={user}
        navigate={navigate}
        onVote={castVote}
        onEdit={() => {}}
        onDelete={() => {}}
        onReport={openReport}
        onHashtagClick={() => {}}
        commentMaxLength={contentLimits.maxCommentLength}
        replyMaxLength={contentLimits.maxReplyLength}
        onOpenImage={(_p, index) => setImageViewerIndex(index)}
      />

      {reportOpen && (
        <ReportModal
          title="Report Post"
          reasons={reportReasons}
          busy={reportBusy}
          error={reportError}
          success={reportSuccess}
          onCancel={closeReport}
          onSubmit={submitReport}
        />
      )}

      {imageViewerIndex !== null && (
        <ImageViewer
          post={post}
          startIndex={imageViewerIndex}
          user={user}
          navigate={navigate}
          commentMaxLength={contentLimits.maxCommentLength}
          replyMaxLength={contentLimits.maxReplyLength}
          onClose={() => setImageViewerIndex(null)}
          onImagesChange={(images) => setPost((p) => ({ ...p, images }))}
        />
      )}
    </div>
  );
}

export default CampaignPostSection;
