// One-off, self-cleaning verification: synthesizes two tiny test video
// clips with the server's own ffmpeg binary (2s valid, 100s oversized),
// mints a JWT for a real user, uploads both to the live POST
// /api/community/reels endpoint (expect 201 then 400), confirms the valid
// one appears in GET /api/community/reels with a poster and the right
// type, then deletes the test activity/file and the synthesized clips.
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

function makeClip(outputPath, seconds) {
  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath.path,
      ["-y", "-f", "lavfi", "-i", `color=c=blue:s=320x240:d=${seconds}`, "-c:v", "libx264", "-t", String(seconds), outputPath],
      (err) => (err ? reject(err) : resolve())
    );
  });
}

async function uploadReel(token, filePath, body) {
  const form = new FormData();
  form.append("video", new Blob([fs.readFileSync(filePath)], { type: "video/mp4" }), path.basename(filePath));
  if (body) form.append("body", body);
  const res = await fetch(`${BASE_URL}/community/reels`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reel-test-"));
const shortClip = path.join(tmpDir, "short.mp4");
const longClip = path.join(tmpDir, "long.mp4");
let user, createdActivityId;

try {
  await Promise.all([makeClip(shortClip, 2), makeClip(longClip, 100)]);
  console.log("Synthesized test clips (2s valid, 100s oversized).");

  user = await User.findOne({ where: { status: "active" }, attributes: ["id", "tokenVersion"] });
  if (!user) throw new Error("No active user found to test with.");
  const token = jwt.sign({ id: user.id, type: "user", tv: user.tokenVersion, sid: "diagnostic" }, process.env.JWT_SECRET, { expiresIn: "5m" });

  const oversized = await uploadReel(token, longClip, "Oversized test reel");
  console.log("POST /reels (100s, expect 400):", oversized.status, oversized.body?.message);

  const valid = await uploadReel(token, shortClip, "Valid test reel #reelstest");
  console.log("POST /reels (2s, expect 201):", valid.status, valid.body?.activity ? "created" : valid.body?.message);
  createdActivityId = valid.body?.activity?.id || null;

  if (createdActivityId) {
    console.log("Has poster:", !!valid.body.activity.mediaVideoPosterUrl, "type:", valid.body.activity.type, "status:", valid.body.activity.status);
    const listRes = await fetch(`${BASE_URL}/community/reels?limit=5`);
    const listBody = await listRes.json();
    const found = listBody.reels.find((r) => r.id === createdActivityId);
    console.log("GET /reels lists it:", !!found, "(expect true)");
  }
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
  console.log("Cleaned up test reel and synthesized clips.");
  await sequelize.close();
}
