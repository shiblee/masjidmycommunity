import Masjid from "../models/Masjid.js";
import MasjidHistory from "../models/MasjidHistory.js";
import User from "../models/User.js";

// Deliberately not a new table/admin-review-queue — this is the "simple
// feedback form" scope. Recorded onto the masjid's existing MasjidHistory
// feed (action: "edit_suggested"), which admins already see on the
// Overview tab of /admin/masjids/:id, so it's genuinely reviewable without
// any new admin UI.
const CATEGORIES = new Set(["Name", "Category", "Location", "Photos", "Other"]);
const DESCRIPTION_MAX = 1000;

export const suggestEdit = async (req, res) => {
  try {
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: "approved", moderationStatus: "active" } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const category = req.body.category;
    if (!CATEGORIES.has(category)) {
      return res.status(400).json({ message: "Please select what needs to be corrected." });
    }
    const description = req.body.description?.trim();
    if (!description) {
      return res.status(400).json({ message: "Please describe the correction." });
    }
    if (description.length > DESCRIPTION_MAX) {
      return res.status(400).json({ message: `Please keep your description to ${DESCRIPTION_MAX} characters or fewer.` });
    }

    const user = await User.findByPk(req.user.id, { attributes: ["fullName"] });
    await MasjidHistory.create({
      masjidId: masjid.id,
      action: "edit_suggested",
      actorType: "user",
      actorName: user?.fullName || "A community member",
      note: `[${category}] ${description}`,
    });

    res.status(201).json({ message: "Thanks! Your suggestion has been sent for review." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
