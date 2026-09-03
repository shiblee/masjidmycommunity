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
