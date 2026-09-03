import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

// A static content page (Terms of Use, Privacy Policy, ...). The slug is the
// stable identifier content lives under; the public site can add new pages
// at /pages/:slug with no route changes, while a few known slugs also get a
// prettier fixed URL (see App.jsx). Per-language body content lives in
// PageContent, not here — this row is just the page's identity/ordering.
const Page = sequelize.define(
  "Page",
  {
    slug: { type: DataTypes.STRING, allowNull: false },
    defaultTitle: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: "pages",
    indexes: [{ unique: true, fields: ["slug"], name: "pages_slug_unique" }],
  }
);

export default Page;
