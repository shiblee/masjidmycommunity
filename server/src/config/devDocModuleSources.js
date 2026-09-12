// Declarative map from a Developer-doc module key to the real Sequelize
// models and Express route files that back it. "Sync Documentation" reads
// this list, then introspects the actual model/route modules at runtime
// (see adminDeveloperController.js's introspectModel/introspectRoutes) to
// regenerate that module's Database Tables and APIs sections from the real
// implementation -- this file only says *where to look*, never documents
// facts itself.
//
// A route file's `only` list filters its registered paths down to the ones
// relevant to this module -- the same route file commonly serves several
// modules (e.g. publicCommunityRoutes.js backs Community Wall, Posts,
// Comments & Replies, and Likes / Engagement, each with a different slice
// of its paths).
export const MODULE_SOURCES = {
  "registration": {
    models: ["User", "UserSession", "UserActivityLog", "AuthSettings", "CommunityActivity", "EmailTemplate", "EmailLog", "EmailSettings"],
    routeFiles: [{ file: "userRoutes.js", only: ["/register", "/verify-otp", "/resend-otp"] }],
  },
  "login-authentication": {
    models: ["User", "UserSession", "UserActivityLog", "AuthSettings"],
    routeFiles: [{ file: "userRoutes.js", only: ["/login", "/login/otp/send", "/refresh-token", "/logout"] }],
  },
  "my-profile": {
    models: ["User", "Education", "WorkExperience", "UserSkill", "Skill", "UserHobby", "Hobby", "Masjid", "Campaign", "Job", "MasjidFavorite", "JobFavorite", "CommunityActivity"],
    routeFiles: [
      { file: "publicUserRoutes.js", only: ["/:username"] },
      { file: "userRoutes.js", only: ["/me"] },
      { file: "publicCommunityRoutes.js", only: ["/activities", "/posts"] },
    ],
  },
  "other-user-profile": {
    models: ["User", "Masjid", "Campaign", "Job", "MasjidFavorite", "JobFavorite", "CommunityActivity", "Comment"],
    routeFiles: [{ file: "publicUserRoutes.js", only: ["/:username"] }],
  },
  "community-wall": {
    models: ["CommunityActivity", "CommunityActivityVote", "Comment", "CommentVote", "PostImage", "PostImageVote", "ContentSettings"],
    routeFiles: [{ file: "publicCommunityRoutes.js", only: ["/activities", "/activities/:id/vote", "/content-settings", "/stats"] }],
  },
  "posts": {
    models: ["CommunityActivity", "PostImage", "ContentReport"],
    routeFiles: [{ file: "publicCommunityRoutes.js", only: ["/posts", "/posts/:id"] }],
  },
  "comments-replies": {
    models: ["Comment", "CommentVote"],
    routeFiles: [{
      file: "publicCommunityRoutes.js",
      only: ["/activities/:activityId/comments", "/activities/:activityId/comments/:id", "/images/:imageId/comments", "/images/:imageId/comments/:id"],
    }],
  },
  "likes-engagement": {
    models: ["CommunityActivityVote", "PostImageVote", "CommentVote"],
    routeFiles: [{
      file: "publicCommunityRoutes.js",
      only: ["/activities/:id/vote", "/images/:imageId/vote", "/activities/:activityId/comments/:id/vote", "/images/:imageId/comments/:id/vote"],
    }],
  },
  "reels": {
    models: ["CommunityActivity"],
    routeFiles: [{ file: "publicCommunityRoutes.js", only: ["/reels"] }],
  },
  "registered-users-directory": {
    models: ["User"],
    routeFiles: [{ file: "publicUserRoutes.js", only: ["/"] }],
  },
  "notifications": {
    models: ["UserNotification"],
    routeFiles: [{ file: "userRoutes.js", only: ["/notifications", "/notifications/read-all", "/notifications/:id/read"] }],
  },
  "masjid": {
    models: ["Masjid", "MasjidPhoto", "MasjidPrayerTimeline", "MasjidFavorite", "MasjidReview", "MasjidCorrectionRequest", "GreenTickApplication"],
    routeFiles: [{ file: "publicMasjidRoutes.js", only: ["/", "/:id", "/:id/favorite", "/:id/prayer-times", "/:id/reviews", "/:id/suggest-edit", "/:id/likers"] }],
  },
  "prayer-times": {
    models: ["PrayerMaster", "MasjidPrayerTimeline", "MasjidPrayerTimeChangeLog", "SalahLog"],
    routeFiles: [
      { file: "masjidRoutes.js", only: ["/:id/prayer-times", "/:id/prayer-times/history", "/:id/prayer-times/changes"] },
      { file: "publicMasjidRoutes.js", only: ["/:id/prayer-times"] },
      { file: "adminPrayerRoutes.js", only: ["/", "/:id"] },
      { file: "userRoutes.js", only: ["/me/salah/day", "/me/salah/mark", "/me/salah/unmark", "/me/salah/history", "/me/salah/weekly-summary"] },
    ],
  },
  "campaigns-fundraising": {
    models: ["Campaign", "CampaignBudgetItem", "CampaignDocument", "CampaignPhoto", "CampaignUpdate", "Donation"],
    routeFiles: [
      { file: "publicCampaignRoutes.js", only: ["/", "/:slug", "/:slug/donations", "/:slug/donors"] },
      { file: "campaignRoutes.js", only: ["/", "/:id", "/:id/budget-items", "/:id/photos", "/:id/submit"] },
      { file: "adminCampaignRoutes.js", only: ["/:id/approve", "/:id/reject", "/:id/request-changes", "/:id/pause", "/:id/resume", "/:id/complete", "/:id/cancel", "/:id/donations", "/:id/delete"] },
    ],
  },
  "jobs": {
    models: ["Job", "JobApplication", "JobFavorite", "JobCategory", "EmploymentType", "ExperienceLevel", "Company"],
    routeFiles: [
      { file: "publicJobRoutes.js", only: ["/", "/:slug", "/:id/favorite"] },
      { file: "jobRoutes.js", only: ["/", "/:id", "/:id/close", "/:id/reopen", "/:id/apply", "/:id/my-application", "/:id/applications", "/:id/applications/:appId"] },
      { file: "adminJobRoutes.js", only: ["/:id/status", "/:id/moderation", "/:id"] },
    ],
  },
};
