import Masjid from "../models/Masjid.js";
import { generateUniqueSlug } from "../utils/slugify.js";

// One-time backfill for masjids created before the `slug` column existed —
// every masjid created going forward already gets one at creation time (see
// masjidController.js's createDraft and adminMasjidController.js's
// createMasjid). Runs on every boot but only ever touches rows that still
// have slug: null, so it's a no-op once every masjid has one.
export async function ensureMasjidSlugs() {
  const missing = await Masjid.findAll({ where: { slug: null }, attributes: ["id", "name"] });
  for (const masjid of missing) {
    const slug = await generateUniqueSlug(Masjid, masjid.name, { fallback: `masjid-${masjid.id}` });
    await Masjid.update({ slug }, { where: { id: masjid.id } });
  }
}
