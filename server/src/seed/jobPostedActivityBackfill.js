import { Op } from "sequelize";
import Job from "../models/Job.js";
import User from "../models/User.js";
import CommunityActivity from "../models/CommunityActivity.js";
import { recordJobPostedActivity } from "../services/communityActivityService.js";

// One-time backfill for jobs created before the Jobs-as-Community-Posts
// integration existed — every job going forward already gets its
// "job_posted" activity at creation time (jobController.js's createJob /
// adminJobController.js's create both call recordJobPostedActivity
// directly). Without this, an older job has no post at all: JobPostSection.jsx
// renders nothing when it can't find one, so like/comment/report silently
// don't exist on that job's detail page. Runs on every boot but only ever
// touches jobs with no matching activity yet, so it's a no-op once every
// job has one. Preserves each job's real createdAt via occurredAt, so a
// backfilled post doesn't jump to the top of the Community Wall as if
// freshly posted today.
export async function ensureJobPostedActivities() {
  const jobs = await Job.findAll({ where: { status: { [Op.ne]: "deleted" } } });
  if (!jobs.length) return;

  const existing = await CommunityActivity.findAll({
    where: { type: "job_posted", relatedJobId: { [Op.in]: jobs.map((j) => j.id) } },
    attributes: ["relatedJobId"],
  });
  const covered = new Set(existing.map((a) => a.relatedJobId));
  const missing = jobs.filter((j) => !covered.has(j.id));
  if (!missing.length) return;

  const posterIds = [...new Set(missing.map((j) => j.userId))];
  const posters = await User.findAll({ where: { id: { [Op.in]: posterIds } }, attributes: ["id", "fullName"] });
  const posterById = new Map(posters.map((u) => [u.id, u]));

  for (const job of missing) {
    await recordJobPostedActivity(job, posterById.get(job.userId), { occurredAt: job.createdAt }).catch(() => {});
  }
}
