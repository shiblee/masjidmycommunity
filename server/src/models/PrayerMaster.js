import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Admin-defined list of prayers a masjid can set timings for — never
// hardcode "Fajr"/"Dhuhr"/... in the roster logic, always query
// isActive:true here, ordered by sortOrder, so admins can add further
// prayers (e.g. Jumu'ah) later with no code change. Multilingual display
// name is intentionally NOT stored here — it's looked up via the existing
// Translation system using a "prayer.<slug of name>" key, with `name`
// itself serving as the English fallback (see prayerDefaults.js).
const PrayerMaster = sequelize.define(
  "PrayerMaster",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    // Optional free-text grouping, e.g. "Fard", "Sunnah", "Jumu'ah".
    category: { type: DataTypes.STRING, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

    // --- Validation config (prayerValidationService.js reads these) ---
    // Null on any of these means "unrestricted" for that particular check —
    // e.g. Isha ships with period:"PM" but no min/max, matching "Configurable
    // based on the Masjid/roster rules" rather than a fixed hard range.
    period: { type: DataTypes.ENUM("AM", "PM"), allowNull: true },
    minTime: { type: DataTypes.STRING, allowNull: true }, // "HH:mm"
    maxTime: { type: DataTypes.STRING, allowNull: true }, // "HH:mm"
    // This prayer's time must be `relation` the related prayer's effective
    // time on the same date (e.g. Fajr: relation:"before", relatedPrayerId
    // pointing at Sunrise) — a soft warning, not a hard block. No DB-level
    // FK, consistent with this codebase's existing loose-reference style.
    relatedPrayerId: { type: DataTypes.INTEGER, allowNull: true },
    relation: { type: DataTypes.ENUM("before", "after"), allowNull: true },
    // Chronological-sequence chain membership (checked against the nearest
    // chain neighbor by sortOrder) — off by default for prayers that don't
    // cleanly chain into the main Fajr->...->Isha sequence (Jumu'ah shares
    // Dhuhr's slot; Tahajjud/Witr sit at the day's edges).
    requiresPreviousCheck: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    requiresNextCheck: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    // Deterministic threshold-based deviation check against this exact
    // (masjid, prayer, date)'s own prior effective time — not a real AI/LLM
    // call, see prayerValidationService.js.
    aiAnomalyCheck: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: "prayer_masters",
    indexes: [{ unique: true, fields: ["name"], name: "prayer_masters_name_unique" }],
  }
);

export default PrayerMaster;
