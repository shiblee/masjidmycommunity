import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const ConcernHistory = sequelize.define(
  "ConcernHistory",
  {
    concernId: { type: DataTypes.INTEGER, allowNull: false },
    action: { type: DataTypes.STRING, allowNull: false },
    actorType: { type: DataTypes.ENUM("user", "admin"), allowNull: false },
    actorName: { type: DataTypes.STRING, allowNull: true },
    note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "concern_history",
    indexes: [{ fields: ["concernId"], name: "concern_history_concern_id_idx" }],
  }
);

export default ConcernHistory;
