import { Op } from "sequelize";
import EmailTemplate from "../models/EmailTemplate.js";
import EmailLog from "../models/EmailLog.js";
import EmailSettings from "../models/EmailSettings.js";
import { renderEmailHtml, sendNotification, emailServiceConfigured } from "../services/emailService.js";

const SAMPLE_VARIABLES = {
  otp_verification: { user_name: "Aisha Karim", otp_code: "482913" },
  welcome_registration: { user_name: "Aisha Karim" },
  account_status_changed: { user_name: "Aisha Karim", account_status: "Active", status_detail: "Your account is active again and you now have full access to your dashboard, masjids, and campaigns." },
  masjid_submitted_admin: { masjid_name: "Al-Noor Masjid", masjid_id: "42", category: "Jami Masjid", submitted_by: "Aisha Karim", submission_date: "26 Aug 2026, 12:00 PM" },
  masjid_submitted_user: { user_name: "Aisha Karim", masjid_name: "Al-Noor Masjid", masjid_id: "42", submission_date: "26 Aug 2026, 12:00 PM", status: "Under Review" },
  masjid_changes_requested_user: {
    user_name: "Aisha Karim",
    masjid_name: "Al-Noor Masjid",
    masjid_id: "42",
    changes_requested: "Please upload a clearer photo of the prayer hall and confirm the donation account details.",
    request_date: "27 Aug 2026, 3:00 PM",
  },
  campaign_submitted_admin: {
    campaign_title: "Rebuild Our Flood-Damaged Prayer Hall",
    campaign_id: "17",
    masjid_name: "Al-Noor Masjid",
    submitted_by: "Aisha Karim",
    category: "Renovation",
    donation_type: "General Sadaqah",
    goal_amount: "₹5,00,000",
    submission_date: "27 Aug 2026, 3:00 PM",
    status: "Under Review",
    description: "Our prayer hall was damaged in recent flooding and needs urgent repairs to reopen safely for the community.",
  },
  campaign_submitted_user: {
    user_name: "Aisha Karim",
    campaign_title: "Rebuild Our Flood-Damaged Prayer Hall",
    campaign_id: "17",
    masjid_name: "Al-Noor Masjid",
    submission_date: "27 Aug 2026, 3:00 PM",
    status: "Under Review",
  },
  campaign_changes_requested_user: {
    user_name: "Aisha Karim",
    campaign_title: "Rebuild Our Flood-Damaged Prayer Hall",
    campaign_id: "17",
    masjid_name: "Al-Noor Masjid",
    changes_requested: "Please add a detailed budget breakdown and upload the masjid's trust registration certificate.",
    request_date: "27 Aug 2026, 3:00 PM",
  },
  campaign_change_response_admin: {
    campaign_title: "Rebuild Our Flood-Damaged Prayer Hall",
    campaign_id: "17",
    masjid_name: "Al-Noor Masjid",
    submitted_by: "Aisha Karim",
    response_date: "27 Aug 2026, 3:00 PM",
    status: "Under Review",
    original_request: "Please add a detailed budget breakdown and upload the masjid's trust registration certificate.",
  },
  campaign_approved_user: {
    user_name: "Aisha Karim",
    campaign_title: "Rebuild Our Flood-Damaged Prayer Hall",
    campaign_id: "17",
    masjid_name: "Al-Noor Masjid",
    approval_date: "27 Aug 2026, 3:00 PM",
  },
  campaign_rejected_user: {
    user_name: "Aisha Karim",
    campaign_title: "Rebuild Our Flood-Damaged Prayer Hall",
    campaign_id: "17",
    masjid_name: "Al-Noor Masjid",
    rejection_reason: "The campaign description contains claims that could not be verified against the supporting documents provided.",
    rejection_date: "27 Aug 2026, 3:00 PM",
  },
  campaign_status_updated_user: {
    user_name: "Aisha Karim",
    campaign_title: "Rebuild Our Flood-Damaged Prayer Hall",
    campaign_id: "17",
    masjid_name: "Al-Noor Masjid",
    new_status: "Paused",
    status_date: "27 Aug 2026, 3:00 PM",
  },
  concern_submitted_admin: {
    concern_id: "CONCERN-7F3K2Q",
    user_name: "Aisha Karim",
    user_contact: "aisha@example.com",
    concern_type: "Payment Related",
    subject: "Donation not reflected in campaign total",
    related_reference: "Rebuild Our Flood-Damaged Prayer Hall",
    submission_date: "27 Aug 2026, 3:00 PM",
    status: "Open",
    description: "I donated ₹5,000 to this campaign three days ago but it isn't showing up in the campaign's raised amount yet.",
  },
  concern_submitted_user: {
    user_name: "Aisha Karim",
    concern_id: "CONCERN-7F3K2Q",
    concern_type: "Payment Related",
    subject: "Donation not reflected in campaign total",
    submission_date: "27 Aug 2026, 3:00 PM",
    status: "Open",
  },
  concern_resolved_user: {
    user_name: "Aisha Karim",
    concern_id: "CONCERN-7F3K2Q",
    concern_type: "Payment Related",
    subject: "Donation not reflected in campaign total",
    submission_date: "27 Aug 2026, 3:00 PM",
    resolution_date: "28 Aug 2026, 11:00 AM",
    admin_remarks: "We found the donation was recorded under a duplicate entry and have corrected the campaign total. Thank you for flagging this.",
  },
  contact_message_admin: {
    user_name: "Aisha Karim",
    user_contact: "aisha@example.com",
    topic: "Partnership",
    submission_date: "27 Aug 2026, 3:00 PM",
    message_body: "Hi, I represent a nonprofit that supports masjid renovations across East Africa and would love to explore a partnership with your platform.",
  },
};

