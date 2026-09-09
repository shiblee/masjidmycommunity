import User from "../models/User.js";
import Masjid from "../models/Masjid.js";
import { getOrCreateReceiptPdf } from "./donationReceiptService.js";
import { sendDonationThankYouEmail, sendDonationMasjidOwnerEmail, sendDonationAdminEmail } from "./emailService.js";

// Single call site for the whole "donation successfully recorded" workflow —
// called from every place a Donation actually reaches status "recorded"
// (the public claim's demo-mode auto-record, an admin confirming a pending
// claim, and an admin's own manual "Record a Donation"). Generates/saves the
// PDF receipt once, then fires all three emails off that one receipt so the
// donor and masjid-owner copies are guaranteed to reference the exact same
// receiptNumber and bytes. Never throws — a notification failure must not
// unwind the donation that already succeeded; each send already logs its
// own outcome to EmailLog.
export async function sendDonationConfirmationEmails(donation, campaign) {
  try {
    const masjid = await Masjid.findByPk(campaign.masjidId);
    const receipt = await getOrCreateReceiptPdf(donation, campaign, masjid);

    const ownerUser = masjid?.userId ? await User.findByPk(masjid.userId) : null;

    await Promise.all([
      sendDonationThankYouEmail(donation, campaign, masjid, receipt),
      sendDonationMasjidOwnerEmail(donation, campaign, masjid, ownerUser, receipt),
      sendDonationAdminEmail(donation, campaign, masjid),
    ]);
  } catch {
    // Best-effort — the donation itself is already committed by the time
    // this runs; a receipt/email failure here must never surface as a
    // failure of the donation-recording request itself.
  }
}
