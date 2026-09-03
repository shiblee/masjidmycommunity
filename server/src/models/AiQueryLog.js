import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// One row per "Ask AI" request (even when the AI wasn't actually called —
// unconfigured or below the confidence threshold still get logged), so
// admins can see what people are asking and where the knowledge base falls
// short. Public/anonymous like ContactMessage/Concern — no user FK.
// sessionId is client-generated and only scopes the anonymous feedback
// PATCH to its own row; it is not a security boundary.
const AiQueryLog = sequelize.define(
  "AiQueryLog",
  {
    question: { type: DataTypes.TEXT, allowNull: false },
    languageCode: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "en" },
    matchedCategories: { type: DataTypes.STRING, allowNull: true },
    confidenceScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    aiCalled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    answerPreview: { type: DataTypes.STRING(500), allowNull: true },
    feedback: { type: DataTypes.ENUM("helpful", "unhelpful"), allowNull: true },
    sessionId: { type: DataTypes.STRING, allowNull: true },
  },
  {
    tableName: "ai_query_logs",
    indexes: [
      { fields: ["createdAt"], name: "ai_query_logs_created_at_idx" },
      { fields: ["aiCalled"], name: "ai_query_logs_ai_called_idx" },
      { fields: ["feedback"], name: "ai_query_logs_feedback_idx" },
    ],
  }
);

export default AiQueryLog;
