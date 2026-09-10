import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import CommunityActivity from "../models/CommunityActivity.js";
import { recordMasjidApprovedActivity } from "../services/communityActivityService.js";

// "Every masjid gets a Wall post" — one centralized, idempotent entry point
// used by all three trigger paths: the masjid-discovery bot (immediately
// after an auto-published import), admin manual approval
// (adminMasjidController.js's approve()), and this file's own bulk backfill
// for every masjid that predates this feature. Calling it twice for the
// same masjid is always safe (checks for an existing post first) — that
// same duplicate-check is what makes a later re-run (e.g. the next server
// boot) a safe, automatic retry for any masjid whose post failed to
// generate the first time, with no separate retry mechanism needed.
//
// Only ever posts for a masjid whose profile is actually public
// (status "approved") — the Wall post's "View Masjid" link would 404
// otherwise.
export async function ensureMasjidRegisteredActivity(masjidId) {
  const masjid = await Masjid.findOne({ where: { id: masjidId, status: "approved" } });
  if (!masjid) return { skipped: "not_approved" };

  const existing = await CommunityActivity.findOne({ where: { type: "masjid_approved", relatedMasjidId: masjid.id } });
  if (existing) return { skipped: "already_exists" };

  const cover = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } });
  const activity = await recordMasjidApprovedActivity(masjid, cover?.url || null);
  return activity ? { ok: true } : { skipped: "record_failed" };
}

// One-time (and self-repeating, since it's cheap and idempotent) pass over
// every already-registered masjid — run at boot alongside this codebase's
// other ensureX() seed functions.
export async function ensureAllMasjidRegisteredActivities() {
  const masjids = await Masjid.findAll({ where: { status: "approved" }, attributes: ["id"] });
  for (const { id } of masjids) {
    await ensureMasjidRegisteredActivity(id).catch((e) => console.error(`ensureMasjidRegisteredActivity failed for masjid ${id}:`, e.message));
  }
}
