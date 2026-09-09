import { Op } from "sequelize";
import Job from "../models/Job.js";
import AiQueryLog from "../models/AiQueryLog.js";
import { generateGroundedJobAnswer, aiProviderConfigured } from "../services/aiProviderService.js";
import { getUserMatchProfile } from "../services/jobMatchingService.js";

const PUBLIC_STATUSES = ["active"];
const CONTEXT_JOB_LIMIT = 60;

// Every currently open job, rendered as plain lines the model can read and
// cite by id — the whole "knowledge base" here is just the live jobs table,
// no separate retrieval corpus to keep in sync (unlike the FAQ assistant's
// TF-IDF corpus over static content).
async function buildJobsContext() {
  const jobs = await Job.findAll({
    where: { status: { [Op.in]: PUBLIC_STATUSES }, moderationStatus: "active" },
    order: [["createdAt", "DESC"]],
    limit: CONTEXT_JOB_LIMIT,
  });
  const lines = jobs.map((j) => {
    const bits = [
      `id: ${j.id}`,
      `title: ${j.title}`,
      j.category ? `category: ${j.category}` : null,
      `type: ${j.jobType}`,
      j.workMode ? `work mode: ${j.workMode}` : null,
      j.experienceRequired ? `experience required: ${j.experienceRequired}` : null,
      `location: ${j.location}`,
      j.salary ? `salary: ${j.salary}` : null,
      (j.skills || []).length ? `skills: ${j.skills.join(", ")}` : null,
      j.applicationDeadline ? `application deadline: ${j.applicationDeadline}` : null,
      `description: ${(j.description || "").slice(0, 300)}`,
    ].filter(Boolean);
    return `- ${bits.join(" | ")}`;
  });
  return { contextText: lines.join("\n"), jobs };
}

function profileSummaryText(matchProfile) {
  if (!matchProfile) return null;
  const bits = [];
  if (matchProfile.skillNames.size) bits.push(`skills: ${[...matchProfile.skillNames].join(", ")}`);
  if (matchProfile.years > 0) bits.push(`~${Math.round(matchProfile.years * 10) / 10} years of work experience`);
  const loc = [matchProfile.locationCity, matchProfile.locationCountry].filter(Boolean).join(", ");
  if (loc) bits.push(`located in ${loc}`);
  return bits.length ? `Asker's own profile — ${bits.join("; ")}.` : null;
}

export const ask = async (req, res) => {
  try {
    const { question, languageCode = "en", history, sessionId } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: "Please enter a question." });
    if (question.length > 500) return res.status(400).json({ message: "Please keep your question under 500 characters." });

    if (!aiProviderConfigured) {
      const log = await AiQueryLog.create({
        question: question.trim(),
        languageCode,
        matchedCategories: "jobs",
        confidenceScore: 0,
        aiCalled: false,
        answerPreview: null,
        sessionId: sessionId || null,
      });
      return res.json({ aiConfigured: false, answer: null, keyPoints: [], referencedJobs: [], logId: log.id });
    }

    const [{ contextText, jobs }, matchProfile] = await Promise.all([
      buildJobsContext(),
      req.user?.id ? getUserMatchProfile(req.user.id) : Promise.resolve(null),
    ]);
    const profileText = profileSummaryText(matchProfile);
    const fullContext = profileText ? `${profileText}\n\nOpen jobs:\n${contextText}` : contextText;

    const generated = await generateGroundedJobAnswer({
      question: question.trim(),
      contextText: fullContext,
      history: Array.isArray(history) ? history.slice(-6) : [],
      languageCode,
    });

    const jobById = new Map(jobs.map((j) => [j.id, j]));
    const referencedJobs = (generated?.referencedJobIds || [])
      .map((id) => jobById.get(id))
      .filter(Boolean)
      .map((j) => ({ id: j.id, slug: j.slug, title: j.title, location: j.location, jobType: j.jobType }));

    const log = await AiQueryLog.create({
      question: question.trim(),
      languageCode,
      matchedCategories: "jobs",
      confidenceScore: generated ? 1 : 0,
      aiCalled: Boolean(generated),
      answerPreview: generated?.answer?.slice(0, 500) || null,
      sessionId: sessionId || null,
    });

    res.json({
      aiConfigured: true,
      answer: generated?.answer || null,
      keyPoints: generated?.keyPoints || [],
      referencedJobs,
      logId: log.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
