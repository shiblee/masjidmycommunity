import React, { useEffect, useMemo, useState } from "react";
import communityApi from "../services/communityApi.js";
import reportApi from "../services/reportApi.js";
import { Icon } from "./Icons.jsx";
import ReportModal from "./ReportModal.jsx";
import MentionTextarea from "./MentionTextarea.jsx";
import PostBodyText from "./PostBodyText.jsx";

const TOP_LEVEL_PAGE = 10;
const REPLY_PREVIEW = 3;
// Indentation stops growing past this depth so a very long reply chain
// doesn't run the thread off the right edge of the screen — the data model
// itself has no depth limit, this is purely a rendering choice.
const MAX_VISUAL_DEPTH = 6;

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

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

function CommentVoteButtons({ comment, requireAuth, onVote }) {
  const vote = (value) => {
    if (!requireAuth()) return;
    onVote(comment.id, value);
  };
  return (
    <div className="cmt-vote-group">
      <button type="button" className={`cmt-vote-btn${comment.userVote === "like" ? " active" : ""}`} onClick={() => vote("like")} aria-label="Like this comment">
        <ThumbUpIcon />
        {comment.likeCount > 0 && <span>{comment.likeCount}</span>}
      </button>
      <button type="button" className={`cmt-vote-btn cmt-vote-btn-down${comment.userVote === "dislike" ? " active" : ""}`} onClick={() => vote("dislike")} aria-label="Dislike this comment">
        <ThumbDownIcon />
        {comment.dislikeCount > 0 && <span>{comment.dislikeCount}</span>}
      </button>
    </div>
  );
}

function CommentComposer({ placeholder, autoFocus, busy, value, onChange, onSubmit, onCancel, submitLabel, maxLength }) {
  const overLimit = maxLength != null && value.length > maxLength;
  return (
    <div className="cmt-composer">
      <MentionTextarea
        rows={2}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit();
        }}
      />
      <div className="cmt-composer-actions">
        {onCancel && (
          <button type="button" className="cmt-btn-text" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
        <button type="button" className="cmt-btn-post" onClick={onSubmit} disabled={busy || !value.trim() || overLimit}>
          {busy ? "Posting…" : submitLabel || "Post"}
        </button>
      </div>
    </div>
  );
}

