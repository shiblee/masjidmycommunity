import { Op } from "sequelize";
import User from "../models/User.js";
import UserSkill from "../models/UserSkill.js";
import WorkExperience from "../models/WorkExperience.js";
import Skill from "../models/Skill.js";

// Deterministic, transparent match scoring — no LLM call per job-per-user
// (too slow/costly for an entire board), just the same real signals a
// person could see for themselves: skill overlap, a coarse experience-level
// bracket, and location/remote fit. The LLM is reserved for natural-language
// query understanding and the conversational assistant (a later phase), not
// bulk ranking.
const WEIGHTS = { skills: 60, experience: 25, location: 15 };

function coarseLevel(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/entry|junior|fresher|intern|beginner/.test(t)) return "entry";
  if (/senior|lead|expert|principal|manager|director/.test(t)) return "senior";
  if (/mid|intermediate|associate/.test(t)) return "mid";
  return null;
}

function yearsFromWorkExperience(rows) {
  if (!rows?.length) return 0;
  let totalMonths = 0;
  for (const w of rows) {
    const start = new Date(w.startDate);
    if (Number.isNaN(start.getTime())) continue;
    const end = w.isCurrent || !w.endDate ? new Date() : new Date(w.endDate);
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    totalMonths += months;
  }
  return totalMonths / 12;
}

function userCoarseLevel(years) {
  if (years < 1.5) return "entry";
  if (years < 5) return "mid";
  return "senior";
}

/** The signal set for one user, fetched once per request and reused across
 * every job being scored — a purpose-built, lighter aggregation than
 * publicUserController.js's buildProfileSnapshot (which also pulls
 * education/bio/mobile that matching never needs). */
export async function getUserMatchProfile(userId) {
  const [user, skillRows, workRows] = await Promise.all([
    User.findByPk(userId, { attributes: ["id", "locationCity", "locationCountry"] }),
    UserSkill.findAll({ where: { userId }, attributes: ["skillId", "customName"] }),
    WorkExperience.findAll({ where: { userId, isActive: true }, attributes: ["skillsUsed", "startDate", "endDate", "isCurrent"] }),
  ]);
  if (!user) return null;

  // UserSkill has no plain `name` column — it's skillId (FK to the Skill
  // master list) or a free-text customName, same resolution
  // publicUserController.js's serializeSkills already does.
  const skillIds = skillRows.map((s) => s.skillId).filter(Boolean);
  const masterSkills = skillIds.length ? await Skill.findAll({ where: { id: { [Op.in]: skillIds } }, attributes: ["id", "name"] }) : [];
  const masterNameById = new Map(masterSkills.map((s) => [s.id, s.name]));
  const resolvedSkillNames = skillRows.map((s) => (s.skillId ? masterNameById.get(s.skillId) : s.customName)).filter(Boolean);

  const skillNames = new Set([
    ...resolvedSkillNames.map((n) => n.toLowerCase()),
    ...workRows.flatMap((w) => (w.skillsUsed || []).map((s) => String(s).toLowerCase())),
  ]);

  return {
    skillNames,
    years: yearsFromWorkExperience(workRows),
    locationCity: user.locationCity || "",
    locationCountry: user.locationCountry || "",
  };
}

/** Returns { score: 0-100, matchedSkills: string[] } or null when there
 * isn't enough signal on either side to produce an honest score (rather
 * than a fabricated low number). */
export function computeMatchScore(job, matchProfile) {
  if (!matchProfile) return null;

  let earned = 0;
  let possible = 0;
  const matchedSkills = [];

  const jobSkills = job.skills || [];
  if (jobSkills.length && matchProfile.skillNames.size) {
    possible += WEIGHTS.skills;
    const matched = jobSkills.filter((s) => matchProfile.skillNames.has(String(s).toLowerCase()));
    matchedSkills.push(...matched);
    earned += WEIGHTS.skills * (matched.length / jobSkills.length);
  }

  const jobLevel = coarseLevel(job.experienceRequired);
  if (jobLevel) {
    possible += WEIGHTS.experience;
    const myLevel = userCoarseLevel(matchProfile.years);
    if (myLevel === jobLevel) earned += WEIGHTS.experience;
    else if (Math.abs(["entry", "mid", "senior"].indexOf(myLevel) - ["entry", "mid", "senior"].indexOf(jobLevel)) === 1) earned += WEIGHTS.experience * 0.45;
  }

  if (job.workMode === "remote") {
    possible += WEIGHTS.location;
    earned += WEIGHTS.location;
  } else if (job.location && (matchProfile.locationCity || matchProfile.locationCountry)) {
    possible += WEIGHTS.location;
    const jobLoc = job.location.toLowerCase();
    const cityMatch = matchProfile.locationCity && jobLoc.includes(matchProfile.locationCity.toLowerCase());
    const countryMatch = matchProfile.locationCountry && jobLoc.includes(matchProfile.locationCountry.toLowerCase());
    if (cityMatch || countryMatch) earned += WEIGHTS.location;
  }

  if (!possible) return null;
  return { score: Math.round((earned / possible) * 100), matchedSkills };
}
