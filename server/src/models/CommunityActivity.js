import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const CommunityActivity = sequelize.define(
  "CommunityActivity",
  {
    type: {
      type: DataTypes.ENUM(
        "new_user",
        "masjid_approved",
        "campaign_approved",
        "donation",
        "milestone",
        "project_update",
        "announcement",
        "community_post",
        "job_posted",
        // A short vertical video, otherwise just a community_post with a
        // mandatory video and a duration cap -- reuses this same row shape
        // (and therefore Comment/CommunityActivityVote, both keyed on
        // activityId) rather than a parallel entity.
        "reel"
      ),
      allowNull: false,
    },
    title: { type: DataTypes.STRING, allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: true },
    imageUrl: { type: DataTypes.STRING, allowNull: true },

    // User-authored Wall posts only ("community_post"). Images live in their
    // own PostImage rows (so each can carry its own likes/comments/reports);
    // video stays a single URL here since only one is allowed per post.
    mediaVideoUrl: { type: DataTypes.STRING, allowNull: true },
    // Real frame extracted server-side at upload time (see
    // server/src/utils/videoThumbnail.js) -- the same approach masjid photo
    // uploads already use. Nullable/no-default, appended after the fact
    // like relatedCampaignId: posts uploaded before this existed just have
    // no poster, and MediaThumb.jsx already falls back gracefully for those.
    mediaVideoPosterUrl: { type: DataTypes.STRING, allowNull: true },

    relatedMasjidId: { type: DataTypes.INTEGER, allowNull: true },
    relatedUserId: { type: DataTypes.INTEGER, allowNull: true },
    relatedCampaignId: { type: DataTypes.INTEGER, allowNull: true },
    // Nullable, no default — appended after the fact like relatedCampaignId
    // originally was; see the skills-column incident note on Job.js for why
    // this matters (no NOT NULL+DEFAULT on an ALTERed column).
    relatedJobId: { type: DataTypes.INTEGER, allowNull: true },

    metadata: { type: DataTypes.JSON, allowNull: true },

    status: {
      // "deleted" is only ever set by a user deleting their own Reel (see
      // deleteReel in publicCommunityController.js) -- a soft delete, not
      // the hard deleteActivityCascade() used elsewhere, specifically so it
      // stays visible to admins on the Deleted Reels page. Distinct from
      // "hidden" (an admin moderation action) on purpose: the two have
      // different actors and different reasons.
      type: DataTypes.ENUM("published", "pending_review", "hidden", "deleted"),
      allowNull: false,
      defaultValue: "published",
    },
    isPinned: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publishedAt: { type: DataTypes.DATE, allowNull: true },

    // Community-report moderation, for activity posts with no masjid/campaign
    // to attach the report to instead (e.g. a new-member post).
    reportCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // Set only when status becomes "deleted" -- the ReelDeletionReason name
    // the author picked (kept as a plain string, same "name referenced
    // directly, not as an FK" pattern as Concern.concernType), an optional
    // free-text comment (required by the client when reason === "Other"),
    // and when it happened.
    deletionReason: { type: DataTypes.STRING, allowNull: true },
    deletionComment: { type: DataTypes.TEXT, allowNull: true },
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "community_activities",
    // Replaces the old lone `status`/`type` single-column indexes (fully
    // subsumed by these composites as a leading-column prefix, so keeping
    // both would only add write overhead for no read benefit). Chosen to
    // match the real WHERE/ORDER BY shapes listPublished() actually runs
    // (see the Community Wall Performance & Scalability audit) -- every
    // feed variant filters on `status` and sorts by `publishedAt`, so that
    // pair anchors every index below; the leading column is whichever
    // filter narrows that particular feed variant down.
    indexes: [
      // The main Wall feed (no masjid/campaign/user/job filter).
      { fields: ["status", "publishedAt"], name: "activities_status_published_idx" },
      // The Reels rail (type="reel") and a profile's own feed (type="community_post").
      { fields: ["type", "status", "publishedAt"], name: "activities_type_status_published_idx" },
      // Masjid Community Hub's Wall tab.
      { fields: ["relatedMasjidId", "status", "publishedAt"], name: "activities_masjid_status_published_idx" },
      // Campaign Detail Page's embedded post.
      { fields: ["relatedCampaignId", "status", "publishedAt"], name: "activities_campaign_status_published_idx" },
      // A user's own profile feed, keyed by author rather than type.
      { fields: ["relatedUserId", "status", "publishedAt"], name: "activities_user_status_published_idx" },
      // Job Detail Page's embedded post -- low-cardinality/low-traffic
      // enough that publishedAt isn't worth adding to this one.
      { fields: ["relatedJobId", "status"], name: "activities_job_status_idx" },
    ],
  }
);

export default CommunityActivity;
