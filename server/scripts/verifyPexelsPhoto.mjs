// One-off, self-cleaning smoke test: confirms PEXELS_API_KEY actually works
// end to end (search + download + save) before running the real backfill
// against all 193 bot users. Creates no DB rows -- just calls the
// generator directly and reports the result, then deletes the test file.
import "dotenv/config";
import fs from "fs";
import { generateRealisticProfilePhoto } from "../src/utils/realisticPhotoService.js";

const testUsername = `pexels-smoketest-${Date.now()}`;
let savedPath = null;

try {
  const male = await generateRealisticProfilePhoto(testUsername, "male");
  console.log("Male photo result:", male);
  if (male) {
    savedPath = `.${male}`;
    const stat = fs.statSync(savedPath);
    console.log("File size (bytes):", stat.size);
  }
} finally {
  if (savedPath) fs.unlink(savedPath, () => console.log("Cleaned up test file."));
}
