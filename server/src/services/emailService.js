import nodemailer from "nodemailer";
import EmailTemplate from "../models/EmailTemplate.js";
import EmailSettings from "../models/EmailSettings.js";
import EmailLog from "../models/EmailLog.js";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

const PLATFORM_NAME = "Masjid My Community";

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function substituteVars(text, vars) {
  if (!text) return text;
  return String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => (vars[key] !== undefined && vars[key] !== null ? vars[key] : match));
}

function paragraphsHtml(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#3d4c44;">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

function layout(bodyHtml, footerText = "") {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F3F8EA;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F8EA;padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2ECD8;">
            <tr>
              <td style="background:#1E3A46;padding:28px 36px;">
                <span style="font-size:20px;font-weight:700;color:#ffffff;">Masjid <span style="color:#A3D65C;">My Community</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:36px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#F3F8EA;padding:22px 36px;color:#6b7d72;font-size:12px;line-height:1.7;">
                ${escapeHtml(footerText).replace(/\n/g, "<br/>")}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Renders a template row + variables into a full HTML email document.
 * Structural elements (greeting, OTP box, CTA, quote card, footer) are always
 * consistent; the admin controls the copy inside each section.
 */
export function renderEmailHtml(template, vars = {}) {
  const variables = { platform_name: PLATFORM_NAME, current_year: String(new Date().getFullYear()), ...vars };

  const greeting = variables.user_name
    ? `<p style="margin:0 0 20px;font-size:15px;color:#3d4c44;">Assalamu Alaikum, <strong>${escapeHtml(variables.user_name)}</strong></p>`
    : "";

  const heading = `<h1 style="margin:0 0 18px;font-size:24px;color:#17262C;">${escapeHtml(substituteVars(template.heading, variables))}</h1>`;

  const message = paragraphsHtml(substituteVars(template.message, variables));

  const otpBox =
    template.key === "otp_verification" && variables.otp_code
      ? `<div style="text-align:center;margin:8px 0 24px;">
          <span style="display:inline-block;font-family:'Courier New',monospace;font-size:34px;letter-spacing:10px;font-weight:700;color:#1E3A46;background:#F3F8EA;padding:18px 26px;border-radius:8px;border:1px dashed #8DC63F;">${escapeHtml(variables.otp_code)}</span>
        </div>`
      : "";

  const cta =
    template.ctaText && template.ctaLink
      ? `<div style="margin:8px 0 28px;">
          <a href="${escapeHtml(substituteVars(template.ctaLink, variables))}" style="display:inline-block;background:#8DC63F;color:#1E3A46;font-weight:700;font-size:14px;padding:14px 26px;border-radius:4px;text-decoration:none;">${escapeHtml(substituteVars(template.ctaText, variables))} &rarr;</a>
        </div>`
      : "";

  const quote =
    template.quoteEnabled && template.quoteTransliteration
      ? `<div style="margin:8px 0 8px;padding:20px 22px;background:#F3F8EA;border-left:3px solid #8DC63F;border-radius:6px;">
          <p style="margin:0 0 6px;font-size:14.5px;font-weight:700;font-style:italic;color:#1E3A46;">&ldquo;${escapeHtml(template.quoteTransliteration)}&rdquo;</p>
          <p style="margin:0 0 6px;font-size:13.5px;color:#3d4c44;">${escapeHtml(template.quoteTranslation || "")}</p>
          <p style="margin:0;font-size:11.5px;color:#8a978f;letter-spacing:.02em;">${escapeHtml(template.quoteSource || "")}</p>
        </div>`
      : "";

  const footerText = substituteVars(template.footerText, variables) || "";
  const bodyHtml = `${greeting}${heading}${message}${otpBox}${cta}${quote}`;

  return layout(bodyHtml, footerText);
}

async function logEmail({ userId, userName, userEmail, notificationType, subject, status, errorMessage }) {
  try {
    await EmailLog.create({ userId, userName, userEmail, notificationType, subject, status, errorMessage });
  } catch {
    // logging must never break the calling flow
  }
}

async function dispatch({ to, subject, html }) {
  if (!isConfigured) {
    console.log(`\n[emailService] DEV MODE — SMTP not configured, email not actually delivered.`);
    console.log(`[emailService] To: ${to}`);
    console.log(`[emailService] Subject: ${subject}`);
    console.log(`[emailService] (HTML body omitted from console — ${html.length} chars)\n`);
    // Treated as "sent" for logging purposes: the notification pipeline completed
    // correctly, it just has no live SMTP transport configured yet in this environment.
    return { sent: true, dev: true };
  }

  const settings = await EmailSettings.findOne();
  const from = settings ? `${settings.senderName} <${settings.senderEmail}>` : `${PLATFORM_NAME} <hello@masjidmycommunity.org>`;
  await transporter.sendMail({ from, to, subject, html, replyTo: settings?.replyTo || undefined });
  return { sent: true, dev: false };
}

/**
 * Central entry point for every transactional email. Respects the master
 * enable/disable switch and each template's active/inactive status, and
 * always records an activity log entry regardless of outcome.
 */
export async function sendNotification(key, { to, variables = {}, userMeta = {} }) {
  const logBase = {
    userId: userMeta.userId || null,
    userName: userMeta.userName || variables.user_name || null,
    userEmail: userMeta.userEmail || to || null,
    notificationType: key,
  };

  if (!to) {
    await logEmail({ ...logBase, status: "skipped", errorMessage: "No recipient email on file." });
    return { sent: false, skipped: true };
  }

  const settings = await EmailSettings.findOne();
  if (settings && settings.enabled === false) {
    await logEmail({ ...logBase, status: "skipped", errorMessage: "Email notifications are disabled in Email Settings." });
    return { sent: false, skipped: true };
  }

  const template = await EmailTemplate.findOne({ where: { key } });
  if (!template || template.status !== "active") {
    await logEmail({ ...logBase, status: "skipped", errorMessage: "Template is inactive or not found." });
    return { sent: false, skipped: true };
  }

  const allVars = { platform_name: PLATFORM_NAME, current_year: String(new Date().getFullYear()), ...variables };
  const subject = substituteVars(template.subject, allVars);
  const html = renderEmailHtml(template, allVars);

  try {
    const result = await dispatch({ to, subject, html });
    await logEmail({
      ...logBase,
      subject,
      status: result.sent ? "sent" : "failed",
      errorMessage: result.dev ? "Dev mode — no SMTP configured, logged to console only." : null,
    });
    return result;
  } catch (error) {
    await logEmail({ ...logBase, subject, status: "failed", errorMessage: error.message });
    return { sent: false, error: error.message };
  }
}

export async function sendWelcomeEmail(user) {
  if (!user.email) return { sent: false, skipped: true };
  return sendNotification("welcome_registration", {
    to: user.email,
    variables: { user_name: user.fullName },
    userMeta: { userId: user.id, userName: user.fullName, userEmail: user.email },
  });
}

export async function sendOtpEmail(user, otp) {
  if (!user.email) return { sent: false, skipped: true };
  return sendNotification("otp_verification", {
    to: user.email,
    variables: { user_name: user.fullName, otp_code: otp },
    userMeta: { userId: user.id, userName: user.fullName, userEmail: user.email },
  });
}

export const emailServiceConfigured = isConfigured;
