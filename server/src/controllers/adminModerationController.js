import { Op } from "sequelize";
import ModerationSettings from "../models/ModerationSettings.js";
import ContentReport from "../models/ContentReport.js";
import Masjid from "../models/Masjid.js";
import Campaign from "../models/Campaign.js";
import CommunityActivity from "../models/CommunityActivity.js";
import Comment from "../models/Comment.js";
import PostImage from "../models/PostImage.js";
import User from "../models/User.js";

const TARGET_MODEL = { masjid: Masjid, campaign: Campaign, activity: CommunityActivity, comment: Comment, image: PostImage };
const CONTENT_TYPE_LABEL = { masjid: "Masjid", campaign: "Campaign", activity: "Wall Post", comment: "Comment", image: "Image" };
// masjid/campaign gate visibility via a separate moderationStatus field;
// activity/comment/image have no approval workflow to protect, so their own
// status field doubles as the moderation flag directly.
const STATUS_FIELD_TYPES = new Set(["activity", "comment", "image"]);
const ACTIVE_STATUS_VALUE = { activity: "published", comment: "visible", image: "visible" };

export const getSettings = async (req, res) => {
  try {
    const settings = await ModerationSettings.findByPk(1);
    res.json({ reportThreshold: settings?.reportThreshold ?? 10 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const { reportThreshold } = req.body;
    const n = Number(reportThreshold);
    if (!Number.isInteger(n) || n < 1) return res.status(400).json({ message: "Threshold must be a whole number of at least 1." });

    const [settings] = await ModerationSettings.findOrCreate({ where: { id: 1 }, defaults: { id: 1, reportThreshold: n } });
    settings.reportThreshold = n;
    await settings.save();
    res.json({ reportThreshold: settings.reportThreshold });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function statusFor(targetType, target) {
  if (STATUS_FIELD_TYPES.has(targetType)) return target.status === "hidden" ? "under_review" : "active";
  return target.moderationStatus;
}

export const listReportedContent = async (req, res) => {
  try {
    const settings = await ModerationSettings.findByPk(1);
    const threshold = settings?.reportThreshold ?? 10;

    const [masjids, campaigns, activities, comments, images] = await Promise.all([
      Masjid.findAll({ where: { reportCount: { [Op.gt]: 0 } }, order: [["reportCount", "DESC"]] }),
      Campaign.findAll({ where: { reportCount: { [Op.gt]: 0 } }, order: [["reportCount", "DESC"]] }),
      CommunityActivity.findAll({ where: { reportCount: { [Op.gt]: 0 } }, order: [["reportCount", "DESC"]] }),
      Comment.findAll({ where: { reportCount: { [Op.gt]: 0 } }, order: [["reportCount", "DESC"]] }),
      PostImage.findAll({ where: { reportCount: { [Op.gt]: 0 } }, order: [["reportCount", "DESC"]] }),
    ]);

    const rows = [
      ...masjids.map((m) => ({
        targetType: "masjid",
        targetId: m.id,
        name: m.name,
        reportCount: m.reportCount,
        threshold,
        status: statusFor("masjid", m),
        updatedAt: m.updatedAt,
      })),
      ...campaigns.map((c) => ({
        targetType: "campaign",
        targetId: c.id,
        name: c.title,
        reportCount: c.reportCount,
        threshold,
        status: statusFor("campaign", c),
        updatedAt: c.updatedAt,
      })),
      ...activities.map((a) => ({
        targetType: "activity",
        targetId: a.id,
        name: a.title || a.body?.slice(0, 60) || `Post #${a.id}`,
        reportCount: a.reportCount,
        threshold,
        status: statusFor("activity", a),
        updatedAt: a.updatedAt,
      })),
      ...comments.map((c) => ({
        targetType: "comment",
        targetId: c.id,
        name: c.body?.slice(0, 60) || `Comment #${c.id}`,
        reportCount: c.reportCount,
        threshold,
        status: statusFor("comment", c),
        updatedAt: c.updatedAt,
      })),
      ...images.map((i) => ({
        targetType: "image",
        targetId: i.id,
        name: `Image on post #${i.activityId}`,
        reportCount: i.reportCount,
        threshold,
        status: statusFor("image", i),
        updatedAt: i.updatedAt,
      })),
    ].sort((x, y) => new Date(y.updatedAt) - new Date(x.updatedAt));

    res.json({ content: rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getContentDetail = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const Model = TARGET_MODEL[targetType];
    if (!Model) return res.status(400).json({ message: "Invalid content type." });

    const target = await Model.findByPk(targetId);
    if (!target) return res.status(404).json({ message: "Content not found." });

    const reports = await ContentReport.findAll({ where: { targetType, targetId }, order: [["createdAt", "DESC"]] });
    const reporterIds = [...new Set(reports.map((r) => r.reporterId))];
    const reporters = reporterIds.length ? await User.findAll({ where: { id: { [Op.in]: reporterIds } }, attributes: ["id", "fullName", "email"] }) : [];
    const reporterById = Object.fromEntries(reporters.map((u) => [u.id, u]));

    let owner = null;
    if (targetType === "masjid") owner = await User.findByPk(target.userId, { attributes: ["id", "fullName", "email"] });
    else if (targetType === "campaign") owner = await User.findByPk(target.createdBy, { attributes: ["id", "fullName", "email"] });
    else if (targetType === "comment") owner = await User.findByPk(target.userId, { attributes: ["id", "fullName", "email"] });
    else if (targetType === "image") {
      const post = await CommunityActivity.findByPk(target.activityId, { attributes: ["relatedUserId"] });
      if (post?.relatedUserId) owner = await User.findByPk(post.relatedUserId, { attributes: ["id", "fullName", "email"] });
    }

    const settings = await ModerationSettings.findByPk(1);

    res.json({
      content: {
        targetType,
        targetId: target.id,
        name:
          targetType === "masjid"
            ? target.name
            : targetType === "campaign"
            ? target.title
            : targetType === "image"
            ? `Image on post #${target.activityId}`
            : target.title || target.body,
        activityId: targetType === "comment" || targetType === "image" ? target.activityId : undefined,
        imageUrl: targetType === "image" ? target.url : undefined,
        contentTypeLabel: CONTENT_TYPE_LABEL[targetType],
        reportCount: target.reportCount,
        threshold: settings?.reportThreshold ?? 10,
        status: statusFor(targetType, target),
        moderationReviewedAt: target.moderationReviewedAt || null,
        owner,
        raw: target.toJSON(),
      },
      reports: reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        comment: r.comment,
        status: r.status,
        createdAt: r.createdAt,
        reporter: reporterById[r.reporterId] || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const takeAction = async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    const { action } = req.body;
    const Model = TARGET_MODEL[targetType];
    if (!Model) return res.status(400).json({ message: "Invalid content type." });
    if (!["keep_active", "resolve", "keep_hidden", "remove"].includes(action)) {
      return res.status(400).json({ message: "Invalid action." });
    }

    const target = await Model.findByPk(targetId);
    if (!target) return res.status(404).json({ message: "Content not found." });

    if (action === "keep_active" || action === "resolve") {
      await ContentReport.update({ status: "closed" }, { where: { targetType, targetId, status: "open" } });
      target.reportCount = 0;
      if (STATUS_FIELD_TYPES.has(targetType)) {
        target.status = ACTIVE_STATUS_VALUE[targetType];
        if (targetType === "activity" && !target.publishedAt) target.publishedAt = new Date();
      } else {
        target.moderationStatus = "active";
        target.moderationReviewedAt = new Date();
      }
    } else if (action === "keep_hidden") {
      if (!STATUS_FIELD_TYPES.has(targetType)) target.moderationReviewedAt = new Date();
    } else if (action === "remove") {
      await ContentReport.update({ status: "closed" }, { where: { targetType, targetId, status: "open" } });
      if (targetType === "masjid") {
        target.status = "deleted";
        target.deletedAt = new Date();
        target.deletionReason = "Removed by admin — content moderation";
      } else if (targetType === "campaign") {
        target.status = "cancelled";
      } else {
        target.status = "hidden";
      }
      if (!STATUS_FIELD_TYPES.has(targetType)) target.moderationReviewedAt = new Date();
    }

    await target.save();
    res.json({ status: statusFor(targetType, target) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
