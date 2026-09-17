import Requirement from "../models/Requirement.js";
import RequirementCategory from "../models/RequirementCategory.js";
import RequirementSubcategory from "../models/RequirementSubcategory.js";
import User from "../models/User.js";
import { sendRequirementSubmittedEmail } from "../services/emailService.js";
// notifyMatchingProviders (Phase 3 -- provider opt-in matching) wires in here
// once that service exists.

function validateFields(body) {
  if (!body.categoryId) return "Category is required.";
  if (!body.subcategoryId) return "Subcategory is required.";
  if (!body.remark?.trim()) return "Requirement details are required.";
  if (!body.address?.trim()) return "Address is required.";
  return null;
}

export const createRequirement = async (req, res) => {
  try {
    const error = validateFields(req.body);
    if (error) return res.status(400).json({ message: error });

    const { categoryId, subcategoryId, remark, address, formattedAddress, latitude, longitude, placeId } = req.body;

    const category = await RequirementCategory.findByPk(categoryId);
    if (!category) return res.status(400).json({ message: "That category no longer exists." });
    const subcategory = await RequirementSubcategory.findByPk(subcategoryId);
    if (!subcategory || subcategory.categoryId !== category.id) return res.status(400).json({ message: "That subcategory no longer exists under this category." });

    const requirement = await Requirement.create({
      userId: req.user.id,
      categoryId: category.id,
      subcategoryId: subcategory.id,
      categoryName: category.name,
      subcategoryName: subcategory.name,
      remark: remark.trim(),
      address: address.trim(),
      formattedAddress: formattedAddress?.trim() || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      placeId: placeId?.trim() || null,
    });

    const user = await User.findByPk(req.user.id);
    sendRequirementSubmittedEmail(requirement, user).catch(() => {});

    res.status(201).json({ requirement });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listMine = async (req, res) => {
  try {
    const requirements = await Requirement.findAll({ where: { userId: req.user.id }, order: [["createdAt", "DESC"]] });
    res.json({ requirements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
