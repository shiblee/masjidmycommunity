import RequirementCategory from "../models/RequirementCategory.js";
import RequirementSubcategory from "../models/RequirementSubcategory.js";

// From the Requirement Module spec's own example table.
const DEFAULTS = [
  ["Home Service", "building", ["Home Cleaning", "Carpenter", "Water Tank Cleaning"]],
  ["Personal Care", "heart", ["Salon", "Beautician", "Elder Care"]],
  ["Repair & Maintenance", "edit", ["Electrician", "Plumber", "AC Repair"]],
  ["Events & Weddings", "megaphone", ["Catering", "Decoration", "Photography"]],
  ["Education & Training", "book", ["Tuition", "Computer Training", "Language Classes"]],
];

export async function ensureRequirementCategoryDefaults() {
  const count = await RequirementCategory.count();
  if (count > 0) return;
  for (const [name, icon, subcategories] of DEFAULTS) {
    const category = await RequirementCategory.create({ name, icon, sortOrder: DEFAULTS.findIndex((d) => d[0] === name) });
    await Promise.all(subcategories.map((subName, i) => RequirementSubcategory.create({ categoryId: category.id, name: subName, sortOrder: i })));
  }
}
