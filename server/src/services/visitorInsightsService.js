import { Op, fn, col } from "sequelize";
import VisitorSession from "../models/VisitorSession.js";
import VisitorDailyStat from "../models/VisitorDailyStat.js";

// Every insight here is a real aggregation over stored data, or omitted
// entirely (never a fabricated/generic statement) — each function returns
// null when there isn't enough data to say something meaningful, and the
// caller filters those out.

async function trafficTrend(from, to) {
  const rangeMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - rangeMs);
  const prevTo = new Date(from.getTime());

  const [current, previous] = await Promise.all([
    VisitorSession.count({ where: { startedAt: { [Op.gte]: from, [Op.lte]: to } } }),
    VisitorSession.count({ where: { startedAt: { [Op.gte]: prevFrom, [Op.lte]: prevTo } } }),
  ]);
  if (previous < 20) return null;

  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  return {
    key: "traffic_trend",
    text: `Traffic ${pct > 0 ? "increased" : "decreased"} ${Math.abs(pct)}% compared with the previous period.`,
    value: pct,
    direction: pct > 0 ? "up" : "down",
  };
}

async function largestDeviceSegment(from, to) {
  const rows = await VisitorSession.findAll({
    where: { startedAt: { [Op.gte]: from, [Op.lte]: to }, deviceType: { [Op.ne]: null } },
    attributes: ["deviceType", [fn("COUNT", col("id")), "count"]],
    group: ["deviceType"],
    raw: true,
  });
  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
  if (total < 10) return null;

  const sorted = rows.map((r) => ({ type: r.deviceType, count: Number(r.count) })).sort((a, b) => b.count - a.count);
  const top = sorted[0];
  const second = sorted[1];
  const topShare = Math.round((top.count / total) * 100);
  if (second && top.count - second.count < total * 0.05) return null;

  return {
    key: "largest_device_segment",
    text: `${top.type[0].toUpperCase()}${top.type.slice(1)} visitors are currently the largest visitor segment (${topShare}%).`,
    value: topShare,
    direction: "neutral",
  };
}

async function topExitPage(from, to) {
  const rows = await VisitorSession.findAll({
    where: { startedAt: { [Op.gte]: from, [Op.lte]: to }, exitPath: { [Op.ne]: null } },
    attributes: ["exitPath", [fn("COUNT", col("id")), "count"]],
    group: ["exitPath"],
    order: [[fn("COUNT", col("id")), "DESC"]],
    limit: 1,
    raw: true,
  });
  if (!rows.length) return null;
  const total = await VisitorSession.count({ where: { startedAt: { [Op.gte]: from, [Op.lte]: to } } });
  const share = Math.round((Number(rows[0].count) / total) * 100);
  if (share < 10) return null;

  return {
    key: "top_exit_page",
    text: `Visitors are leaving most frequently after viewing ${rows[0].exitPath} (${share}% of sessions).`,
    value: share,
    direction: "attention",
  };
}

async function returningTrend() {
  const today = new Date();
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(d.toISOString().slice(0, 10));
  }
  const stats = await VisitorDailyStat.findAll({ where: { statDate: days } });
  const last7 = stats.filter((s) => days.slice(0, 7).includes(s.statDate));
  const prior7 = stats.filter((s) => days.slice(7, 14).includes(s.statDate));
  if (last7.length < 4 || prior7.length < 4) return null;

  const shareOf = (rows) => {
    const totalSessions = rows.reduce((sum, r) => sum + r.sessions, 0);
    const returning = rows.reduce((sum, r) => sum + r.returningVisitors, 0);
    return totalSessions > 0 ? returning / totalSessions : 0;
  };
  const recentShare = shareOf(last7);
  const priorShare = shareOf(prior7);
  if (priorShare === 0) return null;

  const pct = Math.round(((recentShare - priorShare) / priorShare) * 100);
  if (Math.abs(pct) < 5) return null;

  return {
    key: "returning_trend",
    text: `Returning visitors have ${pct > 0 ? "increased" : "decreased"} over the last 7 days.`,
    value: pct,
    direction: pct > 0 ? "up" : "down",
  };
}

async function topReferrer(from, to) {
  const rows = await VisitorSession.findAll({
    where: { startedAt: { [Op.gte]: from, [Op.lte]: to }, referrerHost: { [Op.ne]: null } },
    attributes: ["referrerHost", [fn("COUNT", col("id")), "count"]],
    group: ["referrerHost"],
    order: [[fn("COUNT", col("id")), "DESC"]],
    limit: 1,
    raw: true,
  });
  if (!rows.length || Number(rows[0].count) < 5) return null;
  return {
    key: "top_referrer",
    text: `${rows[0].referrerHost} is the top external source of traffic, sending ${rows[0].count} visits this period.`,
    value: Number(rows[0].count),
    direction: "neutral",
  };
}

async function peakHour(from, to) {
  const rows = await VisitorSession.findAll({
    where: { startedAt: { [Op.gte]: from, [Op.lte]: to } },
    attributes: [[fn("HOUR", col("startedAt")), "hour"], [fn("COUNT", col("id")), "count"]],
    group: [fn("HOUR", col("startedAt"))],
    order: [[fn("COUNT", col("id")), "DESC"]],
    limit: 1,
    raw: true,
  });
  const total = await VisitorSession.count({ where: { startedAt: { [Op.gte]: from, [Op.lte]: to } } });
  if (!rows.length || total < 20) return null;

  const hour = Number(rows[0].hour);
  const label = `${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 ? "AM" : "PM"}`;
  return {
    key: "peak_hour",
    text: `Traffic peaks around ${label} UTC most days in this period.`,
    value: hour,
    direction: "neutral",
  };
}

export async function getInsights({ from, to }) {
  const results = await Promise.all([
    trafficTrend(from, to),
    largestDeviceSegment(from, to),
    topExitPage(from, to),
    returningTrend(),
    topReferrer(from, to),
    peakHour(from, to),
  ]);
  return results.filter(Boolean);
}
