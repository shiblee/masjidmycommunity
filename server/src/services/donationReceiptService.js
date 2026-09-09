import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const RECEIPT_ROOT = path.resolve("uploads", "receipts");
fs.mkdirSync(RECEIPT_ROOT, { recursive: true });

const NAVY = "#1E3A46";
const GOLD = "#8DC63F";
const TEXT = "#17262C";
const TEXT_DIM = "#5b6b64";
const PAPER_DIM = "#F3F8EA";
const LINE = "#E2ECD8";

const METHOD_LABELS = { upi: "UPI", bank_transfer: "Bank Transfer", cash: "Cash", cheque: "Cheque", other: "Other" };

export function buildReceiptNumber(donationId) {
  return `MMC-RCPT-${String(donationId).padStart(6, "0")}`;
}

// "Rs." rather than the ₹ glyph — pdfkit's built-in Helvetica only supports
// WinAnsi encoding, which has no Indian Rupee sign, and renders it as a
// garbled superscript-1 instead. "Rs." is standard on printed Indian
// receipts/invoices and renders correctly with zero font-embedding risk.
function money(amount, currency = "INR") {
  const symbol = currency === "INR" ? "Rs. " : `${currency} `;
  return `${symbol}${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function row(doc, x, y, label, value, width) {
  doc.font("Helvetica").fontSize(9.5).fillColor(TEXT_DIM).text(label, x, y, { width: width * 0.42 });
  doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TEXT).text(value, x + width * 0.42, y, { width: width * 0.58 });
}

/**
 * Renders the receipt directly with pdfkit primitives (no headless browser
 * dependency — keeps this reliable on a small EC2 instance). Returns a
 * Buffer; savePdfReceipt() below is what actually persists it to disk.
 */
export function renderReceiptPdf({ receiptNumber, donation, campaign, masjid }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width;
    const marginX = 56;
    const contentWidth = pageWidth - marginX * 2;

    // Header band
    doc.rect(0, 0, pageWidth, 96).fill(NAVY);
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#ffffff").text("Masjid ", marginX, 36, { continued: true });
    doc.fillColor(GOLD).text("My Community");
    doc.font("Helvetica").fontSize(10).fillColor("#C7D9CE").text("Empowering Masjids. Strengthening Communities.", marginX, 64);

    let y = 128;
    doc.font("Helvetica-Bold").fontSize(18).fillColor(TEXT).text("Donation Receipt", marginX, y);
    y += 30;

    // Receipt meta strip
    doc.roundedRect(marginX, y, contentWidth, 60, 6).fill(PAPER_DIM);
    row(doc, marginX + 18, y + 12, "Receipt Number", receiptNumber, contentWidth / 2 - 18);
    row(doc, marginX + 18, y + 34, "Donation ID", `#${donation.id}`, contentWidth / 2 - 18);
    row(doc, marginX + contentWidth / 2, y + 12, "Date & Time", new Date(donation.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }), contentWidth / 2 - 18);
    row(doc, marginX + contentWidth / 2, y + 34, "Payment Status", "Confirmed", contentWidth / 2 - 18);
    y += 84;

    const donorLabel = donation.isAnonymous ? "Anonymous" : donation.donorName || "Anonymous";

    doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT).text("Donor", marginX, y);
    y += 18;
    doc.font("Helvetica").fontSize(11).fillColor(TEXT).text(donorLabel, marginX, y);
    y += 30;

    doc.moveTo(marginX, y).lineTo(marginX + contentWidth, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 20;

    doc.font("Helvetica-Bold").fontSize(11).fillColor(TEXT).text("Campaign & Masjid", marginX, y);
    y += 18;
    row(doc, marginX, y, "Campaign", campaign.title, contentWidth);
    y += 20;
    row(doc, marginX, y, "Masjid", masjid?.name || "—", contentWidth);
    y += 20;
    row(doc, marginX, y, "Category", donation.donationType || campaign.donationType, contentWidth);
    y += 34;

    doc.moveTo(marginX, y).lineTo(marginX + contentWidth, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 24;

    // Amount — the one thing that should read at a glance
    doc.roundedRect(marginX, y, contentWidth, 74, 6).fill(NAVY);
    doc.font("Helvetica").fontSize(10).fillColor("#C7D9CE").text("Donation Amount", marginX + 20, y + 14);
    doc.font("Helvetica-Bold").fontSize(26).fillColor("#ffffff").text(money(donation.amount, donation.currency), marginX + 20, y + 30);
    doc.font("Helvetica").fontSize(10).fillColor("#C7D9CE").text(`via ${METHOD_LABELS[donation.method] || donation.method}`, marginX + contentWidth - 160, y + 30, { width: 140, align: "right" });
    y += 74 + 30;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(TEXT_DIM)
      .text(
        "This receipt confirms a contribution recorded for the campaign above through Masjid My Community. No online payment gateway is connected on this platform yet — contributions are made directly to the masjid's own bank/UPI account and recorded here for transparency and record-keeping. This document is provided for your personal records and is not a tax-deductibility certificate unless separately issued by the receiving masjid.",
        marginX,
        y,
        { width: contentWidth, lineGap: 3 }
      );

    // Footer
    const footerY = doc.page.height - 60;
    doc.moveTo(marginX, footerY).lineTo(marginX + contentWidth, footerY).strokeColor(LINE).lineWidth(1).stroke();
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(TEXT_DIM)
      .text(`Masjid My Community — hello@masjidmycommunity.org — © ${new Date().getFullYear()} Masjid My Community. All rights reserved.`, marginX, footerY + 12, {
        width: contentWidth,
        align: "center",
      });

    doc.end();
  });
}

/**
 * Idempotent — if this donation already has a saved receipt file, reuses it
 * instead of regenerating, so the donor and masjid-owner emails (and any
 * later re-send) always attach byte-identical bytes for the same
 * receiptNumber, never two different renders of "the same" receipt.
 */
export async function getOrCreateReceiptPdf(donation, campaign, masjid) {
  const receiptNumber = donation.receiptNumber || buildReceiptNumber(donation.id);
  const filename = `${receiptNumber}.pdf`;
  const filePath = path.join(RECEIPT_ROOT, filename);
  const publicUrl = `/uploads/receipts/${filename}`;

  if (donation.receiptUrl && fs.existsSync(filePath)) {
    return { receiptNumber, filePath, publicUrl, buffer: fs.readFileSync(filePath) };
  }

  const buffer = await renderReceiptPdf({ receiptNumber, donation, campaign, masjid });
  fs.writeFileSync(filePath, buffer);

  if (donation.receiptNumber !== receiptNumber || donation.receiptUrl !== publicUrl) {
    donation.receiptNumber = receiptNumber;
    donation.receiptUrl = publicUrl;
    await donation.save();
  }

  return { receiptNumber, filePath, publicUrl, buffer };
}
