import fs from "fs";
import path from "path";

// Real, high-resolution photographs of Indian people (Pexels' search API,
// licensed stock photography -- consenting professional models, not random
// strangers) rather than an illustrated/SVG avatar or a low-res, non-
// nationality-aware generic photo pool. Written into the exact same
// folder/URL convention real uploaded profile photos use (server/src/
// middleware/upload.js), so nothing downstream (profile page, admin list,
// Community Wall) needs to know the difference.
//
// PEXELS_API_KEY is set via the "Set PEXELS_API_KEY on server" workflow
// (mirrors how GIPHY_API_KEY is provisioned) -- server/.env lives outside
// git and persists across deploys.
const UPLOAD_ROOT = path.resolve("uploads", "profile-photos");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

// Deliberately varied phrasing/age/context so repeated calls don't keep
// landing on the same handful of top search results -- combined with a
// randomized page number below, this is what keeps different bot accounts
// from ending up with the same-looking (or highly similar) face. Includes
// explicitly Muslim-presenting terms (hijab, muslim man/woman) alongside
// the general Indian ones, since this platform's members are Indian
// Muslims specifically, not Indians generally.
const QUERY_TERMS = {
  male: [
    "indian man portrait", "indian man face", "indian young man", "indian senior man",
    "indian professional man headshot", "indian man smiling", "indian businessman portrait",
    "muslim man portrait", "muslim man face", "indian muslim man", "muslim man beard portrait",
  ],
  female: [
    "indian woman portrait", "indian woman face", "indian young woman", "indian senior woman",
    "indian professional woman headshot", "indian woman smiling", "indian businesswoman portrait",
    "muslim woman hijab portrait", "muslim woman portrait", "indian muslim woman", "hijab woman portrait",
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchIndianPortraitPhoto(gender) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error("PEXELS_API_KEY is not configured.");

  const pool = gender === "female" ? QUERY_TERMS.female : gender === "male" ? QUERY_TERMS.male : pickRandom([...QUERY_TERMS.male, ...QUERY_TERMS.female]);
  const query = pickRandom(Array.isArray(pool) ? pool : QUERY_TERMS.male);
  const perPage = 24;
  const page = Math.floor(Math.random() * 8) + 1; // spread picks across the first ~8 pages of results

  const searchRes = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&orientation=square`,
    { headers: { Authorization: apiKey } }
  );
  if (!searchRes.ok) throw new Error(`Pexels search returned ${searchRes.status}`);
  const data = await searchRes.json();
  const photos = data?.photos || [];
  if (!photos.length) throw new Error(`Pexels returned no results for "${query}" (page ${page})`);

  const photo = pickRandom(photos);
  // "large" is Pexels' ~940px-wide variant -- sharp and clearly higher
  // resolution than a typical avatar, without pulling the multi-MB
  // "original" for what's ultimately displayed at profile-photo size.
  const photoUrl = photo?.src?.large || photo?.src?.large2x || photo?.src?.original;
  if (!photoUrl) throw new Error("Pexels result had no usable photo URL");

  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) throw new Error(`Photo download failed with ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

/**
 * Fetches a real, high-resolution, Indian-representative human photograph
 * and saves it under the `bot-<username>.jpg` convention every bot-
 * generated photo uses (see backfillBotProfilePhotos.mjs, which treats any
 * "/uploads/profile-photos/bot-*" file as safe to regenerate/replace),
 * returning the same `/uploads/profile-photos/<filename>` shape
 * User.profilePhoto already stores everywhere else. Retries a few times
 * since this depends on a third-party API; on persistent failure returns
 * null rather than throwing, so a transient network hiccup never blocks
 * the registration this is called from.
 */
export async function generateRealisticProfilePhoto(username, gender, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const buffer = await fetchIndianPortraitPhoto(gender);
      const filename = `bot-${username}.jpg`;
      fs.writeFileSync(path.join(UPLOAD_ROOT, filename), buffer);
      return `/uploads/profile-photos/${filename}`;
    } catch (error) {
      console.error(`generateRealisticProfilePhoto attempt ${i + 1}/${attempts} failed for ${username}:`, error.message);
    }
  }
  return null;
}
