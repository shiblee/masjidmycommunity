import { sequelize } from "../config/db.js";
import HealthCheckRun from "../models/HealthCheckRun.js";

// Real, safe, read-only endpoints only -- no writes, no load generation,
// just what a single real page view would already trigger. Each is checked
// as an actual HTTP request through this server's own public URL, so the
// result reflects the real routing/controller/DB path, not an in-process
// shortcut.
const API_CHECKS = [
  { name: "Masjids listing", path: "/api/masjids/public" },
  { name: "Campaigns listing", path: "/api/campaigns/public" },
  { name: "Jobs listing", path: "/api/jobs/public" },
  { name: "Community stats", path: "/api/community/stats" },
  { name: "Languages", path: "/api/i18n/languages" },
];

// A check counts as "slow" past this threshold -- flagged as degraded
// rather than failed, since it still succeeded. A single, named constant
// rather than a magic number scattered across the file.
const SLOW_THRESHOLD_MS = 1500;
const CHECK_TIMEOUT_MS = 8000;

async function checkDatabase() {
  const start = Date.now();
  try {
    await sequelize.query("SELECT 1");
    const durationMs = Date.now() - start;
    return { name: "Database connectivity", category: "database", status: durationMs > SLOW_THRESHOLD_MS ? "degraded" : "pass", durationMs };
  } catch (error) {
    return { name: "Database connectivity", category: "database", status: "fail", durationMs: Date.now() - start, detail: error.message };
  }
}

async function checkApi(baseUrl, { name, path }) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
    const durationMs = Date.now() - start;
    if (!res.ok) return { name, category: "api", status: "fail", durationMs, detail: `HTTP ${res.status}` };
    return { name, category: "api", status: durationMs > SLOW_THRESHOLD_MS ? "degraded" : "pass", durationMs };
  } catch (error) {
    return { name, category: "api", status: "fail", durationMs: Date.now() - start, detail: error.name === "AbortError" ? "Timed out" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

// This process's own vitals -- honestly scoped to what's actually readable
// from inside the running Node process itself, not a stand-in for real
// infrastructure monitoring (pm2 restart count, disk space, etc. aren't
// available from here and aren't claimed to be).
function checkProcess() {
  const mem = process.memoryUsage();
  return {
    name: "Node process",
    category: "process",
    status: "pass",
    durationMs: 0,
    detail: `uptime ${Math.round(process.uptime())}s, RSS ${Math.round(mem.rss / 1024 / 1024)}MB, Node ${process.version}`,
  };
}

export const runHealthCheck = async (req, res) => {
  const start = Date.now();
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const [dbCheck, ...apiChecks] = await Promise.all([
      checkDatabase(),
      ...API_CHECKS.map((c) => checkApi(baseUrl, c)),
    ]);
    const processCheck = checkProcess();
    const checks = [dbCheck, ...apiChecks, processCheck];

    const overallStatus = checks.some((c) => c.status === "fail")
      ? "critical"
      : checks.some((c) => c.status === "degraded")
      ? "degraded"
      : "healthy";

    const run = await HealthCheckRun.create({
      overallStatus,
      checksJson: checks,
      durationMs: Date.now() - start,
      triggeredByName: req.user.name || req.user.email,
    });

    res.json({ run });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const listHealthCheckRuns = async (req, res) => {
  try {
    const runs = await HealthCheckRun.findAll({ order: [["createdAt", "DESC"]], limit: 30 });
    res.json({ runs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
