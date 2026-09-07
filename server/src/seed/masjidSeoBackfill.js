import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import { generateSeoMeta } from "../services/aiProviderService.js";

// One-time backfill for masjids approved before this feature existed (and
// for approved masjids whose fields are still blank for any other reason —
// generateSeoMeta always returns a usable result now, AI-written when
// configured, a deterministic fallback built from the masjid's own fields
// otherwise, so this never leaves them empty). Runs on every boot but only
// ever touches approved masjids missing a metaTitle/metaDescription, so
// it's a no-op once every approved masjid has both.
export async function ensureMasjidSeoMeta() {
  const missing = await Masjid.findAll({
    where: { status: "approved", [Op.or]: [{ metaTitle: null }, { metaDescription: null }] },
  });
  for (const masjid of missing) {
    const seo = await generateSeoMeta({
      name: masjid.name, category: masjid.category, city: masjid.city, country: masjid.country,
      tagline: masjid.tagline, about: masjid.about,
    });
    if (!masjid.metaTitle) masjid.metaTitle = seo.metaTitle;
    if (!masjid.metaDescription) masjid.metaDescription = seo.metaDescription;
    await masjid.save();
  }
}
