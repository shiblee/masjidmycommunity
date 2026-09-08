import fs from "fs";
import path from "path";

// Deterministic, dependency-free "identicon" avatar for bot User accounts —
// an abstract geometric pattern seeded from the username, not a real or
// fake human face. Written into the exact same folder/URL convention real
// uploaded profile photos use (server/src/middleware/upload.js), so nothing
// downstream (profile page, admin list) needs to know the difference.
//
// Deliberately hand-built from plain rects only (no <script>, no event-
// handler attributes, no external references) — the SVG is 100%
// server-generated from a hash of the username, never from user input, but
// this keeps it inert by construction regardless.

const UPLOAD_ROOT = path.resolve("uploads", "profile-photos");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const PALETTES = [
  ["#5E9A2C", "#EAF4E0"], ["#2C7A9C", "#E3F1F6"], ["#C24B3F", "#FBEAE8"],
  ["#8A6DC9", "#EFEAFB"], ["#C9942C", "#FBF2E2"], ["#3F8ACB", "#E7F1FB"],
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildIdenticonSvg(seed) {
  const hash = hashString(seed);
  const [fg, bg] = PALETTES[hash % PALETTES.length];
  const size = 5;
  const cell = 40;
  const cols = Math.ceil(size / 2); // only the left half + center column are generated, then mirrored

  const rects = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < cols; col++) {
      const filled = hashString(`${seed}:${row}:${col}`) % 2 === 0;
      if (!filled) continue;
      rects.push(`<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="${fg}" />`);
      const mirroredCol = size - 1 - col;
      if (mirroredCol !== col) {
        rects.push(`<rect x="${mirroredCol * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="${fg}" />`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size * cell} ${size * cell}"><rect width="100%" height="100%" fill="${bg}" />${rects.join("")}</svg>`;
}

/** Generates and saves a seeded avatar, returning the same relative-URL
 * shape User.profilePhoto already stores for a real uploaded photo. */
export function generateAndSaveAvatar(seed) {
  const svg = buildIdenticonSvg(seed);
  const filename = `bot-${seed}.svg`;
  fs.writeFileSync(path.join(UPLOAD_ROOT, filename), svg, "utf8");
  return `/uploads/profile-photos/${filename}`;
}
