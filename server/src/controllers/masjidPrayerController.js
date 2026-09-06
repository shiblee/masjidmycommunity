import Masjid from "../models/Masjid.js";
import User from "../models/User.js";
import {
  getEffectivePrayerTimes,
  saveEffectivePrayerTime,
  getPrayerTimeHistory,
  copyPrayerTimes,
  applyPrayerTimesToRange,
  listOverrideDatesInMonth,
  isValidDateStr,
  isValidTime,
} from "../services/prayerTimeService.js";
import { validatePrayerTimes } from "../services/prayerValidationService.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function findOwnedMasjid(req) {
  return Masjid.findOne({ where: { id: req.params.id, userId: req.user.id } });
}

async function actorFrom(req) {
  const owner = await User.findByPk(req.user.id, { attributes: ["fullName"] });
  return { type: "user", name: owner?.fullName || "Masjid Owner" };
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

    const { errors, warnings } = await validatePrayerTimes({ masjidId: masjid.id, dateStr: date, entries });
    if (errors.length) {
      return res.status(422).json({ message: "Invalid Prayer Time", errors });
    }
    if (warnings.length && !req.body.confirmWarnings) {
      return res.json({ saved: false, warnings });
    }

    const actor = await actorFrom(req);
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
    res.json({ date, roster, saved: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const copyRoster = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const { fromDate, toDate } = req.body;
    if (!isValidDateStr(fromDate) || !isValidDateStr(toDate)) {
      return res.status(400).json({ message: "Invalid date(s)." });
    }

    const actor = await actorFrom(req);
    const roster = await copyPrayerTimes({ masjidId: masjid.id, fromDateStr: fromDate, toDateStr: toDate, actor });
    res.json({ date: toDate, roster });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const applyRange = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const { templateDate, startDate, endDate } = req.body;
    if (!isValidDateStr(templateDate) || !isValidDateStr(startDate) || !isValidDateStr(endDate)) {
      return res.status(400).json({ message: "Invalid date(s)." });
    }
    if (endDate < startDate) {
      return res.status(400).json({ message: "End date must be on or after the start date." });
    }

    const actor = await actorFrom(req);
    const appliedDates = await applyPrayerTimesToRange({
      masjidId: masjid.id, templateDateStr: templateDate, startDateStr: startDate, endDateStr: endDate, actor,
    });
    res.json({ appliedDates });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getOverrideDates = async (req, res) => {
  try {
    const masjid = await findOwnedMasjid(req);
    if (!masjid) return res.status(404).json({ message: "Masjid not found." });

    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ message: "Provide a valid year and month." });
    }

    const dates = await listOverrideDatesInMonth(masjid.id, year, month);
    res.json({ dates });
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
