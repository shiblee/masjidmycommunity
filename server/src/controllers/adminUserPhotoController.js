import fs from "fs";
import User from "../models/User.js";
import AdminUser from "../models/AdminUser.js";
import { toAdminUser } from "./adminUserController.js";
import { recordProfileChange } from "../utils/profileChangeLog.js";

async function actorFrom(req) {
  const admin = await AdminUser.findByPk(req.user.id, { attributes: ["name"] });
  return { type: "admin", id: req.user.id, name: admin?.name || null };
}

export const upload = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (!req.file) return res.status(400).json({ message: "No photo was uploaded." });

    const previousPath = user.profilePhoto;
    user.profilePhoto = `/uploads/profile-photos/${req.file.filename}`;
    await user.save();

    if (previousPath) fs.unlink(`.${previousPath}`, () => {});

    recordProfileChange({
      userId: user.id,
      section: "photo",
      action: "update",
      actor: await actorFrom(req),
      fields: [{ field: "profilePhoto", oldValue: previousPath, newValue: user.profilePhoto }],
    }).catch(() => {});

    res.json({ user: toAdminUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const remove = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const previousPath = user.profilePhoto;
    user.profilePhoto = null;
    await user.save();

    if (previousPath) {
      fs.unlink(`.${previousPath}`, () => {});
      recordProfileChange({
        userId: user.id,
        section: "photo",
        action: "update",
        actor: await actorFrom(req),
        fields: [{ field: "profilePhoto", oldValue: previousPath, newValue: null }],
      }).catch(() => {});
    }

    res.json({ user: toAdminUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
