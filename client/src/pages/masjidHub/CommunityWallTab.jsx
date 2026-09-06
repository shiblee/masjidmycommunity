import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import communityApi from "../../services/communityApi.js";
import reportApi from "../../services/reportApi.js";
import { getStoredUser } from "../../utils/userAuthStorage.js";
import PostComposer from "../../components/PostComposer.jsx";
import ReportModal from "../../components/ReportModal.jsx";
import ImageViewer from "../../components/ImageViewer.jsx";
import CommunityPost, { mapLiveActivity, EditCommunityPostModal, DeleteCommunityPostModal } from "../../components/community/CommunityPost.jsx";

/** Same Community Wall experience as /my-community (CommunityPost, voting,
 * comments, sharing, reporting, edit/delete) — filtered to exactly one
 * masjid's posts, both by query param here and by the server enforcing the
 * masjidId filter itself (never trusting the client alone). */
function CommunityWallTab({ masjidId, masjidName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [activities, setActivities] = useState(null);
  const [contentLimits, setContentLimits] = useState({ maxPostLength: 2000, maxCommentLength: 1000, maxReplyLength: 1000 });
  const [reportReasons, setReportReasons] = useState([]);
  const [postModal, setPostModal] = useState(null); // { type: "report"|"edit"|"delete", post }
  const [postBusy, setPostBusy] = useState(false);
  const [postError, setPostError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [imageViewer, setImageViewer] = useState(null);

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  useEffect(() => {
    communityApi.get("/content-settings").then(({ data }) => setContentLimits(data)).catch(() => {});
    reportApi.get("/reasons").then(({ data }) => setReportReasons(data.reasons)).catch(() => {});
  }, []);

  const load = () => {
    communityApi
      .get("/activities", { params: { masjidId } })
      .then(({ data }) => setActivities(data.activities.map(mapLiveActivity)))
      .catch(() => setActivities([]));
  };

  useEffect(() => { load(); }, [masjidId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addNewPost = (activity) => setActivities((acts) => [mapLiveActivity(activity), ...acts]);

  const posts = useMemo(
    () => (activities || []).map((a) => ({ ...a, ownerKind: !!user && a.type === "community_post" && a.relatedUserId === user.id ? "community_post" : null })),
    [activities, user]
  );

  const closePostModal = () => {
    setPostModal(null);
    setPostError("");
    setReportSuccess(false);
  };

  const castVote = (activityId, value) => {
    const prev = activities;
    setActivities((acts) =>
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
    communityApi.post(`/activities/${activityId}/vote`, { value }).catch(() => setActivities(prev));
  };

  const saveEdit = async ({ body }) => {
    setPostBusy(true);
    setPostError("");
    try {
      await communityApi.patch(`/posts/${postModal.post.activityId}`, { body });
      setActivities((acts) => acts.map((a) => (a.activityId === postModal.post.activityId ? { ...a, text: body } : a)));
      closePostModal();
    } catch (err) {
      setPostError(err.response?.data?.message || "Couldn't save this post. Please try again.");
    } finally {
      setPostBusy(false);
    }
  };

  const confirmDelete = async () => {
    setPostBusy(true);
    setPostError("");
    try {
      await communityApi.delete(`/posts/${postModal.post.activityId}`);
      setActivities((acts) => acts.filter((a) => a.activityId !== postModal.post.activityId));
      closePostModal();
    } catch (err) {
      setPostError(err.response?.data?.message || "Couldn't delete this post. Please try again.");
    } finally {
      setPostBusy(false);
    }
  };

  const submitReport = async ({ reason, comment }) => {
    if (!user) { navigate("/auth"); return; }
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

  const onViewerImagesChange = (images) => {
    setActivities((acts) => acts.map((a) => (a.activityId === imageViewer.post.activityId ? { ...a, images } : a)));
  };

  return (
    <div className="msj-hub-wall">
      <PostComposer user={user} onPosted={addNewPost} maxLength={contentLimits.maxPostLength} lockedMasjid={{ id: masjidId, name: masjidName }} />

      {activities === null && <p className="msj-review-empty">Loading…</p>}
      {activities && activities.length === 0 && (
        <div className="msj-hub-coming-soon">
          <span>No posts yet for {masjidName} — be the first to share something with this community.</span>
        </div>
      )}

      <div className="cw-feed">
        {posts.map((post) => (
          <CommunityPost
            key={post.id}
            post={post}
            user={user}
            navigate={navigate}
            onVote={castVote}
            onEdit={(p) => setPostModal({ type: "edit", post: p })}
            onDelete={(p) => setPostModal({ type: "delete", post: p })}
            onReport={(p) => { if (!user) { navigate("/auth"); return; } setPostModal({ type: "report", post: p }); }}
            onHashtagClick={() => {}}
            commentMaxLength={contentLimits.maxCommentLength}
            replyMaxLength={contentLimits.maxReplyLength}
            onOpenImage={(p, index) => setImageViewer({ post: p, index })}
          />
        ))}
      </div>

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

      {postModal?.type === "edit" && (
        <EditCommunityPostModal post={postModal.post} busy={postBusy} error={postError} maxLength={contentLimits.maxPostLength} onCancel={closePostModal} onSave={saveEdit} />
      )}

      {postModal?.type === "delete" && (
        <DeleteCommunityPostModal busy={postBusy} error={postError} onCancel={closePostModal} onConfirm={confirmDelete} />
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
    </div>
  );
}

export default CommunityWallTab;
