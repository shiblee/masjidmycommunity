import CommunityActivity from "../models/CommunityActivity.js";

/**
 * Central entry point for turning platform events into Community Wall activities.
 * Auto-published types appear immediately; the admin can still hide/edit/pin/delete
 * afterward from Community Wall Management.
 */
export async function recordActivity({
  type,
  title = null,
  body = null,
  imageUrl = null,
  relatedMasjidId = null,
  relatedUserId = null,
  relatedCampaignId = null,
  metadata = null,
  autoPublish = true,
}) {
  try {
    return await CommunityActivity.create({
      type,
      title,
      body,
      imageUrl,
      relatedMasjidId,
      relatedUserId,
      relatedCampaignId,
      metadata,
      status: autoPublish ? "published" : "pending_review",
      publishedAt: autoPublish ? new Date() : null,
    });
  } catch {
    // Wall activity logging must never break the calling flow.
    return null;
  }
}

export async function recordNewUserActivity() {
  return recordActivity({
    type: "new_user",
    title: "A new member has joined Masjid My Community.",
    body: "Welcome to the community — together in trust, transparency, and impact.",
  });
}

export async function recordMasjidApprovedActivity(masjid, coverPhotoUrl) {
  const location = [masjid.city, masjid.country].filter(Boolean).join(", ");
  return recordActivity({
    type: "masjid_approved",
    title: `Welcome ${masjid.name} to Masjid My Community.`,
    body: masjid.tagline || masjid.about || "A newly verified masjid has joined the platform.",
    imageUrl: coverPhotoUrl,
    relatedMasjidId: masjid.id,
    metadata: { masjidName: masjid.name, location },
  });
}

export async function recordCampaignApprovedActivity(campaign, masjid, coverPhotoUrl) {
  return recordActivity({
    type: "campaign_approved",
    title: `${campaign.title} is now live.`,
    body: campaign.shortDescription || `A new fundraising campaign from ${masjid?.name || "a masjid"} is now accepting support.`,
    imageUrl: coverPhotoUrl,
    relatedMasjidId: campaign.masjidId,
    relatedCampaignId: campaign.id,
    metadata: { campaignTitle: campaign.title, campaignSlug: campaign.slug, masjidName: masjid?.name || null },
  });
}

export async function recordDonationActivity(campaign, donation) {
  const donorLabel = donation.donorName?.trim() || "An anonymous donor";
  return recordActivity({
    type: "donation",
    title: `${donorLabel} supported ${campaign.title}.`,
    body: null,
    relatedMasjidId: campaign.masjidId,
    relatedCampaignId: campaign.id,
    metadata: { amount: Number(donation.amount), currency: donation.currency, campaignTitle: campaign.title, campaignSlug: campaign.slug },
  });
}

const MILESTONE_THRESHOLDS = [25, 50, 75, 100];

/**
 * Fires as raisedPercent crosses a threshold. A single large donation can
 * cross several at once (e.g. 0% -> 60%) — post for the highest one reached,
 * not the first, since that's the milestone donors actually care about.
 */
export async function recordMilestoneActivity(campaign, previousPercent, currentPercent) {
  const crossed = MILESTONE_THRESHOLDS.filter((t) => previousPercent < t && currentPercent >= t).pop();
  if (!crossed) return null;
  return recordActivity({
    type: "milestone",
    title: crossed === 100 ? `${campaign.title} reached its funding goal!` : `${campaign.title} is ${crossed}% funded.`,
    body: null,
    relatedMasjidId: campaign.masjidId,
    relatedCampaignId: campaign.id,
    metadata: { threshold: crossed, campaignTitle: campaign.title, campaignSlug: campaign.slug },
  });
}
