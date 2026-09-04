import WorkExperience from "../models/WorkExperience.js";
import Education from "../models/Education.js";
import UserSkill from "../models/UserSkill.js";
import UserHobby from "../models/UserHobby.js";
import Skill from "../models/Skill.js";
import Hobby from "../models/Hobby.js";

export const BIO_LANGUAGES = new Set(["en", "hi", "ur", "ar"]);

function yearOf(dateOnly) {
  return dateOnly ? String(dateOnly).slice(0, 4) : "";
}

// Plain-text summary of everything the AI is allowed to know about when
// writing a bio — deliberately built from the member's OWN saved fields
// only, so the model has nothing to draw on beyond what's actually true.
// Shared by both the self-service ("/me/bio/generate") and admin
// ("/admin/users/:userId/bio/generate") bio-generation endpoints, so an
// admin writing a bio on a member's behalf sees exactly the same context
// the member's own AI-generate button would use.
export async function buildBioProfileContext(user) {
  const [workExperiences, educations, userSkills, userHobbies] = await Promise.all([
    WorkExperience.findAll({ where: { userId: user.id }, order: [["sortOrder", "ASC"]] }),
    Education.findAll({ where: { userId: user.id }, order: [["sortOrder", "ASC"]] }),
    UserSkill.findAll({ where: { userId: user.id }, order: [["sortOrder", "ASC"]] }),
    UserHobby.findAll({ where: { userId: user.id }, order: [["sortOrder", "ASC"]] }),
  ]);

  const skillIds = userSkills.map((s) => s.skillId).filter(Boolean);
  const hobbyIds = userHobbies.map((h) => h.hobbyId).filter(Boolean);
  const [skillMaster, hobbyMaster] = await Promise.all([
    skillIds.length ? Skill.findAll({ where: { id: skillIds } }) : [],
    hobbyIds.length ? Hobby.findAll({ where: { id: hobbyIds } }) : [],
  ]);
  const skillById = Object.fromEntries(skillMaster.map((s) => [s.id, s.name]));
  const hobbyById = Object.fromEntries(hobbyMaster.map((h) => [h.id, h.name]));
  const skillNames = userSkills.map((s) => (s.skillId ? skillById[s.skillId] : s.customName)).filter(Boolean);
  const hobbyNames = userHobbies.map((h) => (h.hobbyId ? hobbyById[h.hobbyId] : h.customName)).filter(Boolean);

  const lines = [];
  if (user.locationLabel) lines.push(`Location: ${user.locationLabel}`);

  if (workExperiences.length) {
    lines.push("Work experience:");
    for (const w of workExperiences) {
      const period = [yearOf(w.startDate), w.isCurrent ? "present" : yearOf(w.endDate)].filter(Boolean).join("–");
      lines.push(`- ${w.title} at ${w.company}${period ? ` (${period})` : ""}`);
    }
  }

  if (educations.length) {
    lines.push("Education:");
    for (const e of educations) {
      lines.push(`- ${e.degree}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""} at ${e.institution}`);
    }
  }

  if (skillNames.length) lines.push(`Skills: ${skillNames.join(", ")}`);
  if (hobbyNames.length) lines.push(`Hobbies & interests: ${hobbyNames.join(", ")}`);
  if (user.bio?.trim()) lines.push(`Existing bio (rewrite/improve this, don't just repeat it verbatim): ${user.bio.trim()}`);

  return lines.join("\n");
}
