// Diagnostic (not self-cleaning by design of the upload itself, but still
// cleans up after): synthesizes a REALISTIC-sized 70s/720p test clip
// (several MB, unlike verifyReels.mjs's tiny synthetic ones) and times the
// full upload -> duration-check -> poster-generation -> DB-create round
// trip against the live server, to see whether a real-world-sized video is
// what's making the "Upload Reel" modal sit on "Uploading..." for a long
// time (nginx/express timeout tuning) or something is genuinely broken.
import "dotenv/config";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import jwt from "jsonwebtoken";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import { sequelize } from "../src/config/db.js";
import User from "../src/models/User.js";
import CommunityActivity from "../src/models/CommunityActivity.js";

const BASE_URL = "https://masjidmycommunity.com/api";

function makeRealisticClip(outputPath) {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath.path,
      ["-y", "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=70", "-c:v", "libx264", "-b:v", "2M", "-pix_fmt", "yuv420p", "-t", "70", outputPath],
      (err, _so, se) => (err ? reject(new Error(se)) : resolve())
    );
  });
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reel-real-"));
const clip = path.join(tmpDir, "realistic.mp4");
let user, createdActivityId;

try {
  const t0 = Date.now();
  await makeRealisticClip(clip);
  console.log(`Synthesized clip in ${Date.now() - t0}ms, size: ${(fs.statSync(clip).size / (1024 * 1024)).toFixed(2)}MB`);

  user = await User.findOne({ where: { status: "active" }, attributes: ["id", "tokenVersion"] });
  if (!user) throw new Error("No active user found to test with.");
  const token = jwt.sign({ id: user.id, type: "user", tv: user.tokenVersion, sid: "diagnostic" }, process.env.JWT_SECRET, { expiresIn: "5m" });

  const form = new FormData();
  form.append("video", new Blob([fs.readFileSync(clip)], { type: "video/mp4" }), "realistic.mp4");
  form.append("body", "Realistic-size test reel");

  const t1 = Date.now();
  const res = await fetch(`${BASE_URL}/community/reels`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const uploadMs = Date.now() - t1;
  const json = await res.json().catch(() => null);
  console.log(`POST /reels: ${res.status} in ${uploadMs}ms —`, json?.activity ? "created" : json?.message);
  createdActivityId = json?.activity?.id || null;
} finally {
  if (createdActivityId) {
    const activity = await CommunityActivity.findByPk(createdActivityId);
    if (activity) {
      if (activity.mediaVideoUrl) fs.unlink(`.${activity.mediaVideoUrl}`, () => {});
      if (activity.mediaVideoPosterUrl) fs.unlink(`.${activity.mediaVideoPosterUrl}`, () => {});
      await activity.destroy();
    }
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log("Cleaned up.");
  await sequelize.close();
}
