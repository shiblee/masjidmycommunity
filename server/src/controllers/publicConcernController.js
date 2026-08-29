import ConcernType from "../models/ConcernType.js";
import Concern from "../models/Concern.js";
import ConcernHistory from "../models/ConcernHistory.js";
import { sendConcernSubmittedAdminEmail, sendConcernSubmittedUserEmail } from "../services/emailService.js";

export const listTypes = async (req, res) => {
  try {
    const types = await ConcernType.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name"] });
    res.json({ types });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function makeReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CONCERN-${code}`;
}

export const submit = async (req, res) => {
  try {
    const { fullName, email, concernType, subject, description, relatedReference } = req.body;
    if (!fullName?.trim()) return res.status(400).json({ message: "Your name is required." });
    if (!/^\S+@\S+\.\S+$/.test(email || "")) return res.status(400).json({ message: "Enter a valid email so we can follow up." });
    if (!concernType?.trim()) return res.status(400).json({ message: "Please choose the type of concern." });
    if (!subject?.trim()) return res.status(400).json({ message: "A subject is required." });
    if (!description || description.trim().length < 20) return res.status(400).json({ message: "Please provide at least a few sentences of detail." });

    let reference = makeReference();
    // Vanishingly unlikely, but guard against a collision on the unique reference.
    while (await Concern.findOne({ where: { reference } })) reference = makeReference();

    const concern = await Concern.create({
      reference,
      userId: req.user?.type === "user" ? req.user.id : null,
      fullName: fullName.trim(),
      email: email.trim(),
      concernType: concernType.trim(),
      subject: subject.trim(),
      description: description.trim(),
      relatedReference: relatedReference?.trim() || null,
    });
    await ConcernHistory.create({ concernId: concern.id, action: "submitted", actorType: "user", actorName: concern.fullName, note: null });

    sendConcernSubmittedAdminEmail(concern).catch(() => {});
    sendConcernSubmittedUserEmail(concern).catch(() => {});

    res.status(201).json({ concern: { reference: concern.reference, status: concern.status } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
