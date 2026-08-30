import Language from "../models/Language.js";
import Translation from "../models/Translation.js";

export const listLanguages = async (req, res) => {
  try {
    const languages = await Language.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"]],
      attributes: ["code", "name", "nativeName", "direction", "isDefault"],
    });
    res.json({ languages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTranslations = async (req, res) => {
  try {
    const language = await Language.findOne({ where: { code: req.params.code, isActive: true } });
    if (!language) return res.status(404).json({ message: "Language not found." });

    const rows = await Translation.findAll({ where: { languageCode: req.params.code }, attributes: ["key", "value"] });
    const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({ direction: language.direction, values });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
