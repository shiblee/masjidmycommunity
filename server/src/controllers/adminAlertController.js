import AdminNotification from "../models/AdminNotification.js";

export const list = async (req, res) => {
  try {
    const alerts = await AdminNotification.findAll({ order: [["createdAt", "DESC"]], limit: 30 });
    const unreadCount = await AdminNotification.count({ where: { isRead: false } });
    res.json({ alerts, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markRead = async (req, res) => {
  try {
    const alert = await AdminNotification.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: "Notification not found." });

    if (!alert.isRead) {
      alert.isRead = true;
      alert.readAt = new Date();
      await alert.save();
    }
    const unreadCount = await AdminNotification.count({ where: { isRead: false } });
    res.json({ alert, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await AdminNotification.update({ isRead: true, readAt: new Date() }, { where: { isRead: false } });
    res.json({ unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
