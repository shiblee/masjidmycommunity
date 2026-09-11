import React, { useEffect, useRef, useState } from "react";
import { Icon } from "../Icons.jsx";
import CommentSection from "../CommentSection.jsx";
import PostBodyText from "../PostBodyText.jsx";
import MentionTextarea from "../MentionTextarea.jsx";
import MediaThumb from "../MediaThumb.jsx";
import { API_ORIGIN } from "../../config.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// Shared between the general "My Community" wall (client/src/pages/Community.jsx)
// and the Masjid Community Hub's Wall tab — one post-rendering implementation,
// not two copies drifting apart. mapLiveActivity() converts a raw API activity
// into the shape CommunityPost expects; both pages call it the same way.

export function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const LIVE_TYPE_MAP = {
  masjid_approved: "masjid_update",
  campaign_approved: "campaign_launch",
  donation: "donation",
  milestone: "milestone",
  new_user: "new_member",
  job_posted: "job_posted",
};

export function mapLiveActivity(a) {
  const isMasjid = a.type === "masjid_approved";
  const isCampaignEvent = a.type === "campaign_approved" || a.type === "donation" || a.type === "milestone";
  const isNewMember = a.type === "new_user";
  // A Reel is a CommunityActivity row (type: "reel") that renders exactly
  // like a community_post -- caption + video + like/comment/share -- so it
  // shares that whole branch rather than needing its own case here or in
  // the render logic below.
  const isCommunityPost = a.type === "community_post" || a.type === "reel";
  const isJobPost = a.type === "job_posted";
  const campaignCta = a.metadata?.campaignSlug ? { label: "View Campaign", href: `/campaign/${a.metadata.campaignSlug}` } : undefined;
  const jobCta = a.metadata?.jobSlug ? { label: "View Job", href: `/job/${a.metadata.jobSlug}` } : undefined;

  return {
    id: `live-${a.id}`,
    activityId: a.id,
    relatedMasjidId: a.relatedMasjidId || null,
    relatedCampaignId: a.relatedCampaignId || null,
    relatedJobId: a.relatedJobId || null,
    relatedUserId: a.relatedUserId || null,
    author: a.author || null,
    likeCount: a.likeCount || 0,
    dislikeCount: a.dislikeCount || 0,
    userVote: a.userVote || null,
    commentCount: a.commentCount || 0,
    type: isCommunityPost ? "community_post" : LIVE_TYPE_MAP[a.type] || "community_story",
    actor: {
      name: isMasjid
        ? a.metadata?.masjidName || a.title
        : isCampaignEvent
        ? a.metadata?.masjidName || a.metadata?.campaignTitle || a.title
        : isNewMember
        ? a.user?.fullName || a.metadata?.fullName || "A new member"
        : isCommunityPost
        ? a.author?.fullName || "Community Member"
        : isJobPost
        ? a.user?.fullName || "A community member"
        : "Masjid My Community",
      // Not tied to the real Green Tick verification process (a separate
      // document-review workflow) — always registering a masjid_approved
      // post as "verified" here would be misleading, so this stays off
      // until the Wall actually reads a masjid's real Green Tick status.
      verified: false,
      location: isNewMember ? a.user?.maskedEmail || a.user?.maskedMobile || "" : a.metadata?.location || "",
    },
    time: timeAgo(a.publishedAt || a.createdAt),
    text: a.body || a.title,
    images: isCommunityPost
      ? (a.images || []).map((img) => ({
          id: img.id,
          url: `${API_ORIGIN}${img.url}`,
          likeCount: img.likeCount || 0,
          dislikeCount: img.dislikeCount || 0,
          userVote: img.userVote || null,
          commentCount: img.commentCount || 0,
        }))
      : a.imageUrl
      ? [{ id: null, url: `${API_ORIGIN}${a.imageUrl}` }]
      : undefined,
    videoUrl: a.mediaVideoUrl ? `${API_ORIGIN}${a.mediaVideoUrl}` : undefined,
    videoPosterUrl: a.mediaVideoPosterUrl ? `${API_ORIGIN}${a.mediaVideoPosterUrl}` : undefined,
    // No "View Masjid" CTA for masjid posts — the header name and the
    // @mention(s) in the body already link straight to the masjid's page,
    // so a separate button repeated the same action.
    cta: isJobPost ? jobCta : campaignCta,
  };
}

