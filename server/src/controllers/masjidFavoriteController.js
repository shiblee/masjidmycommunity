import Masjid from "../models/Masjid.js";
import MasjidFavorite from "../models/MasjidFavorite.js";

// Same approval gate reviews already use — an unapproved/inactive masjid
// shouldn't expose (or accept) Like engagement.
async function findPublicMasjid(masjidId) {
  return Masjid.findOne({ where: { id: masjidId, status: "approved", moderationStatus: "active" } });
}

export const getFavoriteStatus = async (req, res) => {
  try {
    const masjid = await findPublicMasjid(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const favorite = await MasjidFavorite.findOne({ where: { masjidId: req.params.id, userId: req.user.id } });
    res.json({ favorited: !!favorite });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addFavorite = async (req, res) => {
  try {
    const masjid = await findPublicMasjid(req.params.id);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    await MasjidFavorite.findOrCreate({ where: { masjidId: req.params.id, userId: req.user.id } });
    res.json({ favorited: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeFavorite = async (req, res) => {
  try {
    await MasjidFavorite.destroy({ where: { masjidId: req.params.id, userId: req.user.id } });
    res.json({ favorited: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
