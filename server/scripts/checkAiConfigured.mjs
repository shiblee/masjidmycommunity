// Read-only — reports only whether ANTHROPIC_API_KEY is set (never its
// value), since that gates every AI feature including the review
// classifier that feeds /admin/pending-reviews.
import "dotenv/config";
console.log("AI_PROVIDER:", process.env.AI_PROVIDER || "(default: claude)");
console.log("ANTHROPIC_API_KEY set:", !!process.env.ANTHROPIC_API_KEY);
console.log("GEMINI_API_KEY set:", !!process.env.GEMINI_API_KEY);
