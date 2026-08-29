import UserNotification from "../models/UserNotification.js";

export const listMine = async (req, res) => {
  try {
    const notifications = await UserNotification.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 30,
    });
    const unreadCount = await UserNotification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markRead = async (req, res) => {
  try {
    const notification = await UserNotification.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!notification) return res.status(404).json({ message: "Notification not found." });

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }
    const unreadCount = await UserNotification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ notification, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await UserNotification.update({ isRead: true, readAt: new Date() }, { where: { userId: req.user.id, isRead: false } });
    res.json({ unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
