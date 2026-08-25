import CommunityActivity from "../models/CommunityActivity.js";

export const listAll = async (req, res) => {
  try {
    const { type, status, page = 1, pageSize = 20 } = req.query;
    const where = {};
    if (type && type !== "all") where.type = type;
    if (status && status !== "all") where.status = status;

    const limit = Math.min(Number(pageSize) || 20, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const { rows, count } = await CommunityActivity.findAndCountAll({
      where,
      order: [
        ["isPinned", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit,
      offset,
    });

    res.json({ activities: rows, total: count, page: Number(page) || 1, pageSize: limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function findOr404(req, res) {
  const activity = await CommunityActivity.findByPk(req.params.id);
  if (!activity) {
    res.status(404).json({ message: "Activity not found." });
    return null;
  }
  return activity;
}

export const update = async (req, res) => {
  try {
    const activity = await findOr404(req, res);
    if (!activity) return;
    for (const field of ["title", "body", "imageUrl"]) {
      if (req.body[field] !== undefined) activity[field] = req.body[field];
    }
    await activity.save();
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setStatus = async (req, res, status) => {
  try {
    const activity = await findOr404(req, res);
    if (!activity) return;
    activity.status = status;
    if (status === "published" && !activity.publishedAt) activity.publishedAt = new Date();
    await activity.save();
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const publish = (req, res) => setStatus(req, res, "published");
export const hide = (req, res) => setStatus(req, res, "hidden");

export const setPinned = async (req, res, pinned) => {
  try {
    const activity = await findOr404(req, res);
    if (!activity) return;
    activity.isPinned = pinned;
    await activity.save();
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const pin = (req, res) => setPinned(req, res, true);
export const unpin = (req, res) => setPinned(req, res, false);

export const remove = async (req, res) => {
  try {
    const activity = await findOr404(req, res);
    if (!activity) return;
    await activity.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
