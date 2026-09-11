import { Op } from "sequelize";
import User from "../models/User.js";
import Education from "../models/Education.js";
import WorkExperience from "../models/WorkExperience.js";
import Skill from "../models/Skill.js";
import UserSkill from "../models/UserSkill.js";
import Hobby from "../models/Hobby.js";
import UserHobby from "../models/UserHobby.js";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import Campaign from "../models/Campaign.js";
import Job from "../models/Job.js";

const PUBLIC_MASJID_STATUS = "approved";
const PUBLIC_CAMPAIGN_STATUSES = ["active", "paused", "goal_reached", "completed"];

// Same lightweight shape primaryMasjidController.js's popup uses — kept as
// its own copy per this codebase's convention of not sharing small
// per-domain serializers across controllers.
async function serializePrimaryMasjid(masjidId) {
  const masjid = await Masjid.findOne({ where: { id: masjidId, status: PUBLIC_MASJID_STATUS } });
  if (!masjid) return null;
  const cover = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } });
  return {
    id: masjid.id,
    name: masjid.name,
    city: masjid.city,
    country: masjid.country,
    formattedAddress: masjid.formattedAddress,
    coverPhotoUrl: cover?.url || null,
  };
}

async function serializeSkills(entries) {
  const skillIds = entries.map((e) => e.skillId).filter(Boolean);
  const skills = skillIds.length ? await Skill.findAll({ where: { id: skillIds } }) : [];
  const skillById = Object.fromEntries(skills.map((s) => [s.id, s]));
  return entries.map((e) => ({ ...e.toJSON(), name: e.skillId ? skillById[e.skillId]?.name || e.customName : e.customName }));
}

async function serializeHobbies(entries) {
  const hobbyIds = entries.map((e) => e.hobbyId).filter(Boolean);
  const hobbies = hobbyIds.length ? await Hobby.findAll({ where: { id: hobbyIds } }) : [];
  const hobbyById = Object.fromEntries(hobbies.map((h) => [h.id, h]));
  return entries.map((e) => ({ ...e.toJSON(), name: e.hobbyId ? hobbyById[e.hobbyId]?.name || e.customName : e.customName }));
}

// Reused by jobController.js's applyToJob to build a JobApplication's
// profileSnapshot — same underlying query/serialization getPublicProfile
// itself uses, so "what a job application shows" and "what a profile
// shows" never drift into two separate implementations.
export async function buildProfileSnapshot(user) {
  const [education, workExperience, skillEntries] = await Promise.all([
    Education.findAll({ where: { userId: user.id }, order: [["endYear", "DESC"], ["startYear", "DESC"]] }),
    WorkExperience.findAll({ where: { userId: user.id, isActive: true }, order: [["startDate", "DESC"]] }),
    UserSkill.findAll({ where: { userId: user.id }, order: [["sortOrder", "ASC"]] }),
  ]);
  const skills = await serializeSkills(skillEntries);
  return {
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    bio: user.bio,
    education: education.map((e) => e.toJSON()),
    workExperience: workExperience.map((w) => w.toJSON()),
    skills: skills.map((s) => ({ id: s.id, name: s.name })),
  };
}

