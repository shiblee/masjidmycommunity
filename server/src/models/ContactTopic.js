import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// Master list of topics offered on the Contact Us form's "What's this
// about?" chips — mirrors ConcernType's shape (name referenced directly as
// a plain string on the transactional table, not an FK), plus an icon name
// from the public Icons.jsx set for the chip's icon.
const ContactTopic = sequelize.define(
  "ContactTopic",
  {
    name: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: false, defaultValue: "compass" },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "contact_topics",
    indexes: [{ unique: true, fields: ["name"], name: "contact_topics_name_unique" }],
  }
);

export default ContactTopic;
