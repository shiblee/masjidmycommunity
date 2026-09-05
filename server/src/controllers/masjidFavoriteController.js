import MasjidFavorite from "../models/MasjidFavorite.js";

export const getFavoriteStatus = async (req, res) => {
  try {
    const favorite = await MasjidFavorite.findOne({ where: { masjidId: req.params.id, userId: req.user.id } });
    res.json({ favorited: !!favorite });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addFavorite = async (req, res) => {
  try {
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