const TYPE_META = {
  masjid_update: { tag: "New Masjid" },
  campaign_launch: { tag: "New Campaign" },
  donation: { tag: "Donation" },
  milestone: { tag: "Milestone" },
  project_update: { tag: "Project Update" },
  community_story: { tag: "Community" },
  new_member: { tag: "New Member" },
  community_post: { tag: "Community Post" },
  job_posted: { tag: "New Job" },
};

function currency(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function initialsOf(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function Avatar({ actor }) {
  const [failed, setFailed] = useState(false);
  if (actor.avatar && !failed) {
    return <img className="cw-avatar" src={actor.avatar} alt={actor.name} onError={() => setFailed(true)} />;
  }
  return (
    <span className="cw-avatar cw-avatar-fallback" aria-hidden="true">
      {initialsOf(actor.name)}
    </span>
  );
}

function VerifiedBadge() {
  return (
    <svg className="cw-verified" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-label="Verified masjid">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.42a9.87 9.87 0 0 0 4.62 1.18h.01c5.46 0 9.9-4.45 9.9-9.9C21.95 6.45 17.5 2 12.04 2Zm0 18.06a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.18 8.18 0 0 1-1.26-4.31c0-4.52 3.68-8.2 8.2-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.52-3.68 8.15-8.21 8.15Zm4.48-6.15c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12-.16.24-.63.79-.78.95-.14.16-.29.18-.53.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.11-.11.24-.29.36-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2H21l-6.53 7.46L22 22h-6.828l-4.78-6.24L4.9 22H2.14l7.02-8.02L2 2h6.914l4.34 5.7L18.244 2Zm-1.197 18h1.833L7.03 3.94H5.06L17.047 20Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.6c0-.9.3-1.6 1.7-1.6h1.6V4.1C16.5 4.1 15.4 4 14.2 4c-2.5 0-4.2 1.5-4.2 4.3v2.5H7.3v3.2H10v8h3.5Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 20h-3.37v-5.6c0-1.34-.02-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V20H9.67V8.5h3.24v1.57h.05c.45-.86 1.56-1.77 3.2-1.77 3.43 0 4.06 2.26 4.06 5.2V20Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  );
}

function DeviceShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

function shareTextFor(post) {
  const raw = `${post.actor?.name ? `${post.actor.name}: ` : ""}${post.text || ""}`;
  return raw.length > 180 ? `${raw.slice(0, 177)}…` : raw;
}

function ShareButton({ post }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef(null);
  useClickOutside(wrapRef, () => setOpen(false));

  const url = `${window.location.origin}/my-community#${post.id}`;
  const text = shareTextFor(post);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard API unavailable; button still gives feedback below
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openShareWindow = (href) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=640");
    setOpen(false);
  };

  const shareViaDevice = async () => {
    try {
      await navigator.share({ title: post.actor?.name || "Masjid My Community", text, url });
      setOpen(false);
    } catch (err) {
      // AbortError just means the user closed the native sheet — leave our menu open either way
    }
  };

  const items = [
    {
      key: "whatsapp",
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      onClick: () => openShareWindow(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`),
    },
    {
      key: "twitter",
      label: "X (Twitter)",
      icon: <XIcon />,
      onClick: () => openShareWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`),
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: <FacebookIcon />,
      onClick: () => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`),
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      icon: <LinkedInIcon />,
      onClick: () => openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`),
    },
    {
      key: "instagram",
      label: "Instagram",
      hint: "Link copied — paste into a Story, DM, or bio",
      icon: <InstagramIcon />,
      onClick: () => { copyLink(); setOpen(false); },
    },
  ];

  return (
    <div className="cw-share-wrap" ref={wrapRef}>
      <button
        className={`cw-share${copied ? " copied" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Share this update"
      >
        <ShareIcon />
        {copied ? "Link copied" : "Share"}
      </button>
      {open && (
        <div className="cw-share-menu" role="menu">
          {typeof navigator.share === "function" && (
            <>
              <button type="button" role="menuitem" className="cw-share-item" onClick={shareViaDevice}>
                <DeviceShareIcon />
                <span>Share via…</span>
              </button>
              <div className="cw-share-menu-sep" />
            </>
          )}
          {items.map((item) => (
            <button
              type="button"
              key={item.key}
              role="menuitem"
              className={`cw-share-item cw-share-${item.key}`}
              onClick={item.onClick}
            >
              {item.icon}
              <span>
                {item.label}
                {item.hint && <small>{item.hint}</small>}
              </span>
            </button>
          ))}
          <div className="cw-share-menu-sep" />
          <button type="button" role="menuitem" className="cw-share-item" onClick={() => { copyLink(); setOpen(false); }}>
            <LinkIcon />
            <span>Copy Link</span>
          </button>
        </div>
      )}
    </div>
  );
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

function VoteButtons({ post, user, navigate, onVote }) {
  const vote = async (value) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    onVote(post.activityId, value);
  };

  return (
    <div className="cw-vote-group">
      <button
        type="button"
        className={`cw-vote-btn${post.userVote === "like" ? " active" : ""}`}
        onClick={() => vote("like")}
        aria-label="Like this update"
      >
        <ThumbUpIcon />
        <span>{post.likeCount}</span>
      </button>
      <button
        type="button"
        className={`cw-vote-btn cw-vote-btn-down${post.userVote === "dislike" ? " active" : ""}`}
        onClick={() => vote("dislike")}
        aria-label="Dislike this update"
      >
        <ThumbDownIcon />
        <span>{post.dislikeCount}</span>
      </button>
    </div>
  );
}

function PostProgress({ progress }) {
  const pct = Math.min(100, Math.round((progress.raised / progress.goal) * 100));
  return (
    <div className="cw-progress">
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="cw-progress-meta">
        <span className="raised">{currency(progress.raised)} raised</span>
        <span className="goal">{pct}% of {currency(progress.goal)}</span>
      </div>
    </div>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function PostMenu({ post, onEdit, onDelete, onReport }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useClickOutside(wrapRef, () => setOpen(false));

  return (
    <div className="cw-postmenu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="cw-postmenu-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Post options"
      >
        <DotsIcon />
      </button>
      {open && (
        <div className="cw-postmenu" role="menu">
          {post.ownerKind && (
            <>
              <button type="button" role="menuitem" className="cw-share-item" onClick={() => { setOpen(false); onEdit(post); }}>
                <Icon name="edit" size={16} />
                <span>Edit</span>
              </button>
              {(post.ownerKind === "masjid" || post.ownerKind === "community_post") && (
                <button
                  type="button"
                  role="menuitem"
                  className="cw-share-item cw-postmenu-danger"
                  onClick={() => { setOpen(false); onDelete(post); }}
                >
                  <Icon name="trash" size={16} />
                  <span>Delete</span>
                </button>
              )}
              <div className="cw-share-menu-sep" />
            </>
          )}
          <button type="button" role="menuitem" className="cw-share-item" onClick={() => { setOpen(false); onReport(post); }}>
            <Icon name="flag" size={16} />
            <span>Report Post</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function EditCommunityPostModal({ post, busy, error, maxLength, onCancel, onSave }) {
  const [body, setBody] = useState(post.text || "");
  const overLimit = body.length > maxLength;
  return (
    <div className="msj-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        {!busy && <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>}
        <h3>Edit Post</h3>
        <div className="auth-field">
          <label>Post Content</label>
          <MentionTextarea rows={6} value={body} onChange={setBody} placeholder="Share an update…" />
        </div>
        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center" }} onClick={onCancel} disabled={busy} type="button">
            Cancel
          </button>
          <button
            className="btn btn-gold"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={busy || !body.trim() || overLimit}
            onClick={() => onSave({ body: body.trim() })}
            type="button"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteCommunityPostModal({ busy, error, onCancel, onConfirm }) {
  return (
    <div className="msj-modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
        {!busy && <button className="msj-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>}
        <h3>Delete Post?</h3>
        <p className="msj-modal-sub">Are you sure you want to delete this post? This action cannot be undone.</p>
        {error && <div className="auth-alert" style={{ marginBottom: 16 }}><Icon name="info" size={17} />{error}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline-ink" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }} onClick={onCancel} disabled={busy} type="button">
            Cancel
          </button>
          <button className="btn btn-gold" style={{ flex: 1, justifyContent: "center", whiteSpace: "nowrap" }} onClick={onConfirm} disabled={busy} type="button">
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

function PostImageGallery({ images, onOpen }) {
  const n = images.length;
  const layoutClass = n === 1 ? "cw-gallery-1" : n === 2 ? "cw-gallery-2" : n === 3 ? "cw-gallery-3" : "cw-gallery-4plus";
  const visible = n > 4 ? images.slice(0, 4) : images;
  const extra = n > 4 ? n - 4 : 0;

  return (
    <div className={`cw-gallery ${layoutClass}`}>
      {visible.map((img, i) => (
        <button
          type="button"
          key={img.id ?? i}
          className="cw-gallery-tile"
          onClick={() => (img.id != null ? onOpen(i) : undefined)}
          style={{ cursor: img.id != null ? "pointer" : "default" }}
        >
          <img src={img.url} alt="" loading="lazy" />
          {extra > 0 && i === 3 && (
            <span className="cw-gallery-more-overlay">+{extra} more</span>
          )}
        </button>
      ))}
    </div>
  );
}

function CommunityPost({ post, user, navigate, onVote, onEdit, onDelete, onReport, onHashtagClick, commentMaxLength, replyMaxLength, onOpenImage, commentsOpenByDefault = false, hideCta = false }) {
  const meta = TYPE_META[post.type];
  const [showComments, setShowComments] = useState(commentsOpenByDefault);
  const [commentCountOverride, setCommentCountOverride] = useState(null);
  const commentCount = commentCountOverride ?? post.commentCount ?? 0;
  return (
    <article id={post.id} className={`cw-post${post.featured ? " cw-post-featured" : ""}`}>
      {post.featured && <span className="cw-featured-ribbon">★ Featured</span>}
      <div className="cw-post-head">
        <Avatar actor={post.actor} />
        <div className="cw-post-headtext">
          <div className="cw-post-name">
            {post.type === "masjid_update" && post.relatedMasjidId ? (
              <a href={`/masjid/${post.relatedMasjidId}`} className="cw-post-name-link">{post.actor.name}</a>
            ) : (
              post.actor.name
            )}
            {post.actor.verified && <VerifiedBadge />}
          </div>
          <div className="cw-post-meta">
            {post.actor.location} · {post.time}
          </div>
        </div>
        <span className={`cw-tag${post.urgent ? " cw-tag-urgent" : ""}`}>{post.milestoneBadge || meta.tag}</span>
        {post.activityId && (
          <PostMenu post={post} onEdit={onEdit} onDelete={onDelete} onReport={onReport} />
        )}
      </div>

      <p className="cw-post-text"><PostBodyText text={post.text} onHashtagClick={onHashtagClick} /></p>

      {post.images && post.images.length > 0 && (
        <PostImageGallery images={post.images} onOpen={(index) => onOpenImage(post, index)} />
      )}

      {post.videoUrl && (
        <div className="cw-post-media cw-post-video">
          <MediaThumb src={post.videoUrl} poster={post.videoPosterUrl} mediaType="video" videoProps={{ controls: true }} />
        </div>
      )}

      {post.donation && (
        <div className="cw-donation-chip">
          <span className="cw-donation-amount">{currency(post.donation.amount)}</span>
          <span className="cw-donation-campaign">towards {post.donation.campaign}</span>
        </div>
      )}

      {post.projectStatus && (
        <div className="cw-progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${post.projectStatus.pct}%` }} />
          </div>
          <div className="cw-progress-meta">
            <span className="raised">{post.projectStatus.label}</span>
            <span className="goal">{post.projectStatus.pct}% complete</span>
          </div>
        </div>
      )}

      {post.progress && <PostProgress progress={post.progress} />}

      {post.stats && (
        <div className="cw-post-stats">
          {post.stats.map((s) => (
            <div key={s.label}>
              <strong>{s.n}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="cw-post-actions">
        <div className="cw-post-ctas">
          {post.cta && !hideCta && (
            <a href={post.cta.href} className="btn btn-gold cw-cta">
              {post.cta.label} <span className="btn-arrow">→</span>
            </a>
          )}
          {post.cta2 && (
            <a href={post.cta2.href} className="btn btn-outline-ink cw-cta">
              {post.cta2.label}
            </a>
          )}
        </div>
        <div className="cw-post-secondary-actions">
          {post.activityId && <VoteButtons post={post} user={user} navigate={navigate} onVote={onVote} />}
          {post.activityId && (
            <button type="button" className="cw-comment-toggle" onClick={() => setShowComments((s) => !s)}>
              <CommentIcon />
              {commentCount} {commentCount === 1 ? "Comment" : "Comments"}
            </button>
          )}
          <ShareButton post={post} />
        </div>
      </div>

      {post.activityId && showComments && (
        <CommentSection
          activityId={post.activityId}
          user={user}
          navigate={navigate}
          onCountChange={setCommentCountOverride}
          commentMaxLength={commentMaxLength}
          replyMaxLength={replyMaxLength}
        />
      )}
    </article>
  );
}

export default CommunityPost;
