import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Education = sequelize.define(
  "Education",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    level: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    degree: { type: DataTypes.STRING, allowNull: false },
    institution: { type: DataTypes.STRING, allowNull: false },
    fieldOfStudy: { type: DataTypes.STRING, allowNull: true },
    startYear: { type: DataTypes.INTEGER, allowNull: true },
    endYear: { type: DataTypes.INTEGER, allowNull: true },
    isCurrentlyStudying: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    location: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "educations",
    indexes: [{ fields: ["userId"], name: "educations_user_id_idx" }],
  }
);

export default Education;
