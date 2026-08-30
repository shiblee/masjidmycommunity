import Language from "../models/Language.js";

const DEFAULTS = [
  { code: "en", name: "English", nativeName: "English", direction: "ltr", isDefault: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", isDefault: false },
  { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl", isDefault: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", isDefault: false },
];

export async function ensureLanguageDefaults() {
  const count = await Language.count();
  if (count === 0) {
    await Promise.all(DEFAULTS.map((lang, i) => Language.create({ ...lang, sortOrder: i })));
  }
}
