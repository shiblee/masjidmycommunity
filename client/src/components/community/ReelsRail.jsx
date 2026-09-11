import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import MediaThumb from "../MediaThumb.jsx";
import communityApi from "../../services/communityApi.js";
import { API_ORIGIN } from "../../config.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const REEL_MAX_DURATION_SECONDS = 90;
const RAIL_LIMIT = 6;

// Client-side pre-check so a user finds out their video is too long before
// waiting through a full upload -- the server enforces the real cap
// (server/src/utils/videoDuration.js) regardless, this is just a faster
// no.
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

function UploadReelModal({ user, onClose, onUploaded }) {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const pickFile = async (e) => {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError("");
    const duration = await readVideoDuration(picked);
    if (duration != null && duration > REEL_MAX_DURATION_SECONDS) {
      setError(t("reels.upload.tooLong", "Reels must be {max} seconds or shorter (this video is {actual}s).").replace("{max}", REEL_MAX_DURATION_SECONDS).replace("{actual}", Math.round(duration)));
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("video", file);
      if (body.trim()) form.append("body", body.trim());
      const { data } = await communityApi.post("/reels", form);
      onUploaded(data.activity);
    } catch (err) {
      setError(err.response?.data?.message || t("reels.upload.errorPublish", "Couldn't upload your Reel. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        <h3>{t("reels.upload.heading", "Upload a Reel")}</h3>

        {!file ? (
          <button type="button" className="cw-composer-tool" style={{ width: "100%", justifyContent: "center", padding: "28px 16px" }} onClick={() => fileInputRef.current?.click()}>
            <Icon name="upload" size={20} /> {t("reels.upload.pickVideo", "Choose a video")}
          </button>
        ) : (
          <div className="cw-composer-video-preview">
            <video src={previewUrl} controls />
            <button type="button" onClick={() => { setFile(null); setPreviewUrl(null); }} aria-label="Remove video"><Icon name="x" size={13} /></button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={pickFile} />

        <textarea
          className="cw-reel-caption"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("reels.upload.captionPlaceholder", "Add a caption, hashtags…")}
          style={{ width: "100%", marginTop: 14 }}
        />

        {error && <div className="auth-alert" style={{ marginTop: 12 }}><Icon name="info" size={17} />{error}</div>}

        <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} disabled={!file || uploading} onClick={submit}>
          {uploading ? t("reels.upload.uploading", "Uploading…") : t("reels.upload.submit", "Post Reel")}
        </button>
      </div>
    </div>
  );
}

function ReelsRail({ user }) {
  const { t } = useTranslation();
  const [reels, setReels] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const load = () => {
    communityApi.get("/reels", { params: { limit: RAIL_LIMIT } }).then(({ data }) => setReels(data.reels || [])).catch(() => setReels([]));
  };

  useEffect(() => { load(); }, []);

  const handleUploaded = (activity) => {
    setUploadOpen(false);
    setReels((prev) => [activity, ...(prev || [])].slice(0, RAIL_LIMIT));
  };

  return (
    <div className="cw-reels-rail">
      <div className="cw-reels-rail-head">
        <h4><Icon name="play" size={15} /> {t("reels.rail.heading", "Reels")}</h4>
        <div className="cw-reels-rail-actions">
          {user && (
            <button type="button" className="cw-reels-upload-btn" onClick={() => setUploadOpen(true)}>
              <Icon name="upload" size={14} /> {t("reels.rail.upload", "Upload Reel")}
            </button>
          )}
          <Link to="/reels" className="cw-side-link">{t("reels.rail.viewAll", "View All")} <span className="btn-arrow">→</span></Link>
        </div>
      </div>

      {reels === null ? (
        <p className="msj-note">{t("reels.rail.loading", "Loading…")}</p>
      ) : reels.length === 0 ? (
        <div className="cw-reels-empty">
          <Icon name="play" size={22} />
          <span>{t("reels.rail.empty", "No Reels yet — be the first to share one!")}</span>
        </div>
      ) : (
        <div className="cw-reels-scroll">
          {reels.map((r) => (
            <Link to="/reels" className="cw-reel-tile" key={r.id}>
              <MediaThumb
                src={`${API_ORIGIN}${r.mediaVideoUrl}`}
                poster={r.mediaVideoPosterUrl ? `${API_ORIGIN}${r.mediaVideoPosterUrl}` : undefined}
                mediaType="video"
              />
              {r.author?.fullName && <span className="cw-reel-tile-author">{r.author.fullName}</span>}
            </Link>
          ))}
        </div>
      )}

      {uploadOpen && <UploadReelModal user={user} onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />}
    </div>
  );
}

export default ReelsRail;
