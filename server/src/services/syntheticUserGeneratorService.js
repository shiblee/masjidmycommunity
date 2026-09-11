import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sequelize } from "../config/db.js";
import User from "../models/User.js";
import Education from "../models/Education.js";
import WorkExperience from "../models/WorkExperience.js";
import UserSkill from "../models/UserSkill.js";
import UserHobby from "../models/UserHobby.js";
import Degree from "../models/Degree.js";
import Institution from "../models/Institution.js";
import FieldOfStudy from "../models/FieldOfStudy.js";
import Company from "../models/Company.js";
import EmploymentType from "../models/EmploymentType.js";
import Skill from "../models/Skill.js";
import Hobby from "../models/Hobby.js";
import { generateUniqueUsername } from "../controllers/userController.js";
import { computeProfileCompletion, getCompletionCountsByUserIds } from "../controllers/adminUserController.js";
import { INDIA_CITIES, INTERNATIONAL_CITIES, pickRandom } from "../constants/syntheticGeo.js";
import {
  MUSLIM_FIRST_NAMES_MALE, MUSLIM_FIRST_NAMES_FEMALE, MUSLIM_LAST_NAMES,
  GENERIC_FIRST_NAMES_MALE, GENERIC_FIRST_NAMES_FEMALE, GENERIC_LAST_NAMES,
  titlesForField,
} from "../constants/syntheticPersonaData.js";
import { generateRealisticProfilePhoto } from "../utils/realisticPhotoService.js";
import { generateBio, generateEducationEnhancement, generateWorkExperienceEnhancement } from "./aiProviderService.js";
import { buildBioProfileContext, BIO_LANGUAGES } from "../utils/bioContext.js";
import { recordMetaChange } from "../utils/metaChangeLog.js";
import { BOT_EMAIL_DOMAIN } from "../constants/botAccountConstants.js";

