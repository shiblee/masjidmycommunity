import { Op, fn, col, literal } from "sequelize";
import VisitorSession from "../models/VisitorSession.js";
import VisitorPageView from "../models/VisitorPageView.js";
import VisitorDailyStat from "../models/VisitorDailyStat.js";
import Visitor from "../models/Visitor.js";
import VisitorSettings from "../models/VisitorSettings.js";

/** Closes sessions nobody's sent a heartbeat/page-view/end-beacon for
 * within the configured timeout — this is what makes the end beacon a
 * nice-to-have rather than load-bearing (beacons are missed on a crash or
 * force-quit; this sweep is the real source of truth for "this visit is
 * over"). Runs every 60s from server.js. */
export async function closeIdleSessions() {
  const settings = await VisitorSettings.findByPk(1);
  const cutoff = new Date(Date.now() - settings.sessionTimeoutMinutes * 60 * 1000);
  const stale = await VisitorSession.findAll({ where: { status: { [Op.ne]: "ended" }, lastActivityAt: { [Op.lt]: cutoff } } });
  for (const session of stale) {
    session.status = "ended";
    session.endedAt = session.lastActivityAt;
    session.durationSeconds = Math.round((new Date(session.lastActivityAt) - new Date(session.startedAt)) / 1000);
    await session.save();
  }
}

function dateOnlyUtc(date) {
  return date.toISOString().slice(0, 10);
}

/** Idempotently rebuilds one UTC date's aggregate row from the raw session
 * table — the reconciliation step that corrects any drift from the
 * incremental counters kept elsewhere. Safe to call repeatedly for the same
 * date (upsert). */
export async function rebuildDailyStat(dateStr) {
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
  // Genuine-only, always — this rollup feeds visitorInsightsService.js's
  // returning-visitor trend and is the kind of "important business
  // analytics" the synthetic visitor bot must never contaminate.
  const where = { startedAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd }, trafficType: "genuine" };

  const [totals, byDevice, byType, pageViewCount] = await Promise.all([
    VisitorSession.findAll({
      where,
      attributes: [
        [fn("COUNT", col("id")), "sessions"],
        [fn("COUNT", fn("DISTINCT", col("visitorId"))), "uniqueVisitors"],
        [fn("SUM", col("durationSeconds")), "totalDurationSeconds"],
        [fn("SUM", literal("CASE WHEN pageCount = 1 THEN 1 ELSE 0 END")), "bounceSessions"],
      ],
      raw: true,
    }),
    VisitorSession.findAll({ where, attributes: ["deviceType", [fn("COUNT", col("id")), "count"]], group: ["deviceType"], raw: true }),
    VisitorSession.findAll({ where, attributes: ["visitorType", [fn("COUNT", col("id")), "count"]], group: ["visitorType"], raw: true }),
    VisitorPageView.count({ where: { viewedAt: { [Op.gte]: dayStart, [Op.lte]: dayEnd }, trafficType: "genuine" } }),
  ]);

  const t = totals[0] || {};
  const deviceCount = (type) => Number(byDevice.find((r) => r.deviceType === type)?.count || 0);
  const typeCount = (type) => Number(byType.find((r) => r.visitorType === type)?.count || 0);

  const row = {
    statDate: dateStr,
    sessions: Number(t.sessions || 0),
    uniqueVisitors: Number(t.uniqueVisitors || 0),
    newVisitors: typeCount("new"),
    returningVisitors: typeCount("returning"),
    pageViews: pageViewCount,
    totalDurationSeconds: Number(t.totalDurationSeconds || 0),
    bounceSessions: Number(t.bounceSessions || 0),
    mobileSessions: deviceCount("mobile"),
    tabletSessions: deviceCount("tablet"),
    desktopSessions: deviceCount("desktop"),
  };

  const [stat] = await VisitorDailyStat.findOrCreate({ where: { statDate: dateStr }, defaults: row });
  await stat.update(row);
}

/** Nightly: finalize yesterday's stat, purge old IPs, resync counters. */
export async function runNightlyMaintenance() {
  const yesterday = dateOnlyUtc(new Date(Date.now() - 24 * 60 * 60 * 1000));
  await rebuildDailyStat(yesterday);

  const settings = await VisitorSettings.findByPk(1);
  const ipCutoff = new Date(Date.now() - settings.ipRetentionDays * 24 * 60 * 60 * 1000);
  await VisitorSession.update({ ipAddress: null }, { where: { startedAt: { [Op.lt]: ipCutoff }, ipAddress: { [Op.ne]: null } } });

  const touched = await VisitorSession.findAll({
    where: { startedAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    attributes: ["visitorId"],
    group: ["visitorId"],
    raw: true,
  });
  for (const { visitorId } of touched) {
    const count = await VisitorSession.count({ where: { visitorId } });
    await Visitor.update({ sessionCount: count }, { where: { id: visitorId } });
  }
}

let intervals = [];

/** Started once from server.js. */
export function startVisitorMaintenance() {
  intervals.push(setInterval(() => closeIdleSessions().catch((e) => console.error("closeIdleSessions failed:", e.message)), 60 * 1000));
  intervals.push(
    setInterval(() => rebuildDailyStat(dateOnlyUtc(new Date())).catch((e) => console.error("rebuildDailyStat failed:", e.message)), 60 * 60 * 1000)
  );
  const msUntilNextMidnightUtc = new Date(Date.now()).setUTCHours(24, 5, 0, 0) - Date.now();
  setTimeout(() => {
    runNightlyMaintenance().catch((e) => console.error("runNightlyMaintenance failed:", e.message));
    intervals.push(setInterval(() => runNightlyMaintenance().catch((e) => console.error("runNightlyMaintenance failed:", e.message)), 24 * 60 * 60 * 1000));
  }, msUntilNextMidnightUtc);
}
