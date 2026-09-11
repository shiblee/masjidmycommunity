import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import communityApi from "../services/communityApi.js";
import reportApi from "../services/reportApi.js";
import { Icon } from "./Icons.jsx";
import ReportModal from "./ReportModal.jsx";
import MentionTextarea from "./MentionTextarea.jsx";
import PostBodyText from "./PostBodyText.jsx";
import EmojiPicker from "./comment/EmojiPicker.jsx";
import MediaPicker from "./comment/MediaPicker.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";

// A short run of typed/picked emoji renders larger — same "emoji-only
// messages get bigger" convention WhatsApp/Telegram use.
const EMOJI_ONLY_RE = new RegExp("^(?:\\p{Extended_Pictographic}|\\p{Emoji_Presentation}|\\u200d|\\uFE0F|\\s)+$", "u");
function isEmojiOnly(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 30) return false;
  return EMOJI_ONLY_RE.test(trimmed);
}

const TOP_LEVEL_PAGE = 10;
const REPLY_PREVIEW = 3;
// Indentation stops growing past this depth so a very long reply chain
// doesn't run the thread off the right edge of the screen — the data model
// itself has no depth limit, this is purely a rendering choice.
const MAX_VISUAL_DEPTH = 6;

function timeAgo(dateStr, t) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("commentSection.time.justNow", "Just now");
  if (mins < 60) return t("commentSection.time.minutesAgo", "{count}m ago").replace("{count}", mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("commentSection.time.hoursAgo", "{count}h ago").replace("{count}", hrs);
  const days = Math.floor(hrs / 24);
  return t("commentSection.time.daysAgo", "{count}d ago").replace("{count}", days);
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

// `user` drives the avatar + "Comment as {name}" placeholder shown in the
// screenshot this was built from. onSendSticker/onSendGif (only passed for
// the top-level and reply composers, not the plain-textarea edit box) send
// immediately on pick — same tap-to-send convention as a real sticker/GIF
// tray — bypassing the normal type-then-click-Post flow entirely.
// `media` ({url, type: "gif"|"sticker"} or null) is controlled by the
// parent, same as `value`/`onChange` for the text — a GIF/sticker pick
// attaches it as a removable preview instead of sending immediately, so it
// only actually posts when Send is pressed (can combine with typed text too).
function CommentComposer({ user, placeholder, autoFocus, busy, value, onChange, onSubmit, onCancel, submitLabel, maxLength, media, onMediaChange, onRequireAuth }) {
  const { t } = useTranslation();
  const overLimit = maxLength != null && value.length > maxLength;
  const [picker, setPicker] = useState(null); // null | "emoji" | "gif" | "sticker"
  const emojiBtnRef = useRef(null);
  const gifBtnRef = useRef(null);
  const stickerBtnRef = useRef(null);

  const togglePicker = (key) => setPicker((p) => (p === key ? null : key));
  const closePicker = () => setPicker(null);
  // GIF/Sticker search hits the server immediately on open, so it needs the
  // same guest-redirect Post/Reply already give — unlike Emoji, which only
  // ever touches local text state.
  const openGatedPicker = (key) => {
    if (onRequireAuth && !onRequireAuth()) return;
    togglePicker(key);
  };
  const pickMedia = (type, item) => {
    closePicker();
    onMediaChange({ url: item.url, type });
  };

  return (
    <div className="cmt-composer">
      <span className="cmt-composer-avatar">{initialsOf(user?.fullName)}</span>
      <div className="cmt-composer-main">
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

        {media && (
          <div className="cmt-composer-media-preview">
            <img src={media.url} alt={media.type === "sticker" ? t("commentSection.stickerAlt", "Sticker") : t("commentSection.gifAlt", "GIF")} />
            <button type="button" onClick={() => onMediaChange(null)} aria-label={t("commentSection.removeMedia", "Remove")}>
              <Icon name="x" size={12} />
            </button>
          </div>
        )}

        <div className="cmt-composer-toolbar">
          <div className="cmt-composer-tools">
            <button type="button" ref={emojiBtnRef} className="cmt-tool-btn" onClick={() => togglePicker("emoji")} aria-label={t("commentSection.emojiLabel", "Add emoji")}>
              <Icon name="emoji" size={17} />
            </button>
            {onMediaChange && (
              <button type="button" ref={gifBtnRef} className="cmt-tool-btn cmt-tool-btn-gif" onClick={() => openGatedPicker("gif")} aria-label={t("commentSection.gifLabel", "Add a GIF")}>
                GIF
              </button>
            )}
            {onMediaChange && (
              <button type="button" ref={stickerBtnRef} className="cmt-tool-btn" onClick={() => openGatedPicker("sticker")} aria-label={t("commentSection.stickerLabel", "Add a sticker")}>
                <Icon name="star" size={17} />
              </button>
            )}
          </div>
          <div className="cmt-composer-toolbar-right">
            {onCancel && (
              <button type="button" className="cmt-btn-text" onClick={onCancel} disabled={busy}>
                {t("commentSection.cancel", "Cancel")}
              </button>
            )}
            <button
              type="button"
              className="cmt-send-btn"
              onClick={onSubmit}
              disabled={busy || (!value.trim() && !media) || overLimit}
              aria-label={submitLabel || t("commentSection.post", "Post")}
            >
              <Icon name="send" size={15} />
            </button>
          </div>
        </div>

        <EmojiPicker open={picker === "emoji"} onClose={closePicker} anchorRef={emojiBtnRef} onPick={(emoji) => onChange(value + emoji)} />
        {onMediaChange && (
          <MediaPicker
            open={picker === "gif"}
            onClose={closePicker}
            anchorRef={gifBtnRef}
            endpoint="/gifs"
            resultsKey="gifs"
            searchPlaceholder={t("commentSection.gif.searchPlaceholder", "Search GIFs…")}
            emptyText={t("commentSection.gif.empty", "No GIFs found.")}
            unavailableText={t("commentSection.gif.unavailable", "GIF search isn't set up yet.")}
            className="cmt-gif-popover"
            onPick={(gif) => pickMedia("gif", gif)}
          />
        )}
        {onMediaChange && (
          <MediaPicker
            open={picker === "sticker"}
            onClose={closePicker}
            anchorRef={stickerBtnRef}
            endpoint="/stickers"
            resultsKey="stickers"
            searchPlaceholder={t("commentSection.sticker.searchPlaceholder", "Search stickers…")}
            emptyText={t("commentSection.sticker.empty", "No stickers found.")}
            unavailableText={t("commentSection.sticker.unavailable", "Sticker search isn't set up yet.")}
            className="cmt-gif-popover"
            onPick={(sticker) => pickMedia("sticker", sticker)}
          />
        )}
      </div>
    </div>
  );
}

function CommentNode({ comment, childrenMap, depth, basePath, user, navigate, mutate, onReport, commentMaxLength, replyMaxLength }) {
  const { t } = useTranslation();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyMedia, setReplyMedia] = useState(null); // {url, type: "gif"|"sticker"} | null
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
    if (!requireAuth()) return;
    const trimmedBody = replyText.trim();
    if (!trimmedBody && !replyMedia) return;
    setReplyBusy(true);
    try {
      const { data } = await communityApi.post(`${basePath}/comments`, {
        parentId: comment.id,
        body: trimmedBody,
        ...(replyMedia ? { mediaUrl: replyMedia.url, mediaType: replyMedia.type } : {}),
      });
      mutate.add(data.comment);
      setReplyText("");
      setReplyMedia(null);
      setReplying(false);
      setShowAllReplies(true);
    } catch (err) {
      mutate.toast(err.response?.data?.message || t("commentSection.errorPostReply", "Couldn't post your reply. Please try again."));
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
      mutate.toast(err.response?.data?.message || t("commentSection.errorSaveEdit", "Couldn't save your changes. Please try again."));
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
      mutate.toast(err.response?.data?.message || t("commentSection.errorDeleteComment", "Couldn't delete this comment. Please try again."));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="cmt-node" style={{ marginLeft: visualDepth ? 28 : 0 }}>
      <div className="cmt-row">
        {comment.author?.username ? (
          <Link to={`/profile/${comment.author.username}`} className="cmt-avatar">{initialsOf(comment.author?.fullName)}</Link>
        ) : (
          <div className="cmt-avatar">{initialsOf(comment.author?.fullName)}</div>
        )}
        <div className="cmt-body-wrap">
          <div className="cmt-bubble">
            <div className="cmt-author">
              {comment.author?.username ? (
                <Link to={`/profile/${comment.author.username}`} className="cmt-author-link">{comment.author.fullName}</Link>
              ) : (
                comment.author?.fullName || t("commentSection.deletedUser", "Deleted User")
              )}
            </div>
            {editing ? (
              <div className="cmt-edit-box">
                <MentionTextarea rows={2} value={editText} onChange={setEditText} autoFocus />
                <div className="cmt-composer-actions">
                  <button type="button" className="cmt-btn-text" onClick={() => { setEditing(false); setEditText(comment.body || ""); }} disabled={editBusy}>
                    {t("commentSection.cancel", "Cancel")}
                  </button>
                  <button type="button" className="cmt-btn-post" onClick={submitEdit} disabled={editBusy || !editText.trim() || editOverLimit}>
                    {editBusy ? t("commentSection.saving", "Saving…") : t("commentSection.save", "Save")}
                  </button>
                </div>
              </div>
            ) : isDeleted ? (
              <p className="cmt-text cmt-text-deleted">{t("commentSection.commentDeleted", "[Comment deleted]")}</p>
            ) : (
              <>
                {comment.body && (
                  <p className={`cmt-text${isEmojiOnly(comment.body) ? " cmt-text-emoji" : ""}`}>
                    <PostBodyText text={comment.body} />
                  </p>
                )}
                {comment.mediaUrl && (comment.mediaType === "gif" || comment.mediaType === "sticker") && (
                  <img
                    className={`cmt-media-post${comment.mediaType === "sticker" ? " cmt-media-post-sticker" : ""}`}
                    src={comment.mediaUrl}
                    alt={comment.mediaType === "sticker" ? t("commentSection.stickerAlt", "Sticker") : t("commentSection.gifAlt", "GIF")}
                    loading="lazy"
                  />
                )}
              </>
            )}
          </div>

          {!editing && (
            <div className="cmt-meta-row">
              <span className="cmt-time">{timeAgo(comment.createdAt, t)}{comment.edited ? t("commentSection.editedSuffix", " · Edited") : ""}</span>
              {!isDeleted && <CommentVoteButtons comment={comment} requireAuth={requireAuth} onVote={mutate.vote} />}
              {!isDeleted && (
                <button type="button" className="cmt-action" onClick={() => { if (requireAuth()) setReplying((r) => !r); }}>
                  {t("commentSection.reply", "Reply")}
                </button>
              )}
              {!isDeleted && comment.isOwner && (
                <>
                  <button type="button" className="cmt-action" onClick={() => setEditing(true)}>{t("commentSection.edit", "Edit")}</button>
                  <button type="button" className="cmt-action cmt-action-danger" onClick={() => setConfirmDelete(true)}>{t("commentSection.delete", "Delete")}</button>
                </>
              )}
              {!isDeleted && !comment.isOwner && (
                <button
                  type="button"
                  className="cmt-action"
                  disabled={comment.alreadyReported}
                  onClick={() => { if (requireAuth()) onReport(comment); }}
                >
                  {comment.alreadyReported ? t("commentSection.reported", "Reported") : t("commentSection.report", "Report")}
                </button>
              )}
            </div>
          )}

          {confirmDelete && (
            <div className="cmt-confirm-delete">
              <span>{t("commentSection.confirmDeleteMessage", "Delete this comment? This action cannot be undone.")}</span>
              <button type="button" className="cmt-btn-text" onClick={() => setConfirmDelete(false)} disabled={deleteBusy}>{t("commentSection.cancel", "Cancel")}</button>
              <button type="button" className="cmt-btn-post cmt-btn-danger" onClick={confirmDeleteNow} disabled={deleteBusy}>
                {deleteBusy ? t("commentSection.deleting", "Deleting…") : t("commentSection.delete", "Delete")}
              </button>
            </div>
          )}

          {replying && (
            <CommentComposer
              user={user}
              placeholder={t("commentSection.replyPlaceholder", "Reply to {name}…").replace("{name}", comment.author?.fullName || t("commentSection.replyToFallbackName", "this comment"))}
              autoFocus
              busy={replyBusy}
              value={replyText}
              onChange={setReplyText}
              media={replyMedia}
              onMediaChange={setReplyMedia}
              onSubmit={submitReply}
              onCancel={() => setReplying(false)}
              submitLabel={t("commentSection.reply", "Reply")}
              maxLength={replyMaxLength}
              onRequireAuth={requireAuth}
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
              {(hiddenCount === 1
                ? t("commentSection.viewMoreRepliesSingular", "View {count} more reply")
                : t("commentSection.viewMoreRepliesPlural", "View {count} more replies")
              ).replace("{count}", hiddenCount)}
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
  const { t } = useTranslation();
  const mode = imageId != null ? "image" : "post";
  const basePath = mode === "image" ? `/images/${imageId}` : `/activities/${activityId}`;

  const [comments, setComments] = useState(null);
  const [error, setError] = useState("");
  const [newText, setNewText] = useState("");
  const [newMedia, setNewMedia] = useState(null); // {url, type: "gif"|"sticker"} | null
  const [posting, setPosting] = useState(false);
  const [visibleTopLevel, setVisibleTopLevel] = useState(TOP_LEVEL_PAGE);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportReasons, setReportReasons] = useState([]);
  const [toast, setToast] = useState(null);

  const requireAuth = () => {
    if (!user) {
      navigate("/auth");
      return false;
    }
    return true;
  };

  useEffect(() => {
    communityApi
      .get(`${basePath}/comments`)
      .then(({ data }) => setComments(data.comments))
      .catch(() => setError(t("commentSection.errorLoadComments", "Couldn't load comments.")));
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
    const trimmedBody = newText.trim();
    if (!trimmedBody && !newMedia) return;
    setPosting(true);
    try {
      const { data } = await communityApi.post(`${basePath}/comments`, {
        body: trimmedBody,
        ...(newMedia ? { mediaUrl: newMedia.url, mediaType: newMedia.type } : {}),
      });
      mutate.add(data.comment);
      setNewText("");
      setNewMedia(null);
    } catch (err) {
      showToast(err.response?.data?.message || t("commentSection.errorPostComment", "Couldn't post your comment. Please try again."));
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
      setReportError(err.response?.data?.message || t("commentSection.errorSubmitReport", "Couldn't submit this report. Please try again."));
    } finally {
      setReportBusy(false);
    }
  };

  const visibleRoots = rootComments.slice(0, visibleTopLevel);
  const moreRoots = rootComments.length - visibleRoots.length;

  return (
    <div className="cmt-section">
      <CommentComposer
        user={user}
        placeholder={user ? t("commentSection.placeholderCommentAs", "Comment as {name}").replace("{name}", user.fullName) : t("commentSection.placeholderWriteComment", "Write a comment…")}
        busy={posting}
        value={newText}
        onChange={setNewText}
        media={newMedia}
        onMediaChange={setNewMedia}
        onSubmit={submitTopLevel}
        submitLabel={t("commentSection.post", "Post")}
        maxLength={commentMaxLength}
        onRequireAuth={requireAuth}
      />

      {error && <div className="cmt-error">{error}</div>}

      {comments === null && !error && <div className="cmt-loading">{t("commentSection.loading", "Loading comments…")}</div>}

      {comments !== null && total === 0 && <div className="cmt-empty">{t("commentSection.empty", "Be the first to comment.")}</div>}

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
          {(moreRoots === 1
            ? t("commentSection.loadMoreCommentsSingular", "Load {count} more comment")
            : t("commentSection.loadMoreCommentsPlural", "Load {count} more comments")
          ).replace("{count}", Math.min(moreRoots, TOP_LEVEL_PAGE))}
        </button>
      )}

      {reportTarget && (
        <ReportModal
          title={t("commentSection.reportModalTitle", "Report Comment")}
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
