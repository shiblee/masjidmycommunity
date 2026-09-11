// One-off, read-mostly diagnostic: finds a real user with a Primary Masjid
// set, mints a real JWT for them (same signing shape userController.js
// uses), and exercises the live POST /me/salah/mark endpoint against both a
// prayer whose time has already passed today (should succeed) and one that
// hasn't started yet (should 400 with the new message) -- confirms the
// server-side time gate added alongside SalahTracker.jsx's client-side one
// actually works. Cleans up any SalahLog row it creates.
import "dotenv/config";
import jwt from "jsonwebtoken";
import { sequelize } from "../src/config/db.js";
import User from "../src/models/User.js";
import Masjid from "../src/models/Masjid.js";
import SalahLog from "../src/models/SalahLog.js";
import { getEffectivePrayerTimes } from "../src/services/prayerTimeService.js";

const BASE_URL = "https://masjidmycommunity.com/api";

async function call(path, token, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

function currentHHmmInTimezone(timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timeZone || "UTC", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  return `${parts.find((p) => p.type === "hour").value}:${parts.find((p) => p.type === "minute").value}`;
}

const today = new Date().toISOString().slice(0, 10);
let markedPrayerId = null;
let userId = null;

try {
  const { Op } = await import("sequelize");
  const user = await User.findOne({ where: { primaryMasjidId: { [Op.ne]: null } }, attributes: ["id", "tokenVersion", "primaryMasjidId"] });
  if (!user) throw new Error("No user with a Primary Masjid found to test with.");
  userId = user.id;

  const masjid = await Masjid.findByPk(user.primaryMasjidId, { attributes: ["timezone"] });
  const roster = await getEffectivePrayerTimes(user.primaryMasjidId, today);
  const nowHHmm = currentHHmmInTimezone(masjid?.timezone);
  const fardWithTime = roster.filter((r) => r.category === "Fard" && r.time);
  const past = fardWithTime.find((r) => r.time <= nowHHmm);
  const future = fardWithTime.find((r) => r.time > nowHHmm);

  console.log(`Testing user ${user.id}, masjid tz ${masjid?.timezone}, now ${nowHHmm}`);
  console.log("Past prayer found:", past ? `${past.name} @ ${past.time}` : "none today");
  console.log("Future prayer found:", future ? `${future.name} @ ${future.time}` : "none today");

  const token = jwt.sign({ id: user.id, type: "user", tv: user.tokenVersion, sid: "diagnostic" }, process.env.JWT_SECRET, { expiresIn: "5m" });

  if (future) {
    const res = await call("/users/me/salah/mark", token, { method: "POST", body: JSON.stringify({ prayerId: future.prayerId, date: today }) });
    console.log(`POST mark future (${future.name} @ ${future.time}):`, res.status, res.body?.message, "(expect 400)");
  }

  if (past) {
    const res = await call("/users/me/salah/mark", token, { method: "POST", body: JSON.stringify({ prayerId: past.prayerId, date: today }) });
    console.log(`POST mark past (${past.name} @ ${past.time}):`, res.status, res.body?.completedCount !== undefined ? "marked" : res.body?.message, "(expect 200)");
    if (res.status === 200) markedPrayerId = past.prayerId;
  }
} finally {
  if (markedPrayerId && userId) {
    await SalahLog.destroy({ where: { userId, prayerId: markedPrayerId, date: today } });
    console.log("Cleaned up the test SalahLog row.");
  }
  await sequelize.close();
}
