import { sendContactMessageEmail } from "../services/emailService.js";

const TOPIC_LABEL = {
  general: "General Inquiry",
  masjid: "Masjid Registration",
  campaign: "Campaign & Fundraising",
  partnership: "Partnership",
  media: "Media & Press",
  support: "Technical Support",
};

export const submit = async (req, res) => {
  try {
    const { fullName, email, topic, message } = req.body;
    if (!fullName?.trim()) return res.status(400).json({ message: "Your name is required." });
    if (!/^\S+@\S+\.\S+$/.test(email || "")) return res.status(400).json({ message: "Enter a valid email so we can reply." });
    if (!message || message.trim().length < 10) return res.status(400).json({ message: "Please share a little more detail in your message." });

    const result = await sendContactMessageEmail({
      fullName: fullName.trim(),
      email: email.trim(),
      topic: TOPIC_LABEL[topic] || "General Inquiry",
      message: message.trim(),
    });

    if (result.skipped) {
      return res.status(503).json({ message: "We couldn't send your message right now. Please try again shortly or email us directly." });
    }
    res.status(201).json({ sent: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