export const listTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.findAll({ order: [["name", "ASC"]] });
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({ where: { key: req.params.key } });
    if (!template) return res.status(404).json({ message: "Template not found." });
    res.json({ template });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const EDITABLE_FIELDS = [
  "subject",
  "heading",
  "message",
  "ctaText",
  "ctaLink",
  "footerText",
  "quoteEnabled",
  "quoteTransliteration",
  "quoteTranslation",
  "quoteSource",
  "status",
];

export const updateTemplate = async (req, res) => {
  try {
    const template = await EmailTemplate.findOne({ where: { key: req.params.key } });
    if (!template) return res.status(404).json({ message: "Template not found." });

    if (!req.body.subject?.trim()) return res.status(400).json({ message: "Subject is required." });
    if (!req.body.heading?.trim()) return res.status(400).json({ message: "Heading is required." });
    if (!req.body.message?.trim()) return res.status(400).json({ message: "Message is required." });

    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) template[field] = req.body[field];
    }
    await template.save();
    res.json({ template });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const previewTemplate = async (req, res) => {
  try {
    const saved = await EmailTemplate.findOne({ where: { key: req.params.key } });
    if (!saved) return res.status(404).json({ message: "Template not found." });

    // Preview the DRAFT (unsaved) content the admin is currently editing, falling back to saved values.
    const draft = saved.get({ plain: true });
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) draft[field] = req.body[field];
    }

    const variables = SAMPLE_VARIABLES[req.params.key] || {};
    const html = renderEmailHtml(draft, variables);
    res.json({ html, subject: draft.subject });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendTestEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to?.trim()) return res.status(400).json({ message: "Enter an email address to send the test to." });

    const template = await EmailTemplate.findOne({ where: { key: req.params.key } });
    if (!template) return res.status(404).json({ message: "Template not found." });

    const variables = SAMPLE_VARIABLES[req.params.key] || {};
    const result = await sendNotification(req.params.key, {
      to: to.trim(),
      variables,
      userMeta: { userName: `${req.user.email || "Admin"} (test send)`, userEmail: to.trim() },
    });

    if (result.skipped) {
      return res.status(400).json({ message: "This template is inactive, or email notifications are disabled in Email Settings." });
    }
    res.json({ message: result.dev ? "Test email logged to server console (dev mode — no SMTP configured)." : "Test email sent.", dev: !!result.dev });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listLogs = async (req, res) => {
  try {
    const { type, status, q } = req.query;
    const where = {};
    if (type && type !== "all") where.notificationType = type;
    if (status && status !== "all") where.status = status;
    if (q?.trim()) {
      const term = `%${q.trim()}%`;
      where[Op.or] = [{ userName: { [Op.like]: term } }, { userEmail: { [Op.like]: term } }];
    }

    const logs = await EmailLog.findAll({ where, order: [["createdAt", "DESC"]], limit: 200 });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const [total, otpCount, welcomeCount, sent, failed, activeTemplates] = await Promise.all([
      EmailLog.count(),
      EmailLog.count({ where: { notificationType: "otp_verification" } }),
      EmailLog.count({ where: { notificationType: "welcome_registration" } }),
      EmailLog.count({ where: { status: "sent" } }),
      EmailLog.count({ where: { status: "failed" } }),
      EmailTemplate.count({ where: { status: "active" } }),
    ]);
    res.json({
      totalEmails: total,
      otpEmails: otpCount,
      registrationEmails: welcomeCount,
      successfulDeliveries: sent,
      failedEmails: failed,
      activeTemplates,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSettings = async (req, res) => {
  try {
    const settings = await EmailSettings.findOne();
    res.json({ settings, smtpConfigured: emailServiceConfigured });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await EmailSettings.findOne();
    if (!settings) return res.status(404).json({ message: "Email settings not found." });

    const { senderName, senderEmail, replyTo, adminNotificationEmail, enabled } = req.body;
    if (senderName !== undefined) settings.senderName = senderName;
    if (senderEmail !== undefined) settings.senderEmail = senderEmail;
    if (replyTo !== undefined) settings.replyTo = replyTo;
    if (adminNotificationEmail !== undefined) settings.adminNotificationEmail = adminNotificationEmail;
    if (enabled !== undefined) settings.enabled = enabled;
    await settings.save();
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
