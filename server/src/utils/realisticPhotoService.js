import fs from "fs";
import path from "path";

// Real stock photography of people (randomuser.me — a public, free,
// no-key-required API purpose-built for seeding fake/demo user profiles
// with genuine human photographs, gender-matched) rather than an
// illustrated/SVG avatar. Written into the exact same folder/URL
// convention real uploaded profile photos use (server/src/middleware/
// upload.js), so nothing downstream (profile page, admin list, Community
// Wall) needs to know the difference.
const UPLOAD_ROOT = path.resolve("uploads", "profile-photos");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

async function fetchRandomPersonPhoto(gender) {
  const g = gender === "female" ? "female" : gender === "male" ? "male" : Math.random() < 0.5 ? "male" : "female";
  const apiRes = await fetch(`https://randomuser.me/api/?gender=${g}&inc=picture&noinfo`);
  if (!apiRes.ok) throw new Error(`randomuser.me returned ${apiRes.status}`);
  const data = await apiRes.json();
  const photoUrl = data?.results?.[0]?.picture?.large;
  if (!photoUrl) throw new Error("randomuser.me returned no photo URL");

  const imgRes = await fetch(photoUrl);
  if (!imgRes.ok) throw new Error(`Photo download failed with ${imgRes.status}`);
  return Buffer.from(await imgRes.arrayBuffer());
}

/**
 * Fetches a real, gender-matched human photograph and saves it under the
 * same filename convention the old SVG identicon generator used
 * (`bot-<username>.jpg`, same UPLOAD_ROOT), returning the same
 * `/uploads/profile-photos/<filename>` shape User.profilePhoto already
 * stores everywhere else. Retries a few times since this depends on a
 * third-party API; on persistent failure returns null rather than
 * throwing, so a transient network hiccup never blocks the registration
 * this is called from -- the account is simply left without a photo,
 * ready to be picked up later by the backfill script.
 */
export async function generateRealisticProfilePhoto(username, gender, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const buffer = await fetchRandomPersonPhoto(gender);
      const filename = `bot-${username}.jpg`;
      fs.writeFileSync(path.join(UPLOAD_ROOT, filename), buffer);
      return `/uploads/profile-photos/${filename}`;
    } catch (error) {
      console.error(`generateRealisticProfilePhoto attempt ${i + 1}/${attempts} failed for ${username}:`, error.message);
    }
  }
  return null;
}
