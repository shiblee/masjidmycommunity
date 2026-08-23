import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const EmailTemplate = sequelize.define(
  "EmailTemplate",
  {
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    heading: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ctaText: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ctaLink: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    footerText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    quoteEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    quoteTransliteration: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quoteTranslation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quoteSource: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    availableVariables: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
  },
  {
    tableName: "email_templates",
    indexes: [{ unique: true, fields: ["key"], name: "email_templates_key_unique" }],
  }
);

export default EmailTemplate;
