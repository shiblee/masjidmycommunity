import fs from "fs";
import path from "path";
import Campaign from "../models/Campaign.js";
import CampaignPhoto from "../models/CampaignPhoto.js";
import CampaignBudgetItem from "../models/CampaignBudgetItem.js";
import CampaignDocument from "../models/CampaignDocument.js";
import CampaignHistory from "../models/CampaignHistory.js";
import Donation from "../models/Donation.js";
import Masjid from "../models/Masjid.js";
import { mediaTypeOf, IMAGE_MAX_BYTES } from "../middleware/upload.js";

const EDITABLE_STATUSES = new Set(["draft", "changes_requested"]);
// Editing these on a campaign that's already public pulls it back for re-review
// instead of silently changing what donors see — same "material change" rule
// used for a masjid's verified contact details.
const CORE_FIELDS = ["title", "shortDescription", "description", "goalAmount", "endDate", "categoryId", "donationType", "zakatEligibilityNote"];
const RE_REVIEW_STATUSES = new Set(["approved", "active", "paused", "goal_reached"]);

async function logHistory(campaignId, action, note, actorName) {
  await CampaignHistory.create({ campaignId, action, actorType: "user", actorName: actorName || "Owner", note: note || null });
}

async function findOwnedCampaign(req, res) {
  const campaign = await Campaign.findOne({ where: { id: req.params.id, createdBy: req.user.id } });
  if (!campaign) {
    res.status(404).json({ message: "Campaign not found." });
    return null;
  }
  return campaign;
}

export async function amountRaised(campaignId) {
  const total = await Donation.sum("amount", { where: { campaignId, status: "recorded" } });
  return Number(total) || 0;
}

export async function serializeCampaign(campaign) {
  const [photos, budgetItems, documents, donationCount, raised, masjid] = await Promise.all([
    CampaignPhoto.findAll({ where: { campaignId: campaign.id }, order: [["sortOrder", "ASC"]] }),
    CampaignBudgetItem.findAll({ where: { campaignId: campaign.id }, order: [["sortOrder", "ASC"]] }),
    CampaignDocument.findAll({ where: { campaignId: campaign.id }, attributes: ["id", "documentType", "fileName", "createdAt"] }),
    Donation.count({ where: { campaignId: campaign.id, status: "recorded" } }),
    amountRaised(campaign.id),
    Masjid.findByPk(campaign.masjidId, { attributes: ["id", "name", "city", "country"] }),
  ]);
  const goal = campaign.goalAmount ? Number(campaign.goalAmount) : null;
  return {
    ...campaign.toJSON(),
    photos,
    budgetItems,
    documents,
    amountRaised: raised,
    donorCount: donationCount,
    progressPercent: goal ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : null,
    masjid,
  };
}

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "campaign";
}

async function generateUniqueSlug(title) {
  const base = slugify(title);
  let slug = base;
  let n = 1;
  while (await Campaign.findOne({ where: { slug } })) {
    slug = `${base}-${++n}`;
  }
  return slug;
}

