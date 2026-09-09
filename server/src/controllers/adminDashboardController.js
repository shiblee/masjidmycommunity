import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";
import Campaign from "../models/Campaign.js";
import Donation from "../models/Donation.js";

// Same "counted publicly" definitions the public community-stats endpoint
// and homepage footer already use (publicCommunityController.js's
// getCommunityStats), so the admin dashboard's headline numbers agree with
// what a visitor actually sees rather than a separately-invented definition.
const PUBLIC_CAMPAIGN_STATUSES = ["active", "paused", "goal_reached", "completed"];

// Raw rows (just enough fields to bucket into a weekly trend client-side,
// mirroring the one KPI card — Total Registered Users — that was already
// real) rather than a single number, so every dashboard card can show a
// genuine trend line instead of a flat "current total" with no history.
export const getStats = async (req, res) => {
  try {
    const [verifiedMasjids, totalMasjidsCount, activeCampaigns, donations] = await Promise.all([
      Masjid.findAll({ where: { status: "approved", moderationStatus: "active" }, attributes: ["createdAt"] }),
      Masjid.count({ where: { status: { [Op.ne]: "deleted" } } }),
      Campaign.findAll({ where: { status: { [Op.in]: PUBLIC_CAMPAIGN_STATUSES }, moderationStatus: "active" }, attributes: ["createdAt"] }),
      Donation.findAll({ where: { status: "recorded" }, attributes: ["id", "createdAt", "amount", "userId", "donorEmail"] }),
    ]);

    res.json({
      totalMasjidsCount,
      verifiedMasjids: verifiedMasjids.map((m) => ({ createdAt: m.createdAt })),
      activeCampaigns: activeCampaigns.map((c) => ({ createdAt: c.createdAt })),
      donations: donations.map((d) => ({
        createdAt: d.createdAt,
        amount: Number(d.amount),
        // Distinct-donor identity for the Total Donors trend — a signed-in
        // claim always has userId; an admin-recorded donation may only have
        // a free-text donorEmail (or neither, for a walk-in cash gift with
        // no identity captured at all — falls back to its own row, so it
        // still counts as one donor rather than being silently dropped).
        donorKey: d.userId ? `u${d.userId}` : d.donorEmail ? `e${d.donorEmail.toLowerCase()}` : `d${d.id}`,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
