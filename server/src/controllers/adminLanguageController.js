import Language from "../models/Language.js";

const CODE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

export const list = async (req, res) => {
  try {
    const languages = await Language.findAll({ order: [["sortOrder", "ASC"]] });
    res.json({ languages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const { code, name, nativeName, direction, isActive } = req.body;
    const trimmedCode = code?.trim().toLowerCase();
    if (!trimmedCode || !CODE_RE.test(trimmedCode)) return res.status(400).json({ message: "Enter a valid language code, e.g. en or en-US." });
    if (!name?.trim()) return res.status(400).json({ message: "Language name is required." });
    if (!nativeName?.trim()) return res.status(400).json({ message: "Native name is required." });
    if (!["ltr", "rtl"].includes(direction)) return res.status(400).json({ message: "Direction must be ltr or rtl." });

    const maxOrder = (await Language.max("sortOrder")) || 0;
    const language = await Language.create({
      code: trimmedCode,
      name: name.trim(),
      nativeName: nativeName.trim(),
      direction,
      sortOrder: maxOrder + 1,
      ...(isActive !== undefined ? { isActive } : {}),
    });
    res.status(201).json({ language });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That language code already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const language = await Language.findByPk(req.params.id);
    if (!language) return res.status(404).json({ message: "Language not found." });

    if (req.body.name !== undefined) language.name = req.body.name.trim();
    if (req.body.nativeName !== undefined) language.nativeName = req.body.nativeName.trim();
    if (req.body.direction !== undefined) {
      if (!["ltr", "rtl"].includes(req.body.direction)) return res.status(400).json({ message: "Direction must be ltr or rtl." });
      language.direction = req.body.direction;
    }
    if (req.body.sortOrder !== undefined) language.sortOrder = req.body.sortOrder;

    if (req.body.isActive !== undefined) {
      if (!req.body.isActive && language.isDefault) return res.status(400).json({ message: "The default language can't be deactivated — set a different default first." });
      language.isActive = req.body.isActive;
    }

    if (req.body.isDefault === true && !language.isDefault) {
      // Only one language can be the default — same "clear the rest, then set
      // the one" idiom used for MasjidPhoto.isCover.
      await Language.update({ isDefault: false }, { where: {} });
      language.isDefault = true;
      if (!language.isActive) language.isActive = true;
    }

    await language.save();
    res.json({ language });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") return res.status(409).json({ message: "That language code already exists." });
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const language = await Language.findByPk(req.params.id);
    if (!language) return res.status(404).json({ message: "Language not found." });
    if (language.isDefault) return res.status(400).json({ message: "The default language can't be deleted — set a different default first." });
    await language.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
