import MasjidPhoto from "../models/MasjidPhoto.js";
import { buildPhotoMediaUrl } from "../services/googlePlacesService.js";

// Public (masjid photos are already public once the masjid is approved) —
// streams a Google-sourced photo live from Google's own Photo Media
// endpoint using the site's Maps key, rather than ever downloading or
// re-hosting the image on this server. For an "upload" (real Multer-
// uploaded) photo, url already points at /uploads/masjid-photos/... and
// this route is never involved at all.
export const getPhotoMedia = async (req, res) => {
  try {
    const photo = await MasjidPhoto.findByPk(req.params.photoId);
    if (!photo || photo.sourceType !== "google_places" || !photo.sourcePhotoReference) {
      return res.status(404).json({ message: "Photo not found." });
    }
    const mediaUrl = await buildPhotoMediaUrl(photo.sourcePhotoReference);
    const googleRes = await fetch(mediaUrl, { redirect: "follow" });
    if (!googleRes.ok) return res.status(502).json({ message: "Couldn't fetch photo from Google." });

    res.set("Content-Type", googleRes.headers.get("content-type") || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    const buffer = Buffer.from(await googleRes.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
