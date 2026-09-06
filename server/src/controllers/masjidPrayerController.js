import Masjid from "../models/Masjid.js";
import User from "../models/User.js";
import {
  getEffectivePrayerTimes,
  saveEffectivePrayerTime,
  getPrayerTimeHistory,
  isValidDateStr,
  isValidTime,
} from "../services/prayerTimeService.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function findOwnedMasjid(req) {
  return Masjid.findOne({ where: { id: req.params.id, userId: req.user.id } });
}

export const getRoster = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const dateStr = req.query.date || today();
    if (!isValidDateStr(dateStr)) return res.status(400).json({ message: "Invalid date." });

    const roster = await getEffectivePrayerTimes(masjid.id, dateStr);
    res.json({ date: dateStr, roster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const saveRoster = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const { date, entries } = req.body;
    if (!isValidDateStr(date)) return res.status(400).json({ message: "Invalid date." });
    if (!Array.isArray(entries) || entries.length === 0) return res.status(400).json({ message: "Provide at least one prayer time." });

    for (const entry of entries) {
      if (!entry.prayerId || !isValidTime(entry.time)) {
        return res.status(400).json({ message: "Each entry needs a valid prayer and a time in HH:mm format." });
      }
      if (!["recurring", "override"].includes(entry.scope)) {
        return res.status(400).json({ message: "Each entry's scope must be 'recurring' or 'override'." });
      }
    }

    const owner = await User.findByPk(req.user.id, { attributes: ["fullName"] });
    const actor = { type: "user", name: owner?.fullName || "Masjid Owner" };
    for (const entry of entries) {
      await saveEffectivePrayerTime({
        masjidId: masjid.id,
        prayerId: entry.prayerId,
        dateStr: date,
        time: entry.time,
        scope: entry.scope,
        actor,
      });
    }

    const roster = await getEffectivePrayerTimes(masjid.id, date);
    res.json({ date, roster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const page = Math.max(Number(req.query.page) || 1, 1);
    const { total, entries } = await getPrayerTimeHistory(masjid.id, { page, limit: 20 });
    res.json({ total, page, entries });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
