import { Op } from "sequelize";
import User from "../models/User.js";
import Education from "../models/Education.js";
import WorkExperience from "../models/WorkExperience.js";
import Skill from "../models/Skill.js";
import UserSkill from "../models/UserSkill.js";
import Hobby from "../models/Hobby.js";
import UserHobby from "../models/UserHobby.js";
import Masjid from "../models/Masjid.js";
import Campaign from "../models/Campaign.js";
import Job from "../models/Job.js";

const PUBLIC_MASJID_STATUS = "approved";
const PUBLIC_CAMPAIGN_STATUSES = ["active", "paused", "goal_reached", "completed"];

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

    const [skills, hobbies] = await Promise.all([serializeSkills(skillEntries), serializeHobbies(hobbyEntries)]);

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
