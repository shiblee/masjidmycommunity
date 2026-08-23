import "dotenv/config";

import app from "./app.js";
import connectDB from "./config/db.js";
import { ensureEmailDefaults } from "./seed/emailDefaults.js";

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => ensureEmailDefaults())
  .catch((error) => console.error("Failed to seed email defaults:", error.message))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
