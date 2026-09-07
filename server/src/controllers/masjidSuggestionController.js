import fs from "fs";
import Masjid from "../models/Masjid.js";
import MasjidPhoto from "../models/MasjidPhoto.js";
import MasjidContactPerson from "../models/MasjidContactPerson.js";
import MasjidContactDesignation from "../models/MasjidContactDesignation.js";
import MasjidCorrectionRequest from "../models/MasjidCorrectionRequest.js";
import MasjidCorrectionField from "../models/MasjidCorrectionField.js";
import { getEffectivePrayerTimes } from "../services/prayerTimeService.js";

const FIELD_KEYS = new Set(["name", "category", "location", "photos", "contact", "prayer_times", "other"]);
const TEXT_MAX = 1000;

function cleanupFiles(files) {
  (files || []).forEach((f) => fs.unlink(f.path, () => {}));
}

/** Never trust a client-supplied "current" value — snapshot it from live data
 * ourselves so the audit trail stays honest. */
async function currentValueFor(fieldKey, masjid) {
  switch (fieldKey) {
    case "name":
      return { text: masjid.name };
    case "category":
      return { text: masjid.category };
    case "location":
      return { text: masjid.formattedAddress || [masjid.address, masjid.city, masjid.state, masjid.country].filter(Boolean).join(", ") };
    case "contact": {
      const contacts = await MasjidContactPerson.findAll({ where: { masjidId: masjid.id }, attributes: ["designation", "name"] });
      return { contacts: contacts.map((c) => ({ designation: c.designation, name: c.name })) };
    }
    case "photos": {
      const photoCount = await MasjidPhoto.count({ where: { masjidId: masjid.id, mediaType: "photo" } });
      const cover = await MasjidPhoto.findOne({ where: { masjidId: masjid.id, isCover: true } });
      return { coverPhotoUrl: cover?.url || null, photoCount };
    }
    case "prayer_times": {
      const dateStr = new Date().toISOString().slice(0, 10);
      const roster = await getEffectivePrayerTimes(masjid.id, dateStr);
      const set = roster.filter((r) => r.time);
      return { text: set.length ? set.map((r) => `${r.name}: ${r.time}`).join(", ") : "Not set" };
    }
    default:
      return null;
  }
}

function validateSuggestedValue(fieldKey, raw, hasPhotoFiles) {
  if (fieldKey === "name" || fieldKey === "category" || fieldKey === "location" || fieldKey === "prayer_times" || fieldKey === "other") {
    const text = (raw?.text || "").trim();
    if (!text) return { ok: false, message: `Please enter a suggested value for ${fieldKey}.` };
    if (text.length > TEXT_MAX) return { ok: false, message: `Please keep each suggestion to ${TEXT_MAX} characters or fewer.` };
    return { ok: true, value: { text } };
  }
  if (fieldKey === "contact") {
    const designation = (raw?.designation || "").trim();
    const name = (raw?.name || "").trim();
    const mobile = (raw?.mobile || "").trim();
    if (!designation || !name || !mobile) {
      return { ok: false, message: "Please fill in designation, name, and mobile number for the contact suggestion." };
    }
    return { ok: true, value: { designation, name, mobile } };
  }
  if (fieldKey === "photos") {
    if (!hasPhotoFiles) return { ok: false, message: "Please attach at least one photo." };
    const caption = (raw?.caption || "").trim().slice(0, TEXT_MAX);
    return { ok: true, value: { caption } };
  }
  return { ok: false, message: "Unrecognized field." };
}

export const submitCorrection = async (req, res) => {
  const files = req.files || [];
  try {
    const masjid = await Masjid.findOne({ where: { id: req.params.id, status: "approved", moderationStatus: "active" } });
    if (!masjid) {
      cleanupFiles(files);
      return res.status(404).json({ message: "Masjid not found." });
    }

    let fields;
    try {
      fields = JSON.parse(req.body.fields || "[]");
    } catch {
      fields = null;
    }
    if (!Array.isArray(fields) || fields.length === 0) {
      cleanupFiles(files);
      return res.status(400).json({ message: "Please select at least one field to correct." });
    }

    const seenKeys = new Set();
    const prepared = [];
    for (const entry of fields) {
      const fieldKey = entry?.fieldKey;
      if (!FIELD_KEYS.has(fieldKey) || seenKeys.has(fieldKey)) {
        cleanupFiles(files);
        return res.status(400).json({ message: "Please select valid, non-duplicate fields to correct." });
      }
      seenKeys.add(fieldKey);

      if (fieldKey === "contact" && entry.suggestedValue?.designation) {
        const designation = await MasjidContactDesignation.findOne({ where: { name: entry.suggestedValue.designation, isActive: true } });
        if (!designation) {
          cleanupFiles(files);
          return res.status(400).json({ message: "Please choose a valid designation for the contact suggestion." });
        }
      }

      const validation = validateSuggestedValue(fieldKey, entry.suggestedValue, fieldKey === "photos" && files.length > 0);
      if (!validation.ok) {
        cleanupFiles(files);
        return res.status(400).json({ message: validation.message });
      }
      if (fieldKey === "photos") {
        validation.value.photoUrls = files.map((f) => `/uploads/correction-media/${f.filename}`);
      }
      prepared.push({ fieldKey, suggestedValue: validation.value });
    }

    const request = await MasjidCorrectionRequest.create({ masjidId: masjid.id, userId: req.user.id, status: "pending" });
    await MasjidCorrectionField.bulkCreate(
      await Promise.all(
        prepared.map(async (p, i) => ({
          requestId: request.id,
          fieldKey: p.fieldKey,
          currentValue: await currentValueFor(p.fieldKey, masjid),
          suggestedValue: p.suggestedValue,
          status: "pending",
          sortOrder: i,
        }))
      )
    );

    res.status(201).json({ message: "Thanks! Your correction request has been sent for review." });
  } catch (error) {
    cleanupFiles(files);
    res.status(500).json({ message: error.message });
  }
};
