import fs from "fs";
import path from "path";
import multer from "multer";

const UPLOAD_ROOT = path.resolve("uploads", "masjid-photos");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const CAMPAIGN_UPLOAD_ROOT = path.resolve("uploads", "campaign-photos");
fs.mkdirSync(CAMPAIGN_UPLOAD_ROOT, { recursive: true });

// Deliberately outside the `uploads/` static mount (see app.js) — compliance
// documents (registration certificates, trust deeds, etc.) must never be
// reachable by a guessable URL, only via the authenticated download route.
const DOCUMENT_UPLOAD_ROOT = path.resolve("private_uploads", "campaign-documents");
fs.mkdirSync(DOCUMENT_UPLOAD_ROOT, { recursive: true });

function diskStorageFor(root) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, root),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
}

const storage = diskStorageFor(UPLOAD_ROOT);

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const ALLOWED = new Set([...IMAGE_TYPES, ...VIDEO_TYPES]);

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export function mediaTypeOf(mimetype) {
  return VIDEO_TYPES.has(mimetype) ? "video" : "photo";
}

// Multer enforces one file-size ceiling per field, so it's set to the larger
// (video) limit here; the tighter per-image limit is checked in the
// controller once each file's actual mimetype is known.
const multerUpload = multer({
  storage,
  limits: { fileSize: VIDEO_MAX_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(new Error("Only JPG, PNG, WEBP photos or MP4, WEBM, MOV videos are allowed."));
    cb(null, true);
  },
});

/** Wraps multer so file-too-large / bad-type errors come back as JSON instead of Express's default HTML error page. */
export function uploadMasjidPhotos(req, res, next) {
  multerUpload.array("photos", 10)(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: `Each file must be under ${VIDEO_MAX_BYTES / (1024 * 1024)}MB (photos under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB).` });
    }
    res.status(400).json({ message: err.message || "Couldn't upload that file." });
  });
}

const campaignPhotoUpload = multer({
  storage: diskStorageFor(CAMPAIGN_UPLOAD_ROOT),
  limits: { fileSize: VIDEO_MAX_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(new Error("Only JPG, PNG, WEBP photos or MP4, WEBM, MOV videos are allowed."));
    cb(null, true);
  },
});

export function uploadCampaignPhotos(req, res, next) {
  campaignPhotoUpload.array("photos", 10)(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: `Each file must be under ${VIDEO_MAX_BYTES / (1024 * 1024)}MB (photos under ${IMAGE_MAX_BYTES / (1024 * 1024)}MB).` });
    }
    res.status(400).json({ message: err.message || "Couldn't upload that file." });
  });
}

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const campaignDocumentUpload = multer({
  storage: diskStorageFor(DOCUMENT_UPLOAD_ROOT),
  limits: { fileSize: DOCUMENT_MAX_BYTES, files: 5 },
  fileFilter: (req, file, cb) => {
    if (!DOCUMENT_TYPES.has(file.mimetype)) return cb(new Error("Only PDF, JPG, PNG, DOC or DOCX files are allowed."));
    cb(null, true);
  },
});

export function uploadCampaignDocuments(req, res, next) {
  campaignDocumentUpload.array("documents", 5)(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: `Each document must be under ${DOCUMENT_MAX_BYTES / (1024 * 1024)}MB.` });
    }
    res.status(400).json({ message: err.message || "Couldn't upload that file." });
  });
}
