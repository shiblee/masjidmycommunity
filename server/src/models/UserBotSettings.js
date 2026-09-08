import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Singleton row (id: 1) — admin-configurable controls for the synthetic
// USER generator (syntheticUserGeneratorService.js / userBotSchedulerService.js).
// A separate settings table from VisitorBotSettings.js on purpose: these
// govern real, permanent, publicly-visible User accounts, not ephemeral
// visitor-tracking sessions, and carry their own safety caps as a result.
const UserBotSettings = sequelize.define(
  "UserBotSettings",
  {
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    usersPerHour: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    // International % is always `100 - indiaPercent`, never stored
    // separately — same anti-drift reasoning as VisitorBotSettings.
    indiaPercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 80 },
    // Purely a name-pool-selection knob for the generator (which first/last
    // name list to draw from) — never persisted anywhere as a claim about
    // an account's actual religion.
    muslimPersonaPercent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
    // Null = active all day. Otherwise an hour-of-day (0-23, UTC) window.
    activeHourStart: { type: DataTypes.INTEGER, allowNull: true },
    activeHourEnd: { type: DataTypes.INTEGER, allowNull: true },
    // Safety caps the Visitor Bot didn't need — these are permanent,
    // publicly-visible accounts, not throwaway analytics rows. Null = no cap.
    maxBotUsersPerDay: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 50 },
    maxTotalBotUsers: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 500 },
  },
  {
    tableName: "user_bot_settings",
  }
);

export default UserBotSettings;
