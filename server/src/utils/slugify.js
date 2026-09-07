import { Op } from "sequelize";

// Same algorithm as campaignController.js's/adminSuccessStoryController.js's
// own local slugify/generateUniqueSlug (kept duplicated there per this
// codebase's existing convention) — shared here instead since masjid slugs
// are generated from more than one call site (owner + admin creation, plus
// a one-time backfill for masjids that existed before this column did).
export function slugify(text, fallback = "item") {
  return (
    (text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback
  );
}

/** `excludeId` lets a rename re-slug without colliding with its own old row. */
export async function generateUniqueSlug(Model, text, { fallback = "item", excludeId } = {}) {
  const base = slugify(text, fallback);
  let slug = base;
  let n = 1;
  while (await Model.findOne({ where: excludeId ? { slug, id: { [Op.ne]: excludeId } } : { slug } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}
