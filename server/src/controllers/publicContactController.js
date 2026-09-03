import ContactMessage from "../models/ContactMessage.js";
import ContactMessageHistory from "../models/ContactMessageHistory.js";
import ContactTopic from "../models/ContactTopic.js";
import { sendContactMessageEmail, sendContactAcknowledgementEmail } from "../services/emailService.js";
import { notifyAdmins } from "../services/adminAlertService.js";

function makeReference() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `CONTACT-${code}`;
}

export const listTopics = async (req, res) => {
  try {
    const topics = await ContactTopic.findAll({ where: { isActive: true }, order: [["sortOrder", "ASC"]], attributes: ["id", "name", "icon"] });
    res.json({ topics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submit = async (req, res) => {
  try {
    const { fullName, email, topic, message } = req.body;
    if (!fullName?.trim()) return res.status(400).json({ message: "Your name is required." });
    if (!/^\S+@\S+\.\S+$/.test(email || "")) return res.status(400).json({ message: "Enter a valid email so we can reply." });
    if (!message || message.trim().length < 10) return res.status(400).json({ message: "Please share a little more detail in your message." });

    let reference = makeReference();
    // Vanishingly unlikely, but guard against a collision on the unique reference.
    while (await ContactMessage.findOne({ where: { reference } })) reference = makeReference();

    // Topic is stored as its display name directly (matching how ConcernType
    // is referenced on Concern.concernType) — validated against the active
    // Meta-managed list rather than a hardcoded map, so admins can add/rename
    // topics without a code change.
    const matchedTopic = await ContactTopic.findOne({ where: { name: topic, isActive: true } });
    const fallbackTopic = matchedTopic || (await ContactTopic.findOne({ where: { isActive: true }, order: [["sortOrder", "ASC"]] }));
    const topicName = fallbackTopic?.name || "General Inquiry";

    const contactMessage = await ContactMessage.create({
      reference,
      fullName: fullName.trim(),
      email: email.trim(),
      topic: topicName,
      message: message.trim(),
    });
    await ContactMessageHistory.create({
      contactMessageId: contactMessage.id,
      action: "submitted",
      actorType: "user",
      actorName: contactMessage.fullName,
      note: null,
    });

    // The message is now durably recorded and will reach the admin via the
    // Contact Us Inquiries panel and bell notification regardless of email
    // deliverability, so a skipped/failed notification email no longer fails
    // the whole submission the way it did before persistence existed.
    sendContactMessageEmail({
      fullName: contactMessage.fullName,
      email: contactMessage.email,
      topic: topicName,
      message: contactMessage.message,
      reference: contactMessage.reference,
    }).catch(() => {});
    sendContactAcknowledgementEmail(contactMessage).catch(() => {});
    notifyAdmins({
      type: "contact_message_submitted",
      title: `New message from ${contactMessage.fullName}`,
      body: `${topicName} — ${contactMessage.message.slice(0, 120)}${contactMessage.message.length > 120 ? "…" : ""}`,
      link: `/admin/contact-inquiries/${contactMessage.id}`,
      relatedContactId: contactMessage.id,
    }).catch(() => {});

    res.status(201).json({ sent: true, reference: contactMessage.reference });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
