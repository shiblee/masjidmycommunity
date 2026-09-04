import fs from "fs";
import { Op, fn, col } from "sequelize";
import CommunityActivity from "../models/CommunityActivity.js";
import CommunityActivityVote from "../models/CommunityActivityVote.js";
import Comment from "../models/Comment.js";
import CommentVote from "../models/CommentVote.js";
import PostImage from "../models/PostImage.js";
import PostImageVote from "../models/PostImageVote.js";
import ContentReport from "../models/ContentReport.js";
import User from "../models/User.js";
import Masjid from "../models/Masjid.js";
import Campaign from "../models/Campaign.js";
import Donation from "../models/Donation.js";
import { maskEmail, maskMobile } from "../utils/mask.js";
import { mediaTypeOf, IMAGE_MAX_BYTES } from "../middleware/upload.js";
import ContentSettings from "../models/ContentSettings.js";
import { notifyUser } from "../services/notificationService.js";

function notifyReply({ parentUserId, actorId, actorName, body, link }) {
  if (!parentUserId || parentUserId === actorId) return;
  notifyUser({
    userId: parentUserId,
    type: "comment_reply",
    title: "New reply to your comment",
    body: `${actorName} replied: "${body.length > 140 ? `${body.slice(0, 140)}…` : body}"`,
    link,
  }).catch(() => {});
}

// `@[masjid:<id>:<name>]` / `@[campaign:<slug>:<title>]` tokens are inserted
// by MentionTextarea's autocomplete (see mentionSearch above) — this is the
// write-side counterpart, notifying whoever owns the mentioned masjid/campaign.
const MENTION_TOKEN_RE = /@\[(masjid|campaign):([^\]:]+):[^\]]+\]/g;

async function notifyMentions(body, { actorId, actorName }) {
  if (!body) return;
  const masjidIds = new Set();
  const campaignSlugs = new Set();
  let m;
  MENTION_TOKEN_RE.lastIndex = 0;
  while ((m = MENTION_TOKEN_RE.exec(body))) {
    if (m[1] === "masjid") masjidIds.add(Number(m[2]));
    else campaignSlugs.add(m[2]);
  }
  if (!masjidIds.size && !campaignSlugs.size) return;

  const [masjids, campaigns] = await Promise.all([
    masjidIds.size ? Masjid.findAll({ where: { id: { [Op.in]: [...masjidIds] } }, attributes: ["id", "userId", "name"] }) : [],
    campaignSlugs.size ? Campaign.findAll({ where: { slug: { [Op.in]: [...campaignSlugs] } }, attributes: ["id", "createdBy", "title"] }) : [],
  ]);

  const link = "/my-community";
  for (const masjid of masjids) {
    if (masjid.userId === actorId) continue;
    notifyUser({
      userId: masjid.userId,
      type: "wall_mention",
      title: "Your masjid was mentioned on the Community Wall",
      body: `${actorName} mentioned ${masjid.name} in a Wall post.`,
      link,
      relatedMasjidId: masjid.id,
    }).catch(() => {});
  }
  for (const campaign of campaigns) {
    if (campaign.createdBy === actorId) continue;
    notifyUser({
      userId: campaign.createdBy,
      type: "wall_mention",
      title: "Your campaign was mentioned on the Community Wall",
      body: `${actorName} mentioned "${campaign.title}" in a Wall post.`,
      link,
      relatedCampaignId: campaign.id,
    }).catch(() => {});
  }
}

async function getContentLimits() {
  const settings = await ContentSettings.findByPk(1);
  return {
    maxPostLength: settings?.maxPostLength ?? 2000,
    maxCommentLength: settings?.maxCommentLength ?? 1000,
    maxReplyLength: settings?.maxReplyLength ?? 1000,
  };
}

