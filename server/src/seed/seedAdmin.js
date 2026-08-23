import "dotenv/config";
import bcrypt from "bcryptjs";
import { sequelize } from "../config/db.js";
import AdminUser from "../models/AdminUser.js";

const DEMO_ADMIN = {
  name: "Aisha Karim",
  email: "admin@masjidmycommunity.org",
  password: "MasjidMyCommunity@2026",
  role: "Platform Administrator",
  status: "active",
  phone: "+1 (555) 019-2044",
  bio: "Managing platform operations, masjid verification, and fund transparency at Masjid My Community.",
};

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync();

  const existing = await AdminUser.findOne({ where: { email: DEMO_ADMIN.email } });
  if (existing) {
    let patched = false;
    if (!existing.phone) { existing.phone = DEMO_ADMIN.phone; patched = true; }
    if (!existing.bio) { existing.bio = DEMO_ADMIN.bio; patched = true; }
    if (!existing.preferences) { existing.preferences = existing.constructor.getAttributes().preferences.defaultValue; patched = true; }
    if (patched) {
      await existing.save();
      console.log(`Backfilled missing fields on existing admin: ${DEMO_ADMIN.email}`);
    } else {
      console.log(`Admin user already exists: ${DEMO_ADMIN.email}`);
    }
  } else {
    const hashed = await bcrypt.hash(DEMO_ADMIN.password, 10);
    await AdminUser.create({ ...DEMO_ADMIN, password: hashed });
    console.log(`Created admin user: ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`);
  }

  await sequelize.close();
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
