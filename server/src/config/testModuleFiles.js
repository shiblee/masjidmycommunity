// Maps a Developer-doc module key to the real Vitest test file that covers
// it, so the admin Testing page can show results as a per-module tab list,
// mirroring the Documentation page exactly. A module with no entry here
// simply has no automated tests yet -- shown honestly as that, not hidden.
export const TEST_MODULE_FILES = {
  "registration": "tests/identity/registration.test.js",
  "login-authentication": "tests/identity/login.test.js",
  "my-profile": "tests/identity/myProfile.test.js",
  "other-user-profile": "tests/identity/otherUserProfile.test.js",
  "admin-staff": "tests/identity/adminStaff.test.js",
  "permissions": "tests/identity/permissions.test.js",
  "masjid": "tests/masjid/masjid.test.js",
  "prayer-times": "tests/masjid/prayerTimes.test.js",
  "campaigns-fundraising": "tests/campaigns/campaigns.test.js",
  "jobs": "tests/jobs/jobs.test.js",
  "community-wall": "tests/community/communityWall.test.js",
  "posts": "tests/community/posts.test.js",
  "comments-replies": "tests/community/comments.test.js",
  "likes-engagement": "tests/community/likes.test.js",
  "reels": "tests/community/reels.test.js",
  "registered-users-directory": "tests/community/directory.test.js",
  "notifications": "tests/community/notifications.test.js",
};
