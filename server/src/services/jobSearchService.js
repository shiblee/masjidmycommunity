import { parseJobSearchQuery } from "./aiProviderService.js";

// Thin natural-language-understanding layer in front of the Jobs board's
// own filter machinery — never a second search engine. Returns structured
// filters to merge into publicJobController.js's existing where-building
// (only for whichever filters the caller hasn't already set explicitly), or
// null when the AI parse itself is unconfigured/unavailable, in which case
// the caller falls back to treating the raw query as plain keyword text —
// search never breaks, it just loses the natural-language understanding.
export async function resolveSearchFilters({ nlQuery, languageCode }) {
  if (!nlQuery?.trim()) return null;
  const parsed = await parseJobSearchQuery({ query: nlQuery, languageCode });
  if (!parsed) return null;
  return {
    keywords: (parsed.keywords || []).filter(Boolean),
    location: parsed.location || null,
    jobType: parsed.jobType || null,
    experienceLevel: parsed.experienceLevel || null,
    workMode: parsed.workMode || null,
    skills: (parsed.skills || []).filter(Boolean),
  };
}
