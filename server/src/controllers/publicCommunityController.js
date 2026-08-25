import CommunityActivity from "../models/CommunityActivity.js";

export const listPublished = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 60);
    const activities = await CommunityActivity.findAll({
      where: { status: "published" },
      order: [
        ["isPinned", "DESC"],
        ["publishedAt", "DESC"],
      ],
      limit,
    });
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
