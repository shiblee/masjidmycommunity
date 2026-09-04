import MetaChangeLog from "../models/MetaChangeLog.js";

const PAGE_SIZE = 50;

export const list = async (req, res) => {
  try {
    const { entityType } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const where = {};
    if (entityType) where.entityType = entityType;

    const { rows, count } = await MetaChangeLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });

    res.json({
      entries: rows,
      total: count,
      page,
      totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