export const listMine = async (req, res) => {
  try {
    const where = { createdBy: req.user.id };
    if (req.query.masjidId) where.masjidId = req.query.masjidId;
    const campaigns = await Campaign.findAll({ where, order: [["createdAt", "DESC"]] });
    const withExtras = await Promise.all(
      campaigns.map(async (c) => {
        const [cover, raised] = await Promise.all([
          CampaignPhoto.findOne({ where: { campaignId: c.id, isCover: true } }),
          amountRaised(c.id),
        ]);
        const goal = c.goalAmount ? Number(c.goalAmount) : null;
        return { ...c.toJSON(), coverPhotoUrl: cover?.url || null, amountRaised: raised, progressPercent: goal ? Math.min(100, Math.round((raised / goal) * 1000) / 10) : null };
      })
    );
    res.json({ campaigns: withExtras });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    res.json({ campaign: await serializeCampaign(campaign) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDraft = async (req, res) => {
  try {
    const { masjidId, title } = req.body;
    if (!masjidId) return res.status(400).json({ message: "Select a masjid for this campaign." });
    if (!title?.trim()) return res.status(400).json({ message: "Campaign title is required." });

    const masjid = await Masjid.findOne({ where: { id: masjidId, userId: req.user.id } });
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });
    if (masjid.status !== "approved") {
      return res.status(400).json({ message: "Only an approved masjid can raise a campaign. Please complete your masjid's verification first." });
    }

    const slug = await generateUniqueSlug(title);
    const campaign = await Campaign.create({ masjidId, createdBy: req.user.id, title: title.trim(), slug, status: "draft" });
    await logHistory(campaign.id, "draft_created", null, null);
    res.status(201).json({ campaign: await serializeCampaign(campaign) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;

    if (!EDITABLE_STATUSES.has(campaign.status) && !RE_REVIEW_STATUSES.has(campaign.status)) {
      return res.status(400).json({ message: "This campaign can't be edited while it's under review." });
    }

    // The wizard autosaves the whole form on every step, including fields the
    // user hasn't reached yet — treat an empty string as "not set" rather
    // than a deliberate clear, so an untouched goal/date/category doesn't
    // trip validation before the user ever sees that step.
    for (const field of ["goalAmount", "endDate", "categoryId", "zakatEligibilityNote"]) {
      if (req.body[field] === "") req.body[field] = null;
    }

    if (req.body.title !== undefined && !req.body.title?.trim()) {
      return res.status(400).json({ message: "Campaign title can't be empty." });
    }
    if (req.body.donationType === "zakat" && !(req.body.zakatEligibilityNote ?? campaign.zakatEligibilityNote)?.trim()) {
      return res.status(400).json({ message: "Explain how this campaign qualifies for Zakat before continuing." });
    }
    if (req.body.goalAmount !== undefined && req.body.goalAmount !== null && Number(req.body.goalAmount) <= 0) {
      return res.status(400).json({ message: "Funding goal must be greater than zero." });
    }

    let coreChanged = false;
    for (const field of CORE_FIELDS) {
      if (req.body[field] === undefined) continue;
      const next = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
      const current = campaign[field];
      if (String(current ?? "") !== String(next ?? "")) coreChanged = true;
      campaign[field] = next;
    }
    if (req.body.startDate !== undefined) campaign.startDate = req.body.startDate;

    if (RE_REVIEW_STATUSES.has(campaign.status) && coreChanged) {
      campaign.status = "under_review";
      campaign.adminFeedback = null;
      campaign.submittedAt = new Date();
      await logHistory(campaign.id, "resubmitted_for_material_change", null, null);
    }

    await campaign.save();
    res.json({ campaign: await serializeCampaign(campaign) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const upsertBudgetItems = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    if (!EDITABLE_STATUSES.has(campaign.status)) {
      return res.status(400).json({ message: "This campaign can't be edited while it's under review." });
    }
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    for (const item of items) {
      if (!item.label?.trim() || !(Number(item.amount) > 0)) {
        return res.status(400).json({ message: "Each budget line needs a label and an amount greater than zero." });
      }
    }

    await CampaignBudgetItem.destroy({ where: { campaignId: campaign.id } });
    const created = await Promise.all(
      items.map((item, i) => CampaignBudgetItem.create({ campaignId: campaign.id, label: item.label.trim(), amount: item.amount, sortOrder: i }))
    );
    res.json({ budgetItems: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadPhotos = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    if (!req.files?.length) return res.status(400).json({ message: "No photos or videos were uploaded." });

    const oversizedImage = req.files.find((file) => mediaTypeOf(file.mimetype) === "photo" && file.size > IMAGE_MAX_BYTES);
    if (oversizedImage) {
      req.files.forEach((file) => fs.unlink(file.path, () => {}));
      return res.status(400).json({ message: `Photos must be under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB. "${oversizedImage.originalname}" is too large.` });
    }

    const existingCount = await CampaignPhoto.count({ where: { campaignId: campaign.id } });
    let coverAssigned = (await CampaignPhoto.count({ where: { campaignId: campaign.id, isCover: true } })) > 0;

    const created = await Promise.all(
      req.files.map((file, i) => {
        const mediaType = mediaTypeOf(file.mimetype);
        const isCover = !coverAssigned && mediaType === "photo";
        if (isCover) coverAssigned = true;
        return CampaignPhoto.create({
          campaignId: campaign.id,
          url: `/uploads/campaign-photos/${file.filename}`,
          mediaType,
          isCover,
          sortOrder: existingCount + i,
        });
      })
    );
    res.status(201).json({ photos: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePhoto = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    const photo = await CampaignPhoto.findOne({ where: { id: req.params.photoId, campaignId: campaign.id } });
    if (!photo) return res.status(404).json({ message: "Photo not found." });

    if (req.body.caption !== undefined) photo.caption = req.body.caption;
    if (req.body.sortOrder !== undefined) photo.sortOrder = req.body.sortOrder;
    if (req.body.isCover) {
      if (photo.mediaType === "video") return res.status(400).json({ message: "A video can't be set as the cover — it shows as a still image across the site." });
      await CampaignPhoto.update({ isCover: false }, { where: { campaignId: campaign.id } });
      photo.isCover = true;
    }
    await photo.save();
    res.json({ photo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deletePhoto = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    const photo = await CampaignPhoto.findOne({ where: { id: req.params.photoId, campaignId: campaign.id } });
    if (!photo) return res.status(404).json({ message: "Photo not found." });
    await photo.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadDocuments = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    if (!req.files?.length) return res.status(400).json({ message: "No documents were uploaded." });

    const created = await Promise.all(
      req.files.map((file) =>
        CampaignDocument.create({
          campaignId: campaign.id,
          documentType: req.body.documentType || "other",
          fileName: file.originalname,
          storedPath: file.path,
          uploadedBy: req.user.id,
        })
      )
    );
    res.status(201).json({ documents: created.map((d) => ({ id: d.id, documentType: d.documentType, fileName: d.fileName, createdAt: d.createdAt })) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    const doc = await CampaignDocument.findOne({ where: { id: req.params.docId, campaignId: campaign.id } });
    if (!doc) return res.status(404).json({ message: "Document not found." });
    fs.unlink(doc.storedPath, () => {});
    await doc.destroy();
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const downloadDocument = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    const doc = await CampaignDocument.findOne({ where: { id: req.params.docId, campaignId: campaign.id } });
    if (!doc || !fs.existsSync(doc.storedPath)) return res.status(404).json({ message: "Document not found." });
    res.download(path.resolve(doc.storedPath), doc.fileName);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const submit = async (req, res) => {
  try {
    const campaign = await findOwnedCampaign(req, res);
    if (!campaign) return;
    if (!EDITABLE_STATUSES.has(campaign.status)) {
      return res.status(400).json({ message: "This campaign has already been submitted." });
    }

    const required = ["title", "shortDescription", "description"];
    const missing = required.filter((f) => !campaign[f]?.toString().trim());
    if (missing.length) return res.status(400).json({ message: `Please complete: ${missing.join(", ")}.` });
    if (!campaign.goalAmount || Number(campaign.goalAmount) <= 0) return res.status(400).json({ message: "Set a funding goal before submitting." });
    if (campaign.donationType === "zakat" && !campaign.zakatEligibilityNote?.trim()) {
      return res.status(400).json({ message: "Explain how this campaign qualifies for Zakat before submitting." });
    }

    const photoCount = await CampaignPhoto.count({ where: { campaignId: campaign.id } });
    if (photoCount === 0) return res.status(400).json({ message: "Upload at least one photograph before submitting." });

    const budgetTotal = (await CampaignBudgetItem.sum("amount", { where: { campaignId: campaign.id } })) || 0;
    if (budgetTotal <= 0) return res.status(400).json({ message: "Add at least one budget line item before submitting." });

    const wasChangesRequested = campaign.status === "changes_requested";
    campaign.status = "under_review";
    campaign.adminFeedback = null;
    campaign.submittedAt = new Date();
    await campaign.save();
    await logHistory(campaign.id, wasChangesRequested ? "resubmitted" : "submitted", null, null);

    res.json({ campaign: await serializeCampaign(campaign) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