export const getContentSettings = async (req, res) => {
  try {
    res.json(await getContentLimits());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const PUBLIC_CAMPAIGN_STATUSES = ["active", "paused", "goal_reached", "completed"];

// Powers the Wall's left-sidebar stats tiles — a snapshot of community-wide
// numbers, scoped the same way the public masjid/campaign listings are (only
// approved/moderation-active records) so a viewer never sees counts that
// include drafts or hidden content.
export const getCommunityStats = async (req, res) => {
  try {
    const [masjidCount, publicCampaigns, memberCount] = await Promise.all([
      Masjid.count({ where: { status: "approved", moderationStatus: "active" } }),
      Campaign.findAll({
        where: { status: { [Op.in]: PUBLIC_CAMPAIGN_STATUSES }, moderationStatus: "active" },
        attributes: ["id"],
      }),
      User.count({ where: { status: "active" } }),
    ]);
    const campaignIds = publicCampaigns.map((c) => c.id);
    const totalRaised = campaignIds.length
      ? Number(await Donation.sum("amount", { where: { campaignId: { [Op.in]: campaignIds }, status: "recorded" } })) || 0
      : 0;
    res.json({ masjidCount, campaignCount: campaignIds.length, memberCount, totalRaised });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Powers the "@" mention autocomplete in the post/comment/reply composers —
// a lightweight combined lookup so the dropdown can populate from a single
// request as the user types, rather than round-tripping to the full public
// masjid/campaign listing endpoints (which eager-load photos, donor counts,
// etc. that a suggestion row never needs).
export const mentionSearch = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ masjids: [], campaigns: [] });

    const like = { [Op.like]: `%${q}%` };
    const [masjids, campaigns] = await Promise.all([
      Masjid.findAll({
        where: { status: "approved", moderationStatus: "active", name: like },
        attributes: ["id", "name", "city", "country"],
        order: [["name", "ASC"]],
        limit: 5,
      }),
      Campaign.findAll({
        where: { status: { [Op.in]: ["active", "paused", "goal_reached", "completed"] }, moderationStatus: "active", title: like },
        attributes: ["id", "slug", "title"],
        order: [["title", "ASC"]],
        limit: 5,
      }),
    ]);

    res.json({ masjids, campaigns });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listPublished = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 60);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const [hiddenMasjidIds, hiddenCampaignIds] = await Promise.all([
      Masjid.findAll({ where: { moderationStatus: "under_review" }, attributes: ["id"] }).then((rows) => rows.map((r) => r.id)),
      Campaign.findAll({ where: { moderationStatus: "under_review" }, attributes: ["id"] }).then((rows) => rows.map((r) => r.id)),
    ]);

    const where = { status: "published" };
    // Explicit null-safe exclusion — relatedMasjidId/relatedCampaignId are
    // NULL on most activities, and `NOT (NULL IN (...))` evaluates to NULL
    // (excluding the row) rather than true, so a plain Op.not would wrongly
    // hide every unrelated post the moment any masjid/campaign is under review.
    const exclusions = [];
    if (hiddenMasjidIds.length) {
      exclusions.push({ [Op.or]: [{ relatedMasjidId: null }, { relatedMasjidId: { [Op.notIn]: hiddenMasjidIds } }] });
    }
    if (hiddenCampaignIds.length) {
      exclusions.push({ [Op.or]: [{ relatedCampaignId: null }, { relatedCampaignId: { [Op.notIn]: hiddenCampaignIds } }] });
    }
    if (exclusions.length) where[Op.and] = exclusions;

    // A profile's post feed — public data (published posts are visible to
    // anyone) filtered down to one author.
    if (req.query.userId) {
      where.type = "community_post";
      where.relatedUserId = req.query.userId;
    }

    // Hashtag filtering is a plain substring prefilter here (cheap, no extra
    // table) — the exact word-boundary match happens once more in JS below
    // so "#Community" doesn't also match "#CommunityXYZ".
    const hashtag = req.query.hashtag?.trim().replace(/^#/, "");
    if (hashtag) where.body = { [Op.like]: `%#${hashtag}%` };

    let activities = await CommunityActivity.findAll({
      where,
      order: [
        ["isPinned", "DESC"],
        ["publishedAt", "DESC"],
      ],
      limit: hashtag ? undefined : limit + 1,
      offset: hashtag ? undefined : offset,
    });

    let hasMore = false;
    if (hashtag) {
      const tagRe = new RegExp(`(^|[^\\w#])#${hashtag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i");
      activities = activities.filter((a) => tagRe.test(a.body || ""));
      hasMore = activities.length > offset + limit;
      activities = activities.slice(offset, offset + limit);
    } else {
      hasMore = activities.length > limit;
      activities = activities.slice(0, limit);
    }

    const userIds = [
      ...new Set(
        activities.filter((a) => (a.type === "new_user" || a.type === "community_post") && a.relatedUserId).map((a) => a.relatedUserId)
      ),
    ];
    const users = userIds.length ? await User.findAll({ where: { id: { [Op.in]: userIds } } }) : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const activityIds = activities.map((a) => a.id);
    const voteCountRows = activityIds.length
      ? await CommunityActivityVote.findAll({
          attributes: ["activityId", "value", [fn("COUNT", col("id")), "count"]],
          where: { activityId: { [Op.in]: activityIds } },
          group: ["activityId", "value"],
          raw: true,
        })
      : [];
    const voteCounts = {};
    for (const row of voteCountRows) {
      voteCounts[row.activityId] = voteCounts[row.activityId] || { like: 0, dislike: 0 };
      voteCounts[row.activityId][row.value] = Number(row.count);
    }

    let myVoteByActivity = {};
    if (req.user?.type === "user" && activityIds.length) {
      const myVotes = await CommunityActivityVote.findAll({
        where: { activityId: { [Op.in]: activityIds }, userId: req.user.id },
        attributes: ["activityId", "value"],
        raw: true,
      });
      myVoteByActivity = Object.fromEntries(myVotes.map((v) => [v.activityId, v.value]));
    }

    // Comment count includes the author's own soft-deleted comments (they
    // still occupy a slot in the thread as a "[deleted]" placeholder) but not
    // admin-hidden ones.
    const commentCountRows = activityIds.length
      ? await Comment.findAll({
          attributes: ["activityId", [fn("COUNT", col("id")), "count"]],
          where: { activityId: { [Op.in]: activityIds }, status: { [Op.ne]: "hidden" } },
          group: ["activityId"],
          raw: true,
        })
      : [];
    const commentCounts = Object.fromEntries(commentCountRows.map((r) => [r.activityId, Number(r.count)]));

    // Each image is its own likeable/commentable/reportable unit — fetch its
    // vote/comment counts the same way the post's own counts are built above.
    const images = activityIds.length
      ? await PostImage.findAll({ where: { activityId: { [Op.in]: activityIds }, status: "visible" }, order: [["sortOrder", "ASC"]] })
      : [];
    const imageIds = images.map((i) => i.id);
    const imageVoteRows = imageIds.length
      ? await PostImageVote.findAll({
          attributes: ["imageId", "value", [fn("COUNT", col("id")), "count"]],
          where: { imageId: { [Op.in]: imageIds } },
          group: ["imageId", "value"],
          raw: true,
        })
      : [];
    const imageVoteCounts = {};
    for (const row of imageVoteRows) {
      imageVoteCounts[row.imageId] = imageVoteCounts[row.imageId] || { like: 0, dislike: 0 };
      imageVoteCounts[row.imageId][row.value] = Number(row.count);
    }
    let myImageVotes = {};
    if (req.user?.type === "user" && imageIds.length) {
      const rows = await PostImageVote.findAll({ where: { imageId: { [Op.in]: imageIds }, userId: req.user.id }, attributes: ["imageId", "value"], raw: true });
      myImageVotes = Object.fromEntries(rows.map((v) => [v.imageId, v.value]));
    }
    const imageCommentCountRows = imageIds.length
      ? await Comment.findAll({
          attributes: ["imageId", [fn("COUNT", col("id")), "count"]],
          where: { imageId: { [Op.in]: imageIds }, status: { [Op.ne]: "hidden" } },
          group: ["imageId"],
          raw: true,
        })
      : [];
    const imageCommentCounts = Object.fromEntries(imageCommentCountRows.map((r) => [r.imageId, Number(r.count)]));

    const imagesByActivity = {};
    for (const img of images) {
      (imagesByActivity[img.activityId] = imagesByActivity[img.activityId] || []).push({
        id: img.id,
        url: img.url,
        likeCount: imageVoteCounts[img.id]?.like || 0,
        dislikeCount: imageVoteCounts[img.id]?.dislike || 0,
        userVote: myImageVotes[img.id] || null,
        commentCount: imageCommentCounts[img.id] || 0,
      });
    }

    const withUser = activities.map((a) => {
      const json = a.toJSON();
      if (a.type === "new_user" && a.relatedUserId) {
        const u = userById.get(a.relatedUserId);
        json.user = u
          ? {
              id: u.id,
              fullName: u.fullName,
              username: u.username,
              // Never send the raw address — only ever the masked form, so
              // the full value can't leak even if the frontend mishandles it.
              maskedEmail: u.email ? maskEmail(u.email) : null,
              maskedMobile: u.mobile ? maskMobile(u.mobile) : null,
              registeredAt: u.createdAt,
            }
          : { fullName: a.metadata?.fullName || null, username: a.metadata?.username || null };
      }
      if (a.type === "community_post" && a.relatedUserId) {
        const u = userById.get(a.relatedUserId);
        json.author = u ? { id: u.id, fullName: u.fullName } : null;
        json.isOwner = req.user?.type === "user" && req.user.id === a.relatedUserId;
      }
      json.likeCount = voteCounts[a.id]?.like || 0;
      json.dislikeCount = voteCounts[a.id]?.dislike || 0;
      json.userVote = myVoteByActivity[a.id] || null;
      json.commentCount = commentCounts[a.id] || 0;
      json.images = imagesByActivity[a.id] || [];
      return json;
    });

    res.json({ activities: withUser, hasMore });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const castVote = async (req, res) => {
  try {
    const { value } = req.body;
    if (!["like", "dislike"].includes(value)) return res.status(400).json({ message: "Invalid vote value." });

    const activity = await CommunityActivity.findOne({ where: { id: req.params.id, status: "published" } });
    if (!activity) return res.status(404).json({ message: "Post not found." });

    const existing = await CommunityActivityVote.findOne({ where: { activityId: activity.id, userId: req.user.id } });
    let userVote = value;
    if (existing) {
      if (existing.value === value) {
        await existing.destroy();
        userVote = null;
      } else {
        existing.value = value;
        await existing.save();
      }
    } else {
      await CommunityActivityVote.create({ activityId: activity.id, userId: req.user.id, value });
    }

    const counts = await CommunityActivityVote.findAll({
      attributes: ["value", [fn("COUNT", col("id")), "count"]],
      where: { activityId: activity.id },
      group: ["value"],
      raw: true,
    });
    const result = { like: 0, dislike: 0 };
    counts.forEach((c) => { result[c.value] = Number(c.count); });

    res.json({ likeCount: result.like, dislikeCount: result.dislike, userVote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// The full thread is returned flat (parentId links each node to its parent)
// and the client builds the nested tree — simpler than paginating every
// branch server-side, and comment volumes here don't warrant that complexity.
// Admin-hidden comments are dropped entirely; self-deleted ones stay as a
// placeholder row so replies underneath keep their place in the thread.
export const listComments = async (req, res) => {
  try {
    const { activityId } = req.params;
    // imageId: null keeps this the post's own thread — comments on a
    // specific image live in their own thread via listImageComments below.
    const comments = await Comment.findAll({
      where: { activityId, imageId: null, status: { [Op.ne]: "hidden" } },
      order: [["createdAt", "ASC"]],
    });

    const userIds = [...new Set(comments.map((c) => c.userId))];
    const users = userIds.length ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "fullName"] }) : [];
    const userById = Object.fromEntries(users.map((u) => [u.id, u]));

    let reportedIds = new Set();
    if (req.user?.type === "user" && comments.length) {
      const myReports = await ContentReport.findAll({
        where: { targetType: "comment", targetId: { [Op.in]: comments.map((c) => c.id) }, reporterId: req.user.id },
        attributes: ["targetId"],
      });
      reportedIds = new Set(myReports.map((r) => r.targetId));
    }

    const commentIds = comments.map((c) => c.id);
    const voteCountRows = commentIds.length
      ? await CommentVote.findAll({
          attributes: ["commentId", "value", [fn("COUNT", col("id")), "count"]],
          where: { commentId: { [Op.in]: commentIds } },
          group: ["commentId", "value"],
          raw: true,
        })
      : [];
    const voteCounts = {};
    for (const row of voteCountRows) {
      voteCounts[row.commentId] = voteCounts[row.commentId] || { like: 0, dislike: 0 };
      voteCounts[row.commentId][row.value] = Number(row.count);
    }

    let myVoteByComment = {};
    if (req.user?.type === "user" && commentIds.length) {
      const myVotes = await CommentVote.findAll({
        where: { commentId: { [Op.in]: commentIds }, userId: req.user.id },
        attributes: ["commentId", "value"],
        raw: true,
      });
      myVoteByComment = Object.fromEntries(myVotes.map((v) => [v.commentId, v.value]));
    }

    const result = comments.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      body: c.status === "deleted" ? null : c.body,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      edited: c.status === "visible" && c.updatedAt.getTime() !== c.createdAt.getTime(),
      author: userById[c.userId] ? { id: userById[c.userId].id, fullName: userById[c.userId].fullName } : null,
      isOwner: req.user?.type === "user" && req.user.id === c.userId,
      alreadyReported: reportedIds.has(c.id),
      likeCount: voteCounts[c.id]?.like || 0,
      dislikeCount: voteCounts[c.id]?.dislike || 0,
      userVote: myVoteByComment[c.id] || null,
    }));

    res.json({ comments: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createComment = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { parentId, body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: "Comment cannot be empty." });

    const activity = await CommunityActivity.findOne({ where: { id: activityId, status: "published" } });
    if (!activity) return res.status(404).json({ message: "Post not found." });

    let parent = null;
    if (parentId) {
      parent = await Comment.findOne({ where: { id: parentId, activityId } });
      if (!parent) return res.status(400).json({ message: "Invalid comment to reply to." });
    }

    const { maxCommentLength, maxReplyLength } = await getContentLimits();
    const limit = parentId ? maxReplyLength : maxCommentLength;
    if (body.trim().length > limit) {
      return res.status(400).json({ message: `${parentId ? "Replies" : "Comments"} can be at most ${limit} characters.` });
    }

    const comment = await Comment.create({ activityId, parentId: parentId || null, userId: req.user.id, body: body.trim() });
    const user = await User.findByPk(req.user.id, { attributes: ["id", "fullName"] });

    if (parent) {
      notifyReply({ parentUserId: parent.userId, actorId: req.user.id, actorName: user?.fullName || "Someone", body: comment.body, link: "/my-community" });
    }
    notifyMentions(comment.body, { actorId: req.user.id, actorName: user?.fullName || "Someone" });

    res.status(201).json({
      comment: {
        id: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        status: comment.status,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        edited: false,
        author: user ? { id: user.id, fullName: user.fullName } : null,
        isOwner: true,
        alreadyReported: false,
        likeCount: 0,
        dislikeCount: 0,
        userVote: null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const castCommentVote = async (req, res) => {
  try {
    const { value } = req.body;
    if (!["like", "dislike"].includes(value)) return res.status(400).json({ message: "Invalid vote value." });

    const comment = await Comment.findOne({ where: { id: req.params.id, activityId: req.params.activityId, status: { [Op.ne]: "hidden" } } });
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const existing = await CommentVote.findOne({ where: { commentId: comment.id, userId: req.user.id } });
    let userVote = value;
    if (existing) {
      if (existing.value === value) {
        await existing.destroy();
        userVote = null;
      } else {
        existing.value = value;
        await existing.save();
      }
    } else {
      await CommentVote.create({ commentId: comment.id, userId: req.user.id, value });
    }

    const counts = await CommentVote.findAll({
      attributes: ["value", [fn("COUNT", col("id")), "count"]],
      where: { commentId: comment.id },
      group: ["value"],
      raw: true,
    });
    const result = { like: 0, dislike: 0 };
    counts.forEach((c) => { result[c.value] = Number(c.count); });

    res.json({ likeCount: result.like, dislikeCount: result.dislike, userVote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ where: { id: req.params.id, activityId: req.params.activityId } });
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.userId !== req.user.id) return res.status(403).json({ message: "You can only edit your own comments." });
    if (comment.status !== "visible") return res.status(400).json({ message: "This comment can no longer be edited." });

    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: "Comment cannot be empty." });

    const { maxCommentLength, maxReplyLength } = await getContentLimits();
    const limit = comment.parentId ? maxReplyLength : maxCommentLength;
    if (body.trim().length > limit) {
      return res.status(400).json({ message: `${comment.parentId ? "Replies" : "Comments"} can be at most ${limit} characters.` });
    }

    comment.body = body.trim();
    await comment.save();
    res.json({ comment: { id: comment.id, body: comment.body, updatedAt: comment.updatedAt, edited: true } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ where: { id: req.params.id, activityId: req.params.activityId } });
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.userId !== req.user.id) return res.status(403).json({ message: "You can only delete your own comments." });

    comment.status = "deleted";
    comment.body = "";
    await comment.save();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createPost = async (req, res) => {
  try {
    const body = req.body.body?.trim() || null;
    const files = req.files || [];

    if (!body && files.length === 0) {
      return res.status(400).json({ message: "Write something or add a photo/video to post." });
    }

    const { maxPostLength } = await getContentLimits();
    if (body && body.length > maxPostLength) {
      files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ message: `Posts can be at most ${maxPostLength} characters.` });
    }

    const oversizedImage = files.find((f) => mediaTypeOf(f.mimetype) === "photo" && f.size > IMAGE_MAX_BYTES);
    if (oversizedImage) {
      files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ message: `Photos must be under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB. "${oversizedImage.originalname}" is too large.` });
    }

    const videoFiles = files.filter((f) => mediaTypeOf(f.mimetype) === "video");
    if (videoFiles.length > 1) {
      files.forEach((f) => fs.unlink(f.path, () => {}));
      return res.status(400).json({ message: "Only one video is allowed per post." });
    }

    const imageFiles = files.filter((f) => mediaTypeOf(f.mimetype) === "photo");
    const videoUrl = videoFiles.length ? `/uploads/wall-post-media/${videoFiles[0].filename}` : null;

    const activity = await CommunityActivity.create({
      type: "community_post",
      body,
      relatedUserId: req.user.id,
      mediaVideoUrl: videoUrl,
      status: "published",
      publishedAt: new Date(),
    });

    const createdImages = imageFiles.length
      ? await PostImage.bulkCreate(
          imageFiles.map((f, i) => ({
            activityId: activity.id,
            url: `/uploads/wall-post-media/${f.filename}`,
            sortOrder: i,
          }))
        )
      : [];

    const user = await User.findByPk(req.user.id, { attributes: ["id", "fullName"] });

    notifyMentions(activity.body, { actorId: req.user.id, actorName: user?.fullName || "Someone" });

    res.status(201).json({
      activity: {
        ...activity.toJSON(),
        author: user ? { id: user.id, fullName: user.fullName } : null,
        isOwner: true,
        likeCount: 0,
        dislikeCount: 0,
        userVote: null,
        commentCount: 0,
        images: createdImages.map((img) => ({ id: img.id, url: img.url, likeCount: 0, dislikeCount: 0, userVote: null, commentCount: 0 })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const activity = await CommunityActivity.findOne({ where: { id: req.params.id, type: "community_post" } });
    if (!activity) return res.status(404).json({ message: "Post not found." });
    if (activity.relatedUserId !== req.user.id) return res.status(403).json({ message: "You can only edit your own posts." });

    const body = req.body.body?.trim();
    const hasImages = (await PostImage.count({ where: { activityId: activity.id } })) > 0;
    if (!body && !hasImages && !activity.mediaVideoUrl) {
      return res.status(400).json({ message: "A post needs text or media." });
    }

    const { maxPostLength } = await getContentLimits();
    if (body && body.length > maxPostLength) {
      return res.status(400).json({ message: `Posts can be at most ${maxPostLength} characters.` });
    }

    activity.body = body || null;
    await activity.save();
    res.json({ activity: activity.toJSON() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const activity = await CommunityActivity.findOne({ where: { id: req.params.id, type: "community_post" } });
    if (!activity) return res.status(404).json({ message: "Post not found." });
    if (activity.relatedUserId !== req.user.id) return res.status(403).json({ message: "You can only delete your own posts." });

    const commentIds = (await Comment.findAll({ where: { activityId: activity.id }, attributes: ["id"] })).map((c) => c.id);
    if (commentIds.length) {
      await CommentVote.destroy({ where: { commentId: { [Op.in]: commentIds } } });
      await ContentReport.destroy({ where: { targetType: "comment", targetId: { [Op.in]: commentIds } } });
      await Comment.destroy({ where: { id: { [Op.in]: commentIds } } });
    }
    await CommunityActivityVote.destroy({ where: { activityId: activity.id } });
    await ContentReport.destroy({ where: { targetType: "activity", targetId: activity.id } });

    const images = await PostImage.findAll({ where: { activityId: activity.id } });
    if (images.length) {
      const imageIds = images.map((i) => i.id);
      const imageCommentIds = (await Comment.findAll({ where: { imageId: { [Op.in]: imageIds } }, attributes: ["id"] })).map((c) => c.id);
      if (imageCommentIds.length) {
        await CommentVote.destroy({ where: { commentId: { [Op.in]: imageCommentIds } } });
        await ContentReport.destroy({ where: { targetType: "comment", targetId: { [Op.in]: imageCommentIds } } });
        await Comment.destroy({ where: { id: { [Op.in]: imageCommentIds } } });
      }
      await PostImageVote.destroy({ where: { imageId: { [Op.in]: imageIds } } });
      await ContentReport.destroy({ where: { targetType: "image", targetId: { [Op.in]: imageIds } } });
      await PostImage.destroy({ where: { id: { [Op.in]: imageIds } } });
    }

    [...images.map((i) => i.url), activity.mediaVideoUrl].filter(Boolean).forEach((url) => {
      fs.unlink(`.${url}`, () => {});
    });

    await activity.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const castImageVote = async (req, res) => {
  try {
    const { value } = req.body;
    if (!["like", "dislike"].includes(value)) return res.status(400).json({ message: "Invalid vote value." });

    const image = await PostImage.findOne({ where: { id: req.params.imageId, status: "visible" } });
    if (!image) return res.status(404).json({ message: "Image not found." });

    const existing = await PostImageVote.findOne({ where: { imageId: image.id, userId: req.user.id } });
    let userVote = value;
    if (existing) {
      if (existing.value === value) {
        await existing.destroy();
        userVote = null;
      } else {
        existing.value = value;
        await existing.save();
      }
    } else {
      await PostImageVote.create({ imageId: image.id, userId: req.user.id, value });
    }

    const counts = await PostImageVote.findAll({
      attributes: ["value", [fn("COUNT", col("id")), "count"]],
      where: { imageId: image.id },
      group: ["value"],
      raw: true,
    });
    const result = { like: 0, dislike: 0 };
    counts.forEach((c) => { result[c.value] = Number(c.count); });

    res.json({ likeCount: result.like, dislikeCount: result.dislike, userVote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mirrors listComments/createComment/updateComment/deleteComment above, kept
// separate rather than parameterized so the post thread and each image's
// thread stay unambiguous, simple call sites.
export const listImageComments = async (req, res) => {
  try {
    const { imageId } = req.params;
    const comments = await Comment.findAll({
      where: { imageId, status: { [Op.ne]: "hidden" } },
      order: [["createdAt", "ASC"]],
    });

    const userIds = [...new Set(comments.map((c) => c.userId))];
    const users = userIds.length ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "fullName"] }) : [];
    const userById = Object.fromEntries(users.map((u) => [u.id, u]));

    let reportedIds = new Set();
    if (req.user?.type === "user" && comments.length) {
      const myReports = await ContentReport.findAll({
        where: { targetType: "comment", targetId: { [Op.in]: comments.map((c) => c.id) }, reporterId: req.user.id },
        attributes: ["targetId"],
      });
      reportedIds = new Set(myReports.map((r) => r.targetId));
    }

    const commentIds = comments.map((c) => c.id);
    const voteCountRows = commentIds.length
      ? await CommentVote.findAll({
          attributes: ["commentId", "value", [fn("COUNT", col("id")), "count"]],
          where: { commentId: { [Op.in]: commentIds } },
          group: ["commentId", "value"],
          raw: true,
        })
      : [];
    const voteCounts = {};
    for (const row of voteCountRows) {
      voteCounts[row.commentId] = voteCounts[row.commentId] || { like: 0, dislike: 0 };
      voteCounts[row.commentId][row.value] = Number(row.count);
    }

    let myVoteByComment = {};
    if (req.user?.type === "user" && commentIds.length) {
      const myVotes = await CommentVote.findAll({
        where: { commentId: { [Op.in]: commentIds }, userId: req.user.id },
        attributes: ["commentId", "value"],
        raw: true,
      });
      myVoteByComment = Object.fromEntries(myVotes.map((v) => [v.commentId, v.value]));
    }

    const result = comments.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      body: c.status === "deleted" ? null : c.body,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      edited: c.status === "visible" && c.updatedAt.getTime() !== c.createdAt.getTime(),
      author: userById[c.userId] ? { id: userById[c.userId].id, fullName: userById[c.userId].fullName } : null,
      isOwner: req.user?.type === "user" && req.user.id === c.userId,
      alreadyReported: reportedIds.has(c.id),
      likeCount: voteCounts[c.id]?.like || 0,
      dislikeCount: voteCounts[c.id]?.dislike || 0,
      userVote: myVoteByComment[c.id] || null,
    }));

    res.json({ comments: result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createImageComment = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { parentId, body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: "Comment cannot be empty." });

    const image = await PostImage.findOne({ where: { id: imageId, status: "visible" } });
    if (!image) return res.status(404).json({ message: "Image not found." });

    let parent = null;
    if (parentId) {
      parent = await Comment.findOne({ where: { id: parentId, imageId } });
      if (!parent) return res.status(400).json({ message: "Invalid comment to reply to." });
    }

    const { maxCommentLength, maxReplyLength } = await getContentLimits();
    const limit = parentId ? maxReplyLength : maxCommentLength;
    if (body.trim().length > limit) {
      return res.status(400).json({ message: `${parentId ? "Replies" : "Comments"} can be at most ${limit} characters.` });
    }

    const comment = await Comment.create({
      activityId: image.activityId,
      imageId: image.id,
      parentId: parentId || null,
      userId: req.user.id,
      body: body.trim(),
    });
    const user = await User.findByPk(req.user.id, { attributes: ["id", "fullName"] });

    if (parent) {
      notifyReply({ parentUserId: parent.userId, actorId: req.user.id, actorName: user?.fullName || "Someone", body: comment.body, link: "/my-community" });
    }
    notifyMentions(comment.body, { actorId: req.user.id, actorName: user?.fullName || "Someone" });

    res.status(201).json({
      comment: {
        id: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        status: comment.status,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        edited: false,
        author: user ? { id: user.id, fullName: user.fullName } : null,
        isOwner: true,
        alreadyReported: false,
        likeCount: 0,
        dislikeCount: 0,
        userVote: null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateImageComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ where: { id: req.params.id, imageId: req.params.imageId } });
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.userId !== req.user.id) return res.status(403).json({ message: "You can only edit your own comments." });
    if (comment.status !== "visible") return res.status(400).json({ message: "This comment can no longer be edited." });

    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ message: "Comment cannot be empty." });

    const { maxCommentLength, maxReplyLength } = await getContentLimits();
    const limit = comment.parentId ? maxReplyLength : maxCommentLength;
    if (body.trim().length > limit) {
      return res.status(400).json({ message: `${comment.parentId ? "Replies" : "Comments"} can be at most ${limit} characters.` });
    }

    comment.body = body.trim();
    await comment.save();
    res.json({ comment: { id: comment.id, body: comment.body, updatedAt: comment.updatedAt, edited: true } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteImageComment = async (req, res) => {
  try {
    const comment = await Comment.findOne({ where: { id: req.params.id, imageId: req.params.imageId } });
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.userId !== req.user.id) return res.status(403).json({ message: "You can only delete your own comments." });

    comment.status = "deleted";
    comment.body = "";
    await comment.save();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