// Viewer-aware: relies on optionalAuth having attempted to decode req.user
// without rejecting the request, so this endpoint stays fully public while
// still tailoring the response for the profile owner (or an admin) — private
// fields and unpublished masjids/campaigns only ever reach those two.
export const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findOne({ where: { username: req.params.username } });
    if (!user) return res.status(404).json({ message: "Profile not found." });

    const viewerId = req.user?.type === "user" ? req.user.id : null;
    const isAdmin = req.user?.type === "admin";
    const isOwner = viewerId === user.id;

    // Suspension is a moderation action akin to hiding content — treat it
    // like the profile doesn't exist for anyone but the owner/admin. An
    // inactive (dormant but not moderated) account stays visible.
    if (user.status === "suspended" && !isOwner && !isAdmin) {
      return res.status(404).json({ message: "Profile not found." });
    }

    const [education, workExperience, skillEntries, hobbyEntries, masjids, campaigns, jobs] = await Promise.all([
      Education.findAll({ where: { userId: user.id }, order: [["endYear", "DESC"], ["startYear", "DESC"]] }),
      WorkExperience.findAll({ where: { userId: user.id, isActive: true }, order: [["startDate", "DESC"]] }),
      UserSkill.findAll({ where: { userId: user.id }, order: [["sortOrder", "ASC"]] }),
      UserHobby.findAll({ where: { userId: user.id }, order: [["sortOrder", "ASC"]] }),
      Masjid.findAll({
        where:
          isOwner || isAdmin
            ? { userId: user.id, status: { [Op.ne]: "deleted" } }
            : { userId: user.id, status: PUBLIC_MASJID_STATUS, moderationStatus: "active" },
        order: [["createdAt", "DESC"]],
      }),
      Campaign.findAll({
        where:
          isOwner || isAdmin
            ? { createdBy: user.id }
            : { createdBy: user.id, status: { [Op.in]: PUBLIC_CAMPAIGN_STATUSES }, moderationStatus: "active" },
        order: [["createdAt", "DESC"]],
      }),
      Job.findAll({
        where:
          isOwner || isAdmin
            ? { userId: user.id, status: { [Op.ne]: "deleted" } }
            : { userId: user.id, status: "active", moderationStatus: "active" },
        order: [["createdAt", "DESC"]],
      }),
    ]);

    const [skills, hobbies, primaryMasjid] = await Promise.all([
      serializeSkills(skillEntries),
      serializeHobbies(hobbyEntries),
      user.primaryMasjidId ? serializePrimaryMasjid(user.primaryMasjidId) : null,
    ]);

    const profile = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      profilePhoto: user.profilePhoto,
      bio: user.bio,
      locationLabel: user.locationLabel,
      locationCity: user.locationCity,
      locationState: user.locationState,
      locationCountry: user.locationCountry,
      createdAt: user.createdAt,
      isOwner,
      // A public yes/no signal for the profile's "Verified Member" badge —
      // deliberately just the boolean, never the underlying email/mobile
      // verification fields, which stay owner/admin-only below.
      verified: !!(user.emailVerified || user.mobileVerified),
      primaryMasjidId: primaryMasjid ? primaryMasjid.id : null,
      primaryMasjid,
    };

    if (isOwner || isAdmin) {
      Object.assign(profile, {
        email: user.email,
        mobile: user.mobile,
        emailVerified: user.emailVerified,
        mobileVerified: user.mobileVerified,
        gender: user.gender,
        maritalStatus: user.maritalStatus,
        dateOfBirth: user.dateOfBirth,
        status: user.status,
        registrationMethod: user.registrationMethod,
      });
    }

    res.json({
      user: profile,
      education,
      workExperience,
      skills,
      hobbies,
      masjids: masjids.map((m) => m.toJSON()),
      campaigns: campaigns.map((c) => c.toJSON()),
      jobs: jobs.map((j) => j.toJSON()),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const DIRECTORY_SAFE_ATTRIBUTES = ["id", "username", "fullName", "profilePhoto", "bio", "locationLabel", "locationCity", "locationState", "locationCountry", "createdAt", "emailVerified", "mobileVerified"];

// Registered Users directory (Home Page module) -- same public-safe field
// set getPublicProfile already returns to a non-owner viewer (see above):
// no email/mobile, not even masked, because they're simply never selected
// here. Only "active" accounts are listed (excludes pending_verification/
// inactive/suspended), mirroring getPublicProfile's suspended-account
// exclusion. Gender/maritalStatus are deliberately not filterable here --
// today they're owner/admin-only fields, and this directory doesn't change
// that.
export const listDirectory = async (req, res) => {
  try {
    const { q, city, state, country, sortBy = "newest", page = 1, pageSize = 24 } = req.query;
    const where = { status: "active" };
    if (q?.trim()) {
      const term = q.trim();
      where[Op.or] = [{ fullName: { [Op.like]: `%${term}%` } }, { username: { [Op.like]: `%${term}%` } }];
    }
    if (city?.trim()) where.locationCity = { [Op.like]: `%${city.trim()}%` };
    if (state?.trim()) where.locationState = { [Op.like]: `%${state.trim()}%` };
    if (country?.trim()) where.locationCountry = { [Op.like]: `%${country.trim()}%` };

    const limit = Math.min(Number(pageSize) || 24, 60);
    const pageNum = Math.max(Number(page) || 1, 1);

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: DIRECTORY_SAFE_ATTRIBUTES,
      order: [["createdAt", sortBy === "oldest" ? "ASC" : "DESC"]],
      limit,
      offset: (pageNum - 1) * limit,
    });

    const users = rows.map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      profilePhoto: u.profilePhoto,
      bio: u.bio,
      locationLabel: u.locationLabel,
      locationCity: u.locationCity,
      locationState: u.locationState,
      locationCountry: u.locationCountry,
      createdAt: u.createdAt,
      verified: !!(u.emailVerified || u.mobileVerified),
    }));

    res.json({ users, total: count, page: pageNum, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
