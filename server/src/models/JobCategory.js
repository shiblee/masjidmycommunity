import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Powers the Jobs page's quick-discovery category strip (Teaching &
// Education, IT & Technology, Healthcare, ...) — meta-driven like
// EmploymentType/ExperienceLevel/Skill, not hardcoded in the client.
// `icon` names one of the existing Icon component's known icon keys
// (client/src/components/Icons.jsx), shown next to the category label.
const JobCategory = sequelize.define(
  "JobCategory",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "job_categories",
    indexes: [{ unique: true, fields: ["name"], name: "job_categories_name_unique" }],
  }
);

export default JobCategory;
