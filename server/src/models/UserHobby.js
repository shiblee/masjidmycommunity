import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const UserHobby = sequelize.define(
  "UserHobby",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    hobbyId: { type: DataTypes.INTEGER, allowNull: true },
    customName: { type: DataTypes.STRING, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "user_hobbies",
    indexes: [{ fields: ["userId"], name: "user_hobbies_user_id_idx" }],
  }
);

export default UserHobby;
