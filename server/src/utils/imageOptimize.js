import sharp from "sharp";
import fs from "fs/promises";

// See the Community Wall Performance & Scalability audit: "a photo is
// stored and served at exactly whatever the uploading device produced,
// regardless of the small gallery tile it's actually displayed in." No
// gallery layout in PostImageGallery ever needs more than this on either
// axis, and 5MB phone photos routinely arrive far larger.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const PNG_COMPRESSION_LEVEL = 9;

// Resizes and re-compresses an uploaded photo in place, in its own format
// (JPG stays JPG, PNG stays PNG, WEBP stays WEBP) -- Express serves static
// files by extension, so writing JPEG bytes into a re-used .png filename
// would leave the Content-Type wrong. Reads the whole file into a buffer
// first rather than piping sharp's input and output through the same path
// (which a single pipeline can't do safely).
//
// Never throws: this runs after the file already exists and before it's
// ever served, so a failure here should leave the original upload in place
// rather than fail the post/comment it's attached to -- the same
// best-effort reasoning as generateVideoThumbnail().
export async function optimizeImageInPlace(filePath, mimetype) {
  try {
    let pipeline = sharp(filePath)
      .rotate() // auto-orient from EXIF before resizing, then the tag is dropped
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true });

    if (mimetype === "image/png") pipeline = pipeline.png({ compressionLevel: PNG_COMPRESSION_LEVEL });
    else if (mimetype === "image/webp") pipeline = pipeline.webp({ quality: WEBP_QUALITY });
    else pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

    const buffer = await pipeline.toBuffer();
    await fs.writeFile(filePath, buffer);
  } catch {
    // Best-effort -- see comment above.
  }
}
