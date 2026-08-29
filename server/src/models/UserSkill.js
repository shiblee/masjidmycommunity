import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const UserSkill = sequelize.define(
  "UserSkill",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    skillId: { type: DataTypes.INTEGER, allowNull: true },
    customName: { type: DataTypes.STRING, allowNull: true },
    proficiency: {
      type: DataTypes.ENUM("beginner", "intermediate", "advanced", "expert"),
      allowNull: true,
    },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "user_skills",
    indexes: [{ fields: ["userId"], name: "user_skills_user_id_idx" }],
  }
);

export default UserSkill;
