import AiQueryLog from "../models/AiQueryLog.js";

const PAGE_SIZE = 50;

export const list = async (req, res) => {
  try {
    const { aiCalled, feedback, page = 1 } = req.query;
    const where = {};
    if (aiCalled !== undefined) where.aiCalled = aiCalled === "true";
    if (feedback) where.feedback = feedback;

    const pageNum = Math.max(1, Number(page) || 1);
    const { rows, count } = await AiQueryLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: PAGE_SIZE,
      offset: (pageNum - 1) * PAGE_SIZE,
    });

    res.json({ logs: rows, totalItems: count, totalPages: Math.max(1, Math.ceil(count / PAGE_SIZE)), page: pageNum });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const counts = async (req, res) => {
  try {
    const [total, belowThreshold, unhelpful] = await Promise.all([
      AiQueryLog.count(),
      AiQueryLog.count({ where: { aiCalled: false } }),
      AiQueryLog.count({ where: { feedback: "unhelpful" } }),
    ]);
    res.json({ total, belowThreshold, unhelpful });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
