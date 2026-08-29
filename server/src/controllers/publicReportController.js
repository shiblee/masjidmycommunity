import ReportReason from "../models/ReportReason.js";
import ContentReport from "../models/ContentReport.js";
import ModerationSettings from "../models/ModerationSettings.js";
import Masjid from "../models/Masjid.js";
import Campaign from "../models/Campaign.js";
import CommunityActivity from "../models/CommunityActivity.js";
import Comment from "../models/Comment.js";
import PostImage from "../models/PostImage.js";
import User from "../models/User.js";
import { sendModerationThresholdReachedEmail } from "../services/emailService.js";

export const listReportReasons = async (req, res) => {
  try {
    const reasons = await ReportReason.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name"] });
    res.json({ reasons });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const TARGET_MODEL = { masjid: Masjid, campaign: Campaign, activity: CommunityActivity, comment: Comment, image: PostImage };
const CONTENT_TYPE_LABEL = { masjid: "Masjid", campaign: "Campaign", activity: "Wall Post", comment: "Comment", image: "Image" };
// masjid/campaign gate public visibility via moderationStatus (separate from
// their approval workflow); activity/comment/image have no such second
// status, so hiding them just flips their own status field directly.
const STATUS_FIELD_TYPES = new Set(["activity", "comment", "image"]);

async function contentNameFor(targetType, target) {
  if (targetType === "masjid") return target.name;
  if (targetType === "campaign") return target.title;
  if (targetType === "comment") {
    const author = await User.findByPk(target.userId, { attributes: ["fullName"] });
    return `Comment by ${author?.fullName || "a user"}: "${target.body?.slice(0, 60) || ""}"`;
  }
  if (targetType === "image") return `Image on post #${target.activityId}`;
  return target.title || target.body?.slice(0, 60) || `Post #${target.id}`;
}

export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, activityId, reason, comment } = req.body;

    if (!TARGET_MODEL[targetType]) return res.status(400).json({ message: "Invalid report target." });
    if (!targetId) return res.status(400).json({ message: "Missing content to report." });

    const trimmedReason = reason?.trim();
    const validReason = trimmedReason && (await ReportReason.findOne({ where: { name: trimmedReason, isActive: true } }));
    if (!validReason) return res.status(400).json({ message: "Please select a reason for reporting." });
    if (trimmedReason === "Other" && !comment?.trim()) {
      return res.status(400).json({ message: "Please describe the reason for reporting." });
    }

    const Model = TARGET_MODEL[targetType];
    const target = await Model.findByPk(targetId);
    if (!target) return res.status(404).json({ message: "This content no longer exists." });

    const existing = await ContentReport.findOne({ where: { targetType, targetId, reporterId: req.user.id } });
    if (existing) return res.status(409).json({ message: "You've already reported this content." });

    await ContentReport.create({
      targetType,
      targetId,
      activityId: activityId || null,
      reporterId: req.user.id,
      reason: trimmedReason,
      comment: comment?.trim() || null,
    });

    const openCount = await ContentReport.count({ where: { targetType, targetId, status: "open" } });

    const settings = await ModerationSettings.findByPk(1);
    const threshold = settings?.reportThreshold ?? 10;

    let thresholdReached = false;
    const alreadyHidden = STATUS_FIELD_TYPES.has(targetType) ? target.status === "hidden" : target.moderationStatus === "under_review";

    if (openCount >= threshold && !alreadyHidden) {
      thresholdReached = true;
      if (STATUS_FIELD_TYPES.has(targetType)) {
        target.status = "hidden";
      } else {
        target.moderationStatus = "under_review";
      }
      target.reportCount = openCount;
      await target.save();

      await sendModerationThresholdReachedEmail({
        contentType: CONTENT_TYPE_LABEL[targetType],
        contentName: await contentNameFor(targetType, target),
        reportCount: openCount,
        threshold,
      });
    } else {
      target.reportCount = openCount;
      await target.save();
    }

    res.status(201).json({ reportCount: openCount, thresholdReached });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "You've already reported this content." });
    res.status(500).json({ message: error.message });
  }
};