// Deterministic, code-driven generation of one fully-populated, clearly-
// flagged bot User account — every structural fact (age, graduation year,
// work-experience dates, seniority) is derived by construction, not by
// hoping an AI's free-form output respects the timeline math. AI (see
// applyAiTextPolish below) only ever polishes text on top of these already-
// consistent facts, reusing the exact functions real users' own "AI
// enhance" buttons call.

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(list, count) {
  const pool = [...list];
  const picked = [];
  while (picked.length < count && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

async function pickMetaName(Model) {
  const rows = await Model.findAll({ where: { isActive: true }, attributes: ["name"], raw: true });
  return rows.length ? pickRandom(rows).name : null;
}

// Every generated persona already has 0-3 years of professional work
// experience by construction, so its degree must be at least a bachelor's —
// picking straight from the full Degree meta pool (which also holds
// school-level entries like "Senior Secondary (12th)" or "ITI Certificate"
// for real users still in school) would otherwise produce exactly the kind
// of "graduated at 12" inconsistency this generator exists to avoid.
const SCHOOL_LEVEL_DEGREE_PATTERN = /secondary|\biti\b|\(10th\)|\(12th\)/i;

async function pickDegree() {
  const rows = await Degree.findAll({ where: { isActive: true }, attributes: ["name"], raw: true });
  const eligible = rows.map((r) => r.name).filter((name) => !SCHOOL_LEVEL_DEGREE_PATTERN.test(name));
  return pickRandom(eligible.length ? eligible : rows.map((r) => r.name)) || "B.Sc.";
}

// Derived from the degree name (not picked independently from
// EducationLevel) so the two can never contradict each other — e.g. a
// "B.Tech." degree can never end up labeled level "Diploma".
function levelForDegree(degree) {
  const d = (degree || "").toLowerCase();
  if (/^(m\.|ma |mba|mca|m\.tech|m\.e\.|master)/.test(d)) return "Master's";
  if (/phd|doctorate/.test(d)) return "Doctorate";
  if (/diploma/.test(d)) return "Diploma";
  return "Bachelor's";
}

async function pickMetaNames(Model, count) {
  const rows = await Model.findAll({ where: { isActive: true }, attributes: ["name"], raw: true });
  return sample(rows.map((r) => r.name), Math.min(count, rows.length));
}

function buildPersona(settings) {
  const isIndia = Math.random() * 100 < settings.indiaPercent;
  const isMuslim = Math.random() * 100 < settings.muslimPersonaPercent;
  const gender = Math.random() < 0.5 ? "male" : "female";
  const firstPool = isMuslim
    ? (gender === "male" ? MUSLIM_FIRST_NAMES_MALE : MUSLIM_FIRST_NAMES_FEMALE)
    : (gender === "male" ? GENERIC_FIRST_NAMES_MALE : GENERIC_FIRST_NAMES_FEMALE);
  const lastPool = isMuslim ? MUSLIM_LAST_NAMES : GENERIC_LAST_NAMES;
  const geo = pickRandom(isIndia ? INDIA_CITIES : INTERNATIONAL_CITIES);
  const age = randInt(22, 55);
  return { gender, firstPool, lastPool, geo, age };
}

function buildTimeline(age) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const birthYear = currentYear - age;
  const dateOfBirth = `${birthYear}-${String(randInt(1, 12)).padStart(2, "0")}-${String(randInt(1, 28)).padStart(2, "0")}`;
  const graduationYear = Math.min(birthYear + 22, currentYear);
  const yearsSinceGraduation = currentYear - graduationYear;
  const workCount = yearsSinceGraduation < 1 ? 0 : randInt(1, Math.min(3, Math.max(1, Math.ceil(yearsSinceGraduation / 3))));
  return { currentYear, birthYear, dateOfBirth, graduationYear, yearsSinceGraduation, workCount };
}

function buildWorkPeriods(graduationYear, currentYear, workCount) {
  if (workCount === 0) return [];
  const span = currentYear - graduationYear;
  const step = Math.max(1, Math.floor(span / workCount));
  const periods = [];
  let start = graduationYear;
  for (let i = 0; i < workCount; i++) {
    const isLast = i === workCount - 1;
    const end = isLast ? null : Math.min(start + step, currentYear - 1);
    periods.push({ startYear: start, endYear: end, isCurrent: isLast });
    if (!isLast) start = end;
  }
  return periods;
}

function validateProfile({ persona, timeline, workPeriods, fullName }) {
  const errors = [];
  if (persona.age < 18) errors.push("age below 18");
  if (timeline.graduationYear < timeline.birthYear + 18) errors.push("graduation before age 18");
  for (const w of workPeriods) {
    if (w.startYear < timeline.graduationYear) errors.push("work start before graduation");
    if (w.endYear != null && w.endYear < w.startYear) errors.push("work end before start");
  }
  if (!fullName?.trim()) errors.push("missing name");
  return { valid: errors.length === 0, errors };
}

async function isDuplicateBotName(fullName) {
  const existing = await User.findOne({ where: { fullName, userType: "bot" } });
  return !!existing;
}

/** AI text polish, reusing the exact functions real users' own "AI
 * enhance" buttons call — graceful no-op fallback on any failure, so
 * generation is never blocked by AI being unavailable. */
async function applyAiTextPolish({ user, educationDraft, workDrafts }) {
  try {
    const context = await buildBioProfileContext(user);
    const bioResult = await generateBio({ profileContext: context, languageCode: "en" });
    if (bioResult?.bio) {
      user.bio = bioResult.bio;
      await user.save();
    }
  } catch {
    // keep the templated fallback bio already saved
  }

  if (educationDraft) {
    try {
      const result = await generateEducationEnhancement({
        level: educationDraft.level, degree: educationDraft.degree, institution: educationDraft.institution,
        fieldOfStudy: educationDraft.fieldOfStudy, notes: "", languageCode: "en",
      });
      if (result?.description) {
        educationDraft.row.description = result.description;
        await educationDraft.row.save();
      }
    } catch {
      // keep the templated fallback description
    }
  }

  for (const w of workDrafts) {
    try {
      const result = await generateWorkExperienceEnhancement({ title: w.title, company: w.company, notes: "", languageCode: "en" });
      if (result?.description) {
        w.row.description = result.description;
        await w.row.save();
      }
    } catch {
      // keep the templated fallback description
    }
  }
}

export async function generateSyntheticUser(settings, { skipAi = false } = {}) {
  const persona = buildPersona(settings);
  const timeline = buildTimeline(persona.age);
  const workPeriods = buildWorkPeriods(timeline.graduationYear, timeline.currentYear, timeline.workCount);

  let fullName;
  for (let attempt = 0; attempt < 5; attempt++) {
    fullName = `${pickRandom(persona.firstPool)} ${pickRandom(persona.lastPool)}`;
    if (!(await isDuplicateBotName(fullName))) break;
  }

  const { valid, errors } = validateProfile({ persona, timeline, workPeriods, fullName });
  if (!valid) throw new Error(`Synthetic profile failed validation: ${errors.join(", ")}`);

  const [degree, institution, fieldOfStudy, skillNames, hobbyNames] = await Promise.all([
    pickDegree(),
    pickMetaName(Institution),
    pickMetaName(FieldOfStudy),
    pickMetaNames(Skill, randInt(3, 5)),
    pickMetaNames(Hobby, randInt(2, 4)),
  ]);
  const educationLevel = levelForDegree(degree);

  const username = await generateUniqueUsername(fullName);
  // A subdomain of the site's own real domain, styled like an ordinary
  // mailbox rather than visibly saying "synthetic" — still not the bare
  // domain (so a generated local-part can never collide with a real staff
  // mailbox there), and still not a real third-party provider (Gmail,
  // Yahoo, Rediffmail, ...): using one of those would risk attaching an
  // actual stranger's real address to a fake identity with no consent and
  // no way to undo it, for a purely cosmetic gain this domain already
  // delivers risk-free.
  const email = `${username}@${BOT_EMAIL_DOMAIN}`;
  const password = await bcrypt.hash(crypto.randomUUID(), 10);
  const avatarPath = await generateRealisticProfilePhoto(username, persona.gender);

  const templatedBio = `Based in ${persona.geo.city}, ${persona.geo.country}${fieldOfStudy ? `. Background in ${fieldOfStudy}` : ""}${hobbyNames.length ? `, with an interest in ${hobbyNames[0]}` : ""}.`;

  const result = await sequelize.transaction(async (t) => {
    const user = await User.create(
      {
        fullName, username, email, password,
        registrationMethod: "email",
        emailVerified: true,
        mobileVerified: false,
        status: "active",
        userType: "bot",
        bio: templatedBio,
        gender: persona.gender,
        dateOfBirth: timeline.dateOfBirth,
        profilePhoto: avatarPath,
        locationLabel: `${persona.geo.city}, ${persona.geo.country}`,
        locationCity: persona.geo.city,
        locationState: persona.geo.state || null,
        locationCountry: persona.geo.country,
        locationLat: persona.geo.lat ?? null,
        locationLng: persona.geo.lng ?? null,
      },
      { transaction: t }
    );

    const educationRow = await Education.create(
      {
        userId: user.id,
        level: educationLevel,
        degree: degree || "Bachelor's Degree",
        institution: institution || "University",
        fieldOfStudy,
        startYear: timeline.graduationYear - 4,
        endYear: timeline.graduationYear,
        isCurrentlyStudying: false,
        location: persona.geo.city,
        description: `Completed ${degree || "a degree"}${fieldOfStudy ? ` in ${fieldOfStudy}` : ""} at ${institution || "university"}.`,
      },
      { transaction: t }
    );

    const workRows = [];
    for (let i = 0; i < workPeriods.length; i++) {
      const period = workPeriods[i];
      const [company, employmentType] = await Promise.all([pickMetaName(Company), pickMetaName(EmploymentType)]);
      const seniorPrefix = i === workPeriods.length - 1 && timeline.yearsSinceGraduation >= 5 ? "Senior " : "";
      const title = `${seniorPrefix}${pickRandom(titlesForField(fieldOfStudy))}`;
      const row = await WorkExperience.create(
        {
          userId: user.id,
          company: company || "A Private Company",
          title,
          employmentType: employmentType || "Full-time",
          startDate: `${period.startYear}-01-01`,
          endDate: period.endYear ? `${period.endYear}-12-31` : null,
          isCurrent: period.isCurrent,
          location: persona.geo.city,
          description: `Worked as a ${title} at ${company || "the company"}, contributing to the team's day-to-day work.`,
        },
        { transaction: t }
      );
      workRows.push({ row, title, company });
    }

    const skillRows = await Promise.all(
      skillNames.map((name, i) =>
        Skill.findOne({ where: { name }, transaction: t }).then((skillRow) =>
          UserSkill.create({ userId: user.id, skillId: skillRow?.id || null, customName: skillRow ? null : name, sortOrder: i }, { transaction: t })
        )
      )
    );
    const hobbyRows = await Promise.all(
      hobbyNames.map((name, i) =>
        Hobby.findOne({ where: { name }, transaction: t }).then((hobbyRow) =>
          UserHobby.create({ userId: user.id, hobbyId: hobbyRow?.id || null, customName: hobbyRow ? null : name, sortOrder: i }, { transaction: t })
        )
      )
    );

    return { user, educationRow, workRows, skillRows, hobbyRows };
  });

  if (!skipAi) {
    await applyAiTextPolish({
      user: result.user,
      educationDraft: { row: result.educationRow, level: educationLevel, degree, institution, fieldOfStudy },
      workDrafts: result.workRows,
    });
  }

  await recordMetaChange({
    entityType: "BotUser",
    entityId: result.user.id,
    entityName: fullName,
    action: "create",
    actor: { id: 0, name: "User Bot" },
    snapshot: { username, email, city: persona.geo.city, country: persona.geo.country },
  }).catch(() => {});

  const counts = await getCompletionCountsByUserIds([result.user.id]);
  const completion = computeProfileCompletion(result.user, counts[result.user.id]);

  return {
    id: result.user.id,
    fullName,
    username,
    city: persona.geo.city,
    country: persona.geo.country,
    age: persona.age,
    profileCompletion: completion,
    workCount: workPeriods.length,
  };
}
