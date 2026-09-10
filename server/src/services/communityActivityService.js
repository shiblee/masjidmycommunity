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
  relatedJobId = null,
  metadata = null,
  autoPublish = true,
  // Lets a backfill (see jobPostedActivityBackfill.js) preserve the real
  // original date instead of every activity looking freshly posted — every
  // normal caller omits this and gets "now", same as before.
  occurredAt = null,
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
      relatedJobId,
      metadata,
      status: autoPublish ? "published" : "pending_review",
      publishedAt: autoPublish ? occurredAt || new Date() : null,
      ...(occurredAt ? { createdAt: occurredAt } : {}),
    });
  } catch {
    // Wall activity logging must never break the calling flow.
    return null;
  }
}

export async function recordNewUserActivity(user) {
  return recordActivity({
    type: "new_user",
    title: `${user.fullName} joined Masjid My Community.`,
    body: "Welcome to the community — together in trust, transparency, and impact.",
    relatedUserId: user.id,
    // A snapshot at join time — the wall/admin views still join live to the
    // User table for anything that can change (status, contact details), so
    // this is only ever used as a display fallback if that user is deleted.
    metadata: { fullName: user.fullName, username: user.username },
  });
}

// A single alphanumeric token (the `#\w+` hashtag regex PostBodyText.jsx
// scans for can't contain spaces/hyphens) built from a masjid's own name —
// e.g. "Masjid-E-Azam Ahle Sunnat" -> "#MasjidEAzamAhleSunnat". Capped so an
// unusually long name doesn't produce an absurd single token.
function hashtagFromName(name) {
  const compact = (name || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 40);
  return compact ? `#${compact}` : null;
}

// Centralizes the welcome-post copy so every trigger path (bot import,
// admin approval, the existing-masjid backfill) produces identical, on-brand
// text — see masjidRegisteredActivityBackfill.js for the callers.
export function composeMasjidWelcomeBody(masjid) {
  // Same @[masjid:<id>:<name>] token the composer's own @ autocomplete
  // writes — PostBodyText.jsx already renders it as a clickable link to
  // this exact masjid's page, so every "masjid name" mention in the body
  // is clickable with no new rendering logic needed.
  const mention = `@[masjid:${masjid.id}:${masjid.name}]`;
  const hashtags = [
    "#Masjid",
    "#IslamicCommunity",
    "#MuslimCommunity",
    "#Community",
    "#MasjidNetwork",
    "#masjidmycommunity",
    hashtagFromName(masjid.name),
  ]
    .filter(Boolean)
    .join(" ");
  return (
    `🕌 Welcome to ${mention}!\n\n` +
    `We are pleased to have ${mention} registered on our community platform. This Masjid is now part of our growing community network, helping people discover and connect with their local Masjid and community activities.\n\n` +
    hashtags
  );
}

export async function recordMasjidApprovedActivity(masjid, coverPhotoUrl) {
  const location = [masjid.city, masjid.country].filter(Boolean).join(", ");
  return recordActivity({
    type: "masjid_approved",
    title: `Welcome ${masjid.name} to Masjid My Community.`,
    body: composeMasjidWelcomeBody(masjid),
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

// Unlike recordCampaignApprovedActivity (fired on admin approval), a Job has
// no approval lifecycle — createJob calls this immediately after Job.create,
// the same point logJobHistory's "posted" entry already fires from.
export async function recordJobPostedActivity(job, poster, { occurredAt } = {}) {
  return recordActivity({
    type: "job_posted",
    title: `New opening: ${job.title}`,
    body: job.description?.slice(0, 280) || `A new job posting from ${poster?.fullName || "a community member"}.`,
    relatedUserId: job.userId,
    relatedJobId: job.id,
    metadata: { jobTitle: job.title, jobSlug: job.slug, location: job.location, jobType: job.jobType },
    occurredAt,
  });
}

export async function recordDonationActivity(campaign, donation) {
  const donorLabel = donation.isAnonymous ? "An anonymous donor" : donation.donorName?.trim() || "An anonymous donor";
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
