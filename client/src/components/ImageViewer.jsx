import React, { useCallback, useEffect, useState } from "react";
import communityApi from "../services/communityApi.js";
import reportApi from "../services/reportApi.js";
import { Icon } from "./Icons.jsx";
import ReportModal from "./ReportModal.jsx";
import CommentSection from "./CommentSection.jsx";

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

// The per-image lightbox — its own like/dislike/comment/report, entirely
// independent of the post's own counters, per the "image is its own
// interactive unit" model. `post` is only used for activityId context (so a
// reported image's admin record still shows which post it came from) and for
// prev/next navigation across the post's image list.
function ImageViewer({ post, startIndex, user, navigate, commentMaxLength, replyMaxLength, onClose, onImagesChange }) {
  const [index, setIndex] = useState(startIndex);
  const [images, setImages] = useState(post.images);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReasons, setReportReasons] = useState([]);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const image = images[index];

  useEffect(() => {
    reportApi.get("/reasons").then(({ data }) => setReportReasons(data.reasons)).catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(images.length - 1, i + 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  // Syncs local image state back up to the Wall feed whenever it changes —
  // an effect rather than calling onImagesChange ad hoc from every handler,
  // since onImagesChange's identity changes every Community render and
  // calling it inline would either run during React's render phase (if done
  // inside a setState updater) or reintroduce that same risk elsewhere.
  useEffect(() => {
    onImagesChange(images);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const updateImage = (patch) => {
    setImages((imgs) => imgs.map((img) => (img.id === image.id ? { ...img, ...patch } : img)));
  };

  // Stable across re-renders (only changes when the viewed image changes) so
  // CommentSection's [comments, total, onCountChange] effect doesn't refire
  // in a loop just because this component re-rendered for an unrelated reason.
  const onImageCountChange = useCallback((count) => {
    setImages((imgs) => imgs.map((img, i) => (i === index ? { ...img, commentCount: count } : img)));
  }, [index]);

  const vote = async (value) => {
    if (!user) { navigate("/auth"); return; }
    const prev = { likeCount: image.likeCount, dislikeCount: image.dislikeCount, userVote: image.userVote };
    const next = { ...prev };
    if (prev.userVote === value) {
      next[value === "like" ? "likeCount" : "dislikeCount"] -= 1;
      next.userVote = null;
    } else {
      if (prev.userVote) next[prev.userVote === "like" ? "likeCount" : "dislikeCount"] -= 1;
      next[value === "like" ? "likeCount" : "dislikeCount"] += 1;
      next.userVote = value;
    }
    updateImage(next);
    try {
      const { data } = await communityApi.post(`/images/${image.id}/vote`, { value });
      updateImage({ likeCount: data.likeCount, dislikeCount: data.dislikeCount, userVote: data.userVote });
    } catch {
      updateImage(prev);
    }
  };

  const submitReport = async ({ reason, comment }) => {
    setReportBusy(true);
    setReportError("");
    try {
      await reportApi.post("/", { targetType: "image", targetId: image.id, activityId: post.activityId, reason, comment });
      setReportSuccess(true);
    } catch (err) {
      setReportError(err.response?.data?.message || "Couldn't submit this report. Please try again.");
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <div className="img-viewer-overlay" onClick={onClose}>
      <button className="img-viewer-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>

      <div className="img-viewer-body" onClick={(e) => e.stopPropagation()}>
        <div className="img-viewer-stage">
          {index > 0 && (
            <button className="img-viewer-nav img-viewer-prev" onClick={() => setIndex((i) => i - 1)} aria-label="Previous image">
              <Icon name="chevronLeft" size={22} />
            </button>
          )}
          <img src={image.url} alt="" />
          {index < images.length - 1 && (
            <button className="img-viewer-nav img-viewer-next" onClick={() => setIndex((i) => i + 1)} aria-label="Next image">
              <Icon name="chevronRight" size={22} />
            </button>
          )}
        </div>

        <div className="img-viewer-panel">
          <div className="img-viewer-count">Image {index + 1} of {images.length}</div>

          <div className="img-viewer-actions">
            <button type="button" className={`cw-vote-btn${image.userVote === "like" ? " active" : ""}`} onClick={() => vote("like")}>
              <ThumbUpIcon /><span>{image.likeCount}</span>
            </button>
            <button type="button" className={`cw-vote-btn cw-vote-btn-down${image.userVote === "dislike" ? " active" : ""}`} onClick={() => vote("dislike")}>
              <ThumbDownIcon /><span>{image.dislikeCount}</span>
            </button>
            <button
              type="button"
              className="cw-share"
              style={{ marginLeft: "auto" }}
              onClick={() => { if (!user) { navigate("/auth"); return; } setReportOpen(true); }}
            >
              <Icon name="flag" size={15} /> Report Image
            </button>
          </div>

          <h4 className="img-viewer-comments-title">Comments on this image</h4>
          <CommentSection
            imageId={image.id}
            activityId={post.activityId}
            user={user}
            navigate={navigate}
            onCountChange={onImageCountChange}
            commentMaxLength={commentMaxLength}
            replyMaxLength={replyMaxLength}
          />
        </div>
      </div>

      {reportOpen && (
        <ReportModal
          title="Report Image"
          reasons={reportReasons}
          busy={reportBusy}
          error={reportError}
          success={reportSuccess}
          onCancel={() => setReportOpen(false)}
          onSubmit={submitReport}
        />
      )}
    </div>
  );
}

export default ImageViewer;
