import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import MicButton from "../../components/MicButton.jsx";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { getUserToken } from "../../utils/userAuthStorage.js";
import { StarRating, IMAGE_SIZE_MAX_BYTES } from "./exploreMasjidsShared.jsx";

const API = `${API_BASE}/masjids/public`;

function readVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => resolve(null);
    video.src = URL.createObjectURL(file);
  });
}

function extOf(filename) {
  return filename.split(".").pop()?.toLowerCase() || "";
}

// "jpg" and "jpeg" are the same format under two spellings — accept either
// whichever one the admin listed in Review Settings.
function normalizeImageExt(ext) {
  return ext === "jpeg" ? "jpg" : ext;
}

function ReviewForm({ masjidId, existing, settings, onSaved, onCancel }) {
  const [rating, setRating] = useState(existing?.rating || 0);
  const [body, setBody] = useState(existing?.body || "");
  const [existingMedia, setExistingMedia] = useState(existing?.media || []);
  const [newFiles, setNewFiles] = useState([]); // [{ file, previewUrl, mediaType }]
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const maxLength = settings?.maxLength ?? 1000;
  const overLimit = body.length > maxLength;
  const mediaEnabled = settings?.mediaEnabled ?? true;
  const maxImages = settings?.maxImages ?? 5;
  const imageFormats = (settings?.allowedImageFormats || "jpg,png,webp").split(",").map((f) => normalizeImageExt(f.trim().toLowerCase()));
  const videoFormats = (settings?.allowedVideoFormats || "mp4,webm,mov").split(",").map((f) => f.trim().toLowerCase());
  const maxVideoBytes = (settings?.maxVideoSizeMB ?? 50) * 1024 * 1024;
  const maxVideoDuration = settings?.maxVideoDurationSeconds ?? 60;

  const existingPhotoCount = existingMedia.filter((m) => m.mediaType === "photo").length;
  const existingVideoCount = existingMedia.filter((m) => m.mediaType === "video").length;
  const newPhotoCount = newFiles.filter((f) => f.mediaType === "photo").length;
  const newVideoCount = newFiles.filter((f) => f.mediaType === "video").length;

  useEffect(() => () => newFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = async (fileList) => {
    setError("");
    const files = Array.from(fileList || []);
    let runningPhotoCount = newPhotoCount;
    let runningVideoCount = newVideoCount;
    const accepted = [];
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const ext = extOf(file.name);
      if (isVideo) {
        if (existingVideoCount + runningVideoCount >= 1) { setError("You can attach only one video per review."); continue; }
        if (!videoFormats.includes(ext)) { setError(`Video must be one of: ${videoFormats.join(", ")}.`); continue; }
        if (file.size > maxVideoBytes) { setError(`Video must be under ${settings.maxVideoSizeMB}MB.`); continue; }
        const duration = await readVideoDuration(file);
        if (duration != null && duration > maxVideoDuration) {
          setError(`Video must be ${maxVideoDuration} seconds or shorter.`);
          continue;
        }
        runningVideoCount += 1;
      } else {
        if (existingPhotoCount + runningPhotoCount >= maxImages) {
          setError(`You can attach up to ${maxImages} image${maxImages === 1 ? "" : "s"}.`);
          continue;
        }
        if (!imageFormats.includes(normalizeImageExt(ext))) { setError(`Images must be one of: ${imageFormats.join(", ")}.`); continue; }
        if (file.size > IMAGE_SIZE_MAX_BYTES) { setError(`Images must be under ${IMAGE_SIZE_MAX_BYTES / (1024 * 1024)}MB.`); continue; }
        runningPhotoCount += 1;
      }
      accepted.push({ file, previewUrl: URL.createObjectURL(file), mediaType: isVideo ? "video" : "photo" });
    }
    if (accepted.length > 0) setNewFiles((fs) => [...fs, ...accepted]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeExisting = (id) => setExistingMedia((m) => m.filter((x) => x.id !== id));
  const removeNew = (index) => setNewFiles((fs) => {
    URL.revokeObjectURL(fs[index].previewUrl);
    return fs.filter((_, i) => i !== index);
  });

  const submit = async () => {
    if (!rating) { setError("Please select a star rating."); return; }
    if (overLimit) { setError(`Your review must be ${maxLength} characters or fewer.`); return; }
    setBusy(true);
    setError("");
    try {
      const token = getUserToken();
      const fd = new FormData();
      fd.append("rating", rating);
      fd.append("body", body.trim());
      fd.append("keepMediaIds", JSON.stringify(existingMedia.map((m) => m.id)));
      newFiles.forEach((f) => fd.append("media", f.file));
      const { data } = await axios.post(`${API}/${masjidId}/reviews`, fd, { headers: { Authorization: `Bearer ${token}` } });
      onSaved(data.review);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save your review. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="msj-review-form">
      <StarRating value={rating} onChange={setRating} size={26} />
      <div className="msj-about-wrap">
        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share details of your own experience at this masjid…"
        />
        {settings?.speechToTextEnabled && (
          <MicButton onTranscript={(text) => setBody(text)} className="msj-about-mic" />
        )}
      </div>
      <div className={`msj-review-char-counter ${overLimit ? "over" : ""}`}>{body.length} / {maxLength}</div>

      {mediaEnabled && (
        <>
          <div
            className={`msj-review-dropzone ${dragOver ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" size={18} />
            <span>Drag photos/video here, or click to add</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
              multiple
              hidden
              onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {(existingMedia.length > 0 || newFiles.length > 0) && (
            <div className="msj-review-media-grid">
              {existingMedia.map((m) => (
                <div className="msj-review-media-thumb" key={`existing-${m.id}`}>
                  <MediaThumb src={`${API_ORIGIN}${m.url}`} mediaType={m.mediaType} videoProps={{ muted: true }} />
                  <button type="button" className="msj-review-media-remove" onClick={() => removeExisting(m.id)} aria-label="Remove">
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div className="msj-review-media-thumb" key={`new-${i}`}>
                  <MediaThumb src={f.previewUrl} mediaType={f.mediaType} videoProps={{ muted: true }} />
                  <button type="button" className="msj-review-media-remove" onClick={() => removeNew(i)} aria-label="Remove">
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {error && <p className="msj-review-form-error">{error}</p>}
      <div className="msj-review-form-actions">
        <button type="button" className="btn btn-outline-ink" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn-gold" onClick={submit} disabled={busy || overLimit}>
          {busy ? "Posting…" : existing ? "Update Review" : "Post Review"}
        </button>
      </div>
    </div>
  );
}

export default ReviewForm;
