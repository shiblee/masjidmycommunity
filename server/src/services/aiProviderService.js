import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

// Follows emailService.js's isConfigured-singleton style: env read once at
// module load, client built only if configured, callers try/catch and
// degrade gracefully. No API key is available yet — this ships fully wired
// so the assistant activates the moment ANTHROPIC_API_KEY is set, with zero
// code changes.
const AI_PROVIDER = (process.env.AI_PROVIDER || "claude").toLowerCase();
const AI_MODEL = process.env.AI_MODEL || (AI_PROVIDER === "claude" ? "claude-opus-5" : "gemini-2.5-flash");
// This is short, grounded Q&A over a handful of retrieved chunks, not hard
// reasoning — "low" effort is the right default for a chat/classification
// workload of this shape; env-overridable without a deploy.
const AI_EFFORT = process.env.AI_EFFORT || "low";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

export const aiProviderConfigured = AI_PROVIDER === "claude" ? Boolean(anthropic) : Boolean(GEMINI_API_KEY);
export const aiProviderName = AI_PROVIDER;

const AnswerSchema = z.object({
  answer: z.string(),
  keyPoints: z.array(z.string()).max(4),
});

const BIO_MAX_CHARS = 280;

const BioSchema = z.object({
  bio: z.string(),
});

// Belt-and-suspenders trim in case the model overshoots the limit despite the
// prompt — cuts at the last sentence boundary within the limit, falling back
// to the last word boundary, so a shortened bio never ends mid-word/mid-clause.
function clampBio(text, max = BIO_MAX_CHARS) {
  const trimmed = (text || "").trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("۔"), slice.lastIndexOf("۔ "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (sentenceEnd > max * 0.5) return slice.slice(0, sentenceEnd + 1).trim();
  const wordEnd = slice.lastIndexOf(" ");
  return (wordEnd > max * 0.5 ? slice.slice(0, wordEnd) : slice).trim();
}

function systemPrompt(languageCode) {
  return [
    "You are the Masjid My Community FAQ assistant. Answer strictly and only using the Context provided below — never use outside knowledge.",
    "If the Context does not contain enough information to answer, say plainly that you don't have enough information about that in Masjid My Community's published content — do not guess or invent facts.",
    "Never write, quote, or paraphrase any Qur'an verse or Hadith yourself — verified religious references are attached separately by the application, not by you.",
    `Respond in this language: ${languageCode}.`,
    "Keep 'answer' to 2-4 short sentences and 'keyPoints' to at most 4 short bullet phrases (use fewer, or none, if the answer doesn't need them).",
    "Do not mention sources, citations, or where the information came from — that is handled separately by the application.",
  ].join(" ");
}

async function callClaude({ question, contextText, history, languageCode }) {
  const response = await anthropic.messages.parse({
    model: AI_MODEL,
    max_tokens: 700,
    system: [{ type: "text", text: systemPrompt(languageCode), cache_control: { type: "ephemeral" } }],
    output_config: { format: zodOutputFormat(AnswerSchema), effort: AI_EFFORT },
    messages: [
      ...(history || []),
      { role: "user", content: `Context:\n${contextText || "(no relevant content found)"}\n\nQuestion: ${question}` },
    ],
  });
  return response.parsed_output; // null if parsing failed — caller guards
}

// Documented best-effort stub — AI_PROVIDER=gemini is not being activated
// now (Claude is the locked default). Verify this request shape against
// live Gemini API docs before ever setting AI_PROVIDER=gemini in production.
async function callGemini({ question, contextText, languageCode }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(languageCode) }] },
        contents: [{ role: "user", parts: [{ text: `Context:\n${contextText || "(no relevant content found)"}\n\nQuestion: ${question}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: { answer: { type: "string" }, keyPoints: { type: "array", items: { type: "string" } } },
            required: ["answer", "keyPoints"],
          },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

function bioSystemPrompt(languageCode) {
  return [
    "You write short personal bios for member profiles on Masjid My Community, a community platform.",
    "Use ONLY the profile information given below — never invent qualifications, jobs, employers, schools, skills, or achievements that aren't present in it.",
    "Write a natural, warm, professional bio, understanding the information collectively rather than just listing fields one after another.",
    "Do not repeat the same fact twice. If the profile has very little information, write a short, honest bio from whatever is available rather than padding it with assumptions.",
    `HARD LIMIT: the 'bio' field must be at most ${BIO_MAX_CHARS} characters total (including spaces and punctuation) — this is a character limit, not a word limit. If your first draft is longer, rewrite it shorter before responding. Never end mid-sentence or mid-word.`,
    `Respond in this language, written naturally as a native speaker would (not a literal translation): ${languageCode}.`,
    "Output plain text only — no markdown, no quotation marks, no hashtags, no emoji.",
  ].join(" ");
}

async function callClaudeBio({ profileContext, languageCode }) {
  const response = await anthropic.messages.parse({
    model: AI_MODEL,
    max_tokens: 300,
    system: [{ type: "text", text: bioSystemPrompt(languageCode), cache_control: { type: "ephemeral" } }],
    output_config: { format: zodOutputFormat(BioSchema), effort: AI_EFFORT },
    messages: [{ role: "user", content: `Profile information:\n${profileContext}` }],
  });
  return response.parsed_output;
}

// Same documented-stub status as callGemini above — not activated, kept only
// so AI_PROVIDER stays a real switch rather than a Claude-only illusion.
async function callGeminiBio({ profileContext, languageCode }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: bioSystemPrompt(languageCode) }] },
        contents: [{ role: "user", parts: [{ text: `Profile information:\n${profileContext}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "object", properties: { bio: { type: "string" } }, required: ["bio"] },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

// Same null-on-failure contract as generateGroundedAnswer. `profileContext`
// is a plain-text summary the caller builds from the member's own saved
// profile fields (work experience, education, skills, hobbies, ...).
export async function generateBio({ profileContext, languageCode }) {
  if (!aiProviderConfigured) return null;
  try {
    const parsed =
      AI_PROVIDER === "claude"
        ? await callClaudeBio({ profileContext, languageCode })
        : await callGeminiBio({ profileContext, languageCode });
    if (!parsed?.bio) return null;
    return { bio: clampBio(parsed.bio) };
  } catch (error) {
    console.error("AI provider bio generation failed:", error.message);
    return null;
  }
}

const WorkExperienceSchema = z.object({
  description: z.string(),
  achievements: z.array(z.string()).max(5),
  skills: z.array(z.string()).max(8),
});

function workExperienceSystemPrompt(languageCode) {
  return [
    "You help members polish one Work Experience entry for their profile on Masjid My Community — turning rough notes into a professional, recruiter-friendly entry.",
    "Use ONLY the job title, company, and rough notes given below. Never invent employers, dates, clients, metrics, named projects, or outcomes that aren't stated or clearly implied by the notes.",
    "If the notes are sparse or empty, write a brief, honest, appropriately general description based on the typical duties of that job title — do not fabricate specific accomplishments, numbers, or projects that weren't mentioned.",
    "'description': rewrite into 2-4 professional sentences, active voice, no first person ('I'/'my').",
    "'achievements': up to 5 short, concrete accomplishment statements — only ones genuinely supported by the notes; return fewer (or an empty list) rather than padding with generic claims.",
    "'skills': up to 8 relevant skills or technologies explicitly mentioned or clearly implied by the notes — never guess skills with no basis in the given text.",
    `Respond in this language, written naturally as a native speaker would: ${languageCode}.`,
    "Output plain text only for 'description' — no markdown, no quotation marks.",
  ].join(" ");
}

async function callClaudeWorkExperience({ title, company, notes, languageCode }) {
  const response = await anthropic.messages.parse({
    model: AI_MODEL,
    max_tokens: 500,
    system: [{ type: "text", text: workExperienceSystemPrompt(languageCode), cache_control: { type: "ephemeral" } }],
    output_config: { format: zodOutputFormat(WorkExperienceSchema), effort: AI_EFFORT },
    messages: [{ role: "user", content: `Job Title: ${title || "(not given)"}\nCompany: ${company || "(not given)"}\nRough notes: ${notes || "(none provided)"}` }],
  });
  return response.parsed_output;
}

// Same documented-stub status as callGemini/callGeminiBio above.
async function callGeminiWorkExperience({ title, company, notes, languageCode }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: workExperienceSystemPrompt(languageCode) }] },
        contents: [{ role: "user", parts: [{ text: `Job Title: ${title || "(not given)"}\nCompany: ${company || "(not given)"}\nRough notes: ${notes || "(none provided)"}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: { description: { type: "string" }, achievements: { type: "array", items: { type: "string" } }, skills: { type: "array", items: { type: "string" } } },
            required: ["description", "achievements", "skills"],
          },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

// Same null-on-failure contract as generateBio. `title`/`company`/`notes` are
// the draft values currently typed into the Add/Edit Work Experience form —
// there's no stored context to fetch, so this works identically for a brand
// new entry or one being edited, self-service or admin-on-behalf-of-member.
export async function generateWorkExperienceEnhancement({ title, company, notes, languageCode }) {
  if (!aiProviderConfigured) return null;
  try {
    const parsed =
      AI_PROVIDER === "claude"
        ? await callClaudeWorkExperience({ title, company, notes, languageCode })
        : await callGeminiWorkExperience({ title, company, notes, languageCode });
    if (!parsed?.description) return null;
    return {
      description: parsed.description.trim(),
      achievements: (parsed.achievements || []).map((a) => a.trim()).filter(Boolean).slice(0, 5),
      skills: (parsed.skills || []).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    };
  } catch (error) {
    console.error("AI provider work-experience enhancement failed:", error.message);
    return null;
  }
}

const EducationSchema = z.object({
  description: z.string(),
});

function educationSystemPrompt(languageCode) {
  return [
    "You help members polish the 'description' field of one Education entry on their Masjid My Community profile.",
    "Use ONLY the education level, degree, institution, field of study, and rough notes given below. Never invent institutions, degrees, dates, honors, GPAs, or achievements that aren't stated or clearly implied by the notes.",
    "If the notes are sparse or empty, write a brief, honest, general description based on the given degree/field/institution — do not fabricate specific accomplishments.",
    "Rewrite into 2-4 professional sentences, active voice, no first person ('I'/'my').",
    `Respond in this language, written naturally as a native speaker would: ${languageCode}.`,
    "Output plain text only — no markdown, no quotation marks.",
  ].join(" ");
}

async function callClaudeEducation({ level, degree, institution, fieldOfStudy, notes, languageCode }) {
  const response = await anthropic.messages.parse({
    model: AI_MODEL,
    max_tokens: 350,
    system: [{ type: "text", text: educationSystemPrompt(languageCode), cache_control: { type: "ephemeral" } }],
    output_config: { format: zodOutputFormat(EducationSchema), effort: AI_EFFORT },
    messages: [{
      role: "user",
      content: `Education Level: ${level || "(not given)"}\nDegree: ${degree || "(not given)"}\nInstitution: ${institution || "(not given)"}\nField of Study: ${fieldOfStudy || "(not given)"}\nRough notes: ${notes || "(none provided)"}`,
    }],
  });
  return response.parsed_output;
}

async function callGeminiEducation({ level, degree, institution, fieldOfStudy, notes, languageCode }) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: educationSystemPrompt(languageCode) }] },
        contents: [{
          role: "user",
          parts: [{ text: `Education Level: ${level || "(not given)"}\nDegree: ${degree || "(not given)"}\nInstitution: ${institution || "(not given)"}\nField of Study: ${fieldOfStudy || "(not given)"}\nRough notes: ${notes || "(none provided)"}` }],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: { type: "object", properties: { description: { type: "string" } }, required: ["description"] },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? JSON.parse(text) : null;
}

// Same null-on-failure contract as generateWorkExperienceEnhancement. No
// stored context to fetch — this works on the currently-typed draft fields.
export async function generateEducationEnhancement({ level, degree, institution, fieldOfStudy, notes, languageCode }) {
  if (!aiProviderConfigured) return null;
  try {
    const parsed =
      AI_PROVIDER === "claude"
        ? await callClaudeEducation({ level, degree, institution, fieldOfStudy, notes, languageCode })
        : await callGeminiEducation({ level, degree, institution, fieldOfStudy, notes, languageCode });
    if (!parsed?.description) return null;
    return { description: parsed.description.trim() };
  } catch (error) {
    console.error("AI provider education enhancement failed:", error.message);
    return null;
  }
}

// Returns null (not a thrown error) both when unconfigured and when the
// call fails — callers distinguish "not configured" from "temporarily
// unavailable" using aiProviderConfigured, and log the real error either way.
export async function generateGroundedAnswer({ question, contextText, history, languageCode }) {
  if (!aiProviderConfigured) return null;
  try {
    const parsed =
      AI_PROVIDER === "claude"
        ? await callClaude({ question, contextText, history, languageCode })
        : await callGemini({ question, contextText, languageCode });
    if (!parsed) return null;
    return { answer: parsed.answer, keyPoints: parsed.keyPoints || [] };
  } catch (error) {
    console.error("AI provider call failed:", error.message);
    return null;
  }
}