function CommentNode({ comment, childrenMap, depth, basePath, user, navigate, mutate, onReport, commentMaxLength, replyMaxLength }) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body || "");
  const [editBusy, setEditBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const kids = childrenMap.get(comment.id) || [];
  const visibleKids = showAllReplies ? kids : kids.slice(0, REPLY_PREVIEW);
  const hiddenCount = kids.length - visibleKids.length;
  const isDeleted = comment.status === "deleted";
  const visualDepth = Math.min(depth, MAX_VISUAL_DEPTH);
  // A comment's own level (top-level vs. reply) never changes on edit — a
  // reply stays subject to the reply limit even when you edit it later.
  const ownMaxLength = comment.parentId ? replyMaxLength : commentMaxLength;
  const editOverLimit = editText.length > ownMaxLength;

  const requireAuth = () => {
    if (!user) {
      navigate("/auth");
      return false;
    }
    return true;
  };

  const submitReply = async () => {
    if (!requireAuth() || !replyText.trim()) return;
    setReplyBusy(true);
    try {
      const { data } = await communityApi.post(`${basePath}/comments`, {
        parentId: comment.id,
        body: replyText.trim(),
      });
      mutate.add(data.comment);
      setReplyText("");
      setReplying(false);
      setShowAllReplies(true);
    } catch (err) {
      mutate.toast(err.response?.data?.message || "Couldn't post your reply. Please try again.");
    } finally {
      setReplyBusy(false);
    }
  };

  const submitEdit = async () => {
    if (!editText.trim()) return;
    setEditBusy(true);
    try {
      const { data } = await communityApi.patch(`${basePath}/comments/${comment.id}`, { body: editText.trim() });
      mutate.update(comment.id, { body: data.comment.body, updatedAt: data.comment.updatedAt, edited: true });
      setEditing(false);
    } catch (err) {
      mutate.toast(err.response?.data?.message || "Couldn't save your changes. Please try again.");
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDeleteNow = async () => {
    setDeleteBusy(true);
    try {
      await communityApi.delete(`${basePath}/comments/${comment.id}`);
      mutate.update(comment.id, { status: "deleted", body: null });
      setConfirmDelete(false);
    } catch (err) {
      mutate.toast(err.response?.data?.message || "Couldn't delete this comment. Please try again.");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="cmt-node" style={{ marginLeft: visualDepth ? 28 : 0 }}>
      <div className="cmt-row">
        <div className="cmt-avatar">{initialsOf(comment.author?.fullName)}</div>
        <div className="cmt-body-wrap">
          <div className="cmt-bubble">
            <div className="cmt-author">{comment.author?.fullName || "Deleted User"}</div>
            {editing ? (
              <div className="cmt-edit-box">
                <MentionTextarea rows={2} value={editText} onChange={setEditText} autoFocus />
                <div className="cmt-composer-actions">
                  <button type="button" className="cmt-btn-text" onClick={() => { setEditing(false); setEditText(comment.body || ""); }} disabled={editBusy}>
                    Cancel
                  </button>
                  <button type="button" className="cmt-btn-post" onClick={submitEdit} disabled={editBusy || !editText.trim() || editOverLimit}>
                    {editBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <p className={`cmt-text${isDeleted ? " cmt-text-deleted" : ""}`}>
                {isDeleted ? "[Comment deleted]" : <PostBodyText text={comment.body} />}
              </p>
            )}
          </div>

          {!editing && (
            <div className="cmt-meta-row">
              <span className="cmt-time">{timeAgo(comment.createdAt)}{comment.edited ? " · Edited" : ""}</span>
              {!isDeleted && <CommentVoteButtons comment={comment} requireAuth={requireAuth} onVote={mutate.vote} />}
              {!isDeleted && (
                <button type="button" className="cmt-action" onClick={() => { if (requireAuth()) setReplying((r) => !r); }}>
                  Reply
                </button>
              )}
              {!isDeleted && comment.isOwner && (
                <>
                  <button type="button" className="cmt-action" onClick={() => setEditing(true)}>Edit</button>
                  <button type="button" className="cmt-action cmt-action-danger" onClick={() => setConfirmDelete(true)}>Delete</button>
                </>
              )}
              {!isDeleted && !comment.isOwner && (
                <button
                  type="button"
                  className="cmt-action"
                  disabled={comment.alreadyReported}
                  onClick={() => { if (requireAuth()) onReport(comment); }}
                >
                  {comment.alreadyReported ? "Reported" : "Report"}
                </button>
              )}
            </div>
          )}

          {confirmDelete && (
            <div className="cmt-confirm-delete">
              <span>Delete this comment? This action cannot be undone.</span>
              <button type="button" className="cmt-btn-text" onClick={() => setConfirmDelete(false)} disabled={deleteBusy}>Cancel</button>
              <button type="button" className="cmt-btn-post cmt-btn-danger" onClick={confirmDeleteNow} disabled={deleteBusy}>
                {deleteBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}

          {replying && (
            <CommentComposer
              placeholder={`Reply to ${comment.author?.fullName || "this comment"}…`}
              autoFocus
              busy={replyBusy}
              value={replyText}
              onChange={setReplyText}
              onSubmit={submitReply}
              onCancel={() => setReplying(false)}
              submitLabel="Reply"
              maxLength={replyMaxLength}
            />
          )}

          {visibleKids.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              basePath={basePath}
              user={user}
              navigate={navigate}
              mutate={mutate}
              onReport={onReport}
              commentMaxLength={commentMaxLength}
              replyMaxLength={replyMaxLength}
            />
          ))}

          {hiddenCount > 0 && (
            <button type="button" className="cmt-load-more" onClick={() => setShowAllReplies(true)}>
              View {hiddenCount} more {hiddenCount === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// activityId drives the post's own comment thread; pass imageId instead to
// get that image's separate thread — same component, same tree/vote/report
// behavior, just a different container id and API base path.
function CommentSection({ activityId, imageId, user, navigate, onCountChange, commentMaxLength = 1000, replyMaxLength = 1000 }) {
  const mode = imageId != null ? "image" : "post";
  const basePath = mode === "image" ? `/images/${imageId}` : `/activities/${activityId}`;

  const [comments, setComments] = useState(null);
  const [error, setError] = useState("");
  const [newText, setNewText] = useState("");
  const [posting, setPosting] = useState(false);
  const [visibleTopLevel, setVisibleTopLevel] = useState(TOP_LEVEL_PAGE);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportReasons, setReportReasons] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    communityApi
      .get(`${basePath}/comments`)
      .then(({ data }) => setComments(data.comments))
      .catch(() => setError("Couldn't load comments."));
    reportApi.get("/reasons").then(({ data }) => setReportReasons(data.reasons)).catch(() => {});
  }, [basePath]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2800); };

  const mutate = useMemo(
    () => ({
      add: (comment) => setComments((cs) => [...(cs || []), comment]),
      update: (id, patch) => setComments((cs) => (cs || []).map((c) => (c.id === id ? { ...c, ...patch } : c))),
      toast: showToast,
      vote: (commentId, value) => {
        let prevSnapshot = null;
        setComments((cs) =>
          (cs || []).map((c) => {
            if (c.id !== commentId) return c;
            prevSnapshot = { likeCount: c.likeCount, dislikeCount: c.dislikeCount, userVote: c.userVote };
            const next = { ...c };
            // Optimistic toggle/switch mirroring the server's rules, so voting
            // feels instant while the request is in flight.
            if (c.userVote === value) {
              next[value === "like" ? "likeCount" : "dislikeCount"] -= 1;
              next.userVote = null;
            } else {
              if (c.userVote) next[c.userVote === "like" ? "likeCount" : "dislikeCount"] -= 1;
              next[value === "like" ? "likeCount" : "dislikeCount"] += 1;
              next.userVote = value;
            }
            return next;
          })
        );
        communityApi
          .post(`${basePath}/comments/${commentId}/vote`, { value })
          .then(({ data }) => {
            setComments((cs) =>
              (cs || []).map((c) => (c.id === commentId ? { ...c, likeCount: data.likeCount, dislikeCount: data.dislikeCount, userVote: data.userVote } : c))
            );
          })
          .catch(() => {
            setComments((cs) => (cs || []).map((c) => (c.id === commentId && prevSnapshot ? { ...c, ...prevSnapshot } : c)));
          });
      },
    }),
    [basePath]
  );

  const { rootComments, childrenMap, total } = useMemo(() => {
    const all = comments || [];
    const map = new Map();
    for (const c of all) {
      const key = c.parentId || null;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return { rootComments: map.get(null) || [], childrenMap: map, total: all.length };
  }, [comments]);

  useEffect(() => {
    if (comments !== null) onCountChange?.(total);
  }, [comments, total, onCountChange]);

  const submitTopLevel = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!newText.trim()) return;
    setPosting(true);
    try {
      const { data } = await communityApi.post(`${basePath}/comments`, { body: newText.trim() });
      mutate.add(data.comment);
      setNewText("");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't post your comment. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  const submitReport = async ({ reason, comment }) => {
    setReportBusy(true);
    setReportError("");
    try {
      await reportApi.post("/", { targetType: "comment", targetId: reportTarget.id, activityId, reason, comment });
      mutate.update(reportTarget.id, { alreadyReported: true });
      setReportSuccess(true);
    } catch (err) {
      setReportError(err.response?.data?.message || "Couldn't submit this report. Please try again.");
    } finally {
      setReportBusy(false);
    }
  };

  const visibleRoots = rootComments.slice(0, visibleTopLevel);
  const moreRoots = rootComments.length - visibleRoots.length;

  return (
    <div className="cmt-section">
      <CommentComposer
        placeholder="Write a comment…"
        busy={posting}
        value={newText}
        onChange={setNewText}
        onSubmit={submitTopLevel}
        submitLabel="Post"
        maxLength={commentMaxLength}
      />

      {error && <div className="cmt-error">{error}</div>}

      {comments === null && !error && <div className="cmt-loading">Loading comments…</div>}

      {comments !== null && total === 0 && <div className="cmt-empty">Be the first to comment.</div>}

      {visibleRoots.map((c) => (
        <CommentNode
          key={c.id}
          comment={c}
          childrenMap={childrenMap}
          depth={0}
          basePath={basePath}
          user={user}
          navigate={navigate}
          mutate={mutate}
          onReport={(cmt) => { setReportTarget(cmt); setReportError(""); setReportSuccess(false); }}
          commentMaxLength={commentMaxLength}
          replyMaxLength={replyMaxLength}
        />
      ))}

      {moreRoots > 0 && (
        <button type="button" className="cmt-load-more" onClick={() => setVisibleTopLevel((n) => n + TOP_LEVEL_PAGE)}>
          Load {Math.min(moreRoots, TOP_LEVEL_PAGE)} more comment{moreRoots === 1 ? "" : "s"}
        </button>
      )}

      {reportTarget && (
        <ReportModal
          title="Report Comment"
          reasons={reportReasons}
          busy={reportBusy}
          error={reportError}
          success={reportSuccess}
          onCancel={() => setReportTarget(null)}
          onSubmit={submitReport}
        />
      )}

      {toast && <div className="cmt-toast"><Icon name="info" size={15} />{toast}</div>}
    </div>
  );
}

export default CommentSection;
