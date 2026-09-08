import { API_ORIGIN } from "../config.js";

// Shapes a public campaign API record into the fields the campaign-card
// markup (Home.jsx's homepage preview and ActiveCampaigns.jsx's full
// browse page) renders — kept in one place so both stay in sync.
export function toCardShape(c) {
  const goal = c.goalAmount ? Number(c.goalAmount) : null;
  const isFunded = ["goal_reached", "completed"].includes(c.status) || (goal && c.amountRaised >= goal);
  let days = 0;
  if (!isFunded && c.endDate) {
    days = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000));
  } else if (!isFunded) {
    days = 30;
  }
  return {
    id: c.id,
    slug: c.slug,
    name: c.masjid?.name || "",
    loc: [c.masjid?.city, c.masjid?.country].filter(Boolean).join(", "),
    cat: c.category?.name || "Community Welfare",
    title: c.title,
    raised: c.amountRaised || 0,
    goal: goal || c.amountRaised || 1,
    supporters: c.donorCount || 0,
    days: isFunded ? 0 : days,
    badge: isFunded ? "Funded" : "Verified",
    img: c.coverPhotoUrl ? `${API_ORIGIN}${c.coverPhotoUrl}` : "",
  };
}
