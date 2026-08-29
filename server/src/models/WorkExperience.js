import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const WorkExperience = sequelize.define(
  "WorkExperience",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    employmentType: {
      type: DataTypes.ENUM("full_time", "part_time", "internship", "contract", "freelance", "self_employed", "volunteer"),
      allowNull: true,
    },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    location: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "work_experiences",
    indexes: [{ fields: ["userId"], name: "work_experiences_user_id_idx" }],
  }
);

export default WorkExperience;
