// One-off, self-cleaning verification: creates a temporary suspended user
// and a temporary active user, hits the live GET /api/users/public
// directory, confirms the suspended one never appears and the active one
// does with no email/mobile/gender/maritalStatus fields present, then
// deletes both test accounts.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { sequelize } from "../src/config/db.js";
import User from "../src/models/User.js";

const BASE_URL = "https://masjidmycommunity.com/api";
const STAMP = Date.now();

let activeUser, suspendedUser;
try {
  const hashed = await bcrypt.hash("TestPass@2026", 10);
  activeUser = await User.create({
    fullName: "Directory Test Active", username: `dirtest-active-${STAMP}`, email: `dirtest-active-${STAMP}@example.com`,
    password: hashed, registrationMethod: "email", status: "active", gender: "male", maritalStatus: "single",
  });
  suspendedUser = await User.create({
    fullName: "Directory Test Suspended", username: `dirtest-suspended-${STAMP}`, email: `dirtest-suspended-${STAMP}@example.com`,
    password: hashed, registrationMethod: "email", status: "suspended",
  });

  const res = await fetch(`${BASE_URL}/users/public?q=Directory%20Test&pageSize=20`);
  const body = await res.json();
  const activeRow = body.users.find((u) => u.id === activeUser.id);
  const suspendedRow = body.users.find((u) => u.id === suspendedUser.id);

  console.log("Status:", res.status, "(expect 200)");
  console.log("Active test user present:", !!activeRow, "(expect true)");
  console.log("Suspended test user present:", !!suspendedRow, "(expect false)");
  const leaked = activeRow && ["email", "mobile", "gender", "maritalStatus", "dateOfBirth"].filter((f) => f in activeRow);
  console.log("Private fields leaked on active user:", leaked, "(expect [])");
} finally {
  if (activeUser) await User.destroy({ where: { id: activeUser.id } });
  if (suspendedUser) await User.destroy({ where: { id: suspendedUser.id } });
  console.log("Cleaned up test accounts.");
  await sequelize.close();
}
