import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import MicButton from "../../components/MicButton.jsx";
import { API_BASE, API_ORIGIN } from "../../config.js";
import { getUserToken } from "../../utils/userAuthStorage.js";
import { formatDate } from "../../utils/formatDateTime.js";
import { locationOf, StarRating, directionsUrl } from "./exploreMasjidsShared.jsx";

const API = `${API_BASE}/masjids/public`;

const CORRECTION_FIELDS = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "location", label: "Location" },
  { key: "photos", label: "Photos" },
  { key: "contact", label: "Contact Details" },
  { key: "other", label: "Other" },
];
const CORRECTION_TEXT_MAX = 1000;
const CORRECTION_PHOTO_MAX = 5;

function HeartIcon({ filled, size = 20 }) {
  const path = "M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.8 4 5.2c2-1.2 4.4-.6 5.7 1 .7.8 1.4 1.8 2.3 1.8s1.6-1 2.3-1.8c1.3-1.6 3.7-2.2 5.7-1 2.6 1.6 3.2 4.9 1.3 7.7C18.7 16.65 12 21 12 21z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#C24B3F" : "none"} stroke={filled ? "#C24B3F" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

function ShareIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function emptyValueFor(fieldKey) {
  if (fieldKey === "contact") return { designation: "", name: "", mobile: "" };
  if (fieldKey === "photos") return { files: [], caption: "" };
  return { text: "" };
}

function CorrectionCard({ fieldKey, label, masjid, categories, designations, value, onChange, onRemove }) {
  const set = (patch) => onChange({ ...value, ...patch });

  const addPhotos = (fileList) => {
    const files = Array.from(fileList || []).slice(0, CORRECTION_PHOTO_MAX - value.files.length);
    const accepted = [];
    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) continue;
      if (file.size > IMAGE_SIZE_MAX_BYTES) continue;
      accepted.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    if (accepted.length) set({ files: [...value.files, ...accepted] });
  };

  const removePhoto = (i) => {
    URL.revokeObjectURL(value.files[i].previewUrl);
    set({ files: value.files.filter((_, idx) => idx !== i) });
  };

  let current;
  let suggestedInput;

  if (fieldKey === "name") {
    current = masjid.name || "Not set";
    suggestedInput = <input type="text" value={value.text} onChange={(e) => set({ text: e.target.value })} placeholder="Suggested name" maxLength={CORRECTION_TEXT_MAX} />;
  } else if (fieldKey === "category") {
    current = masjid.category || "Not set";
    suggestedInput = (
      <select value={value.text} onChange={(e) => set({ text: e.target.value })}>
        <option value="">Suggested category…</option>
        {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
      </select>
    );
  } else if (fieldKey === "location") {
    current = masjid.formattedAddress || masjid.address || "Not set";
    suggestedInput = <textarea rows={2} value={value.text} onChange={(e) => set({ text: e.target.value })} placeholder="Suggested location / landmark" maxLength={CORRECTION_TEXT_MAX} />;
  } else if (fieldKey === "contact") {
    current = masjid.imamName ? `Imam: ${masjid.imamName}` : "No contact on file";
    suggestedInput = (
      <div className="msj-correction-contact-inputs">
        <select value={value.designation} onChange={(e) => set({ designation: e.target.value })}>
          <option value="">Designation…</option>
          {designations.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <input type="text" value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" />
        <input type="tel" value={value.mobile} onChange={(e) => set({ mobile: e.target.value })} placeholder="Mobile number" />
      </div>
    );
  } else if (fieldKey === "photos") {
    current = masjid.coverPhotoUrl ? <MediaThumb src={`${API_ORIGIN}${masjid.coverPhotoUrl}`} className="msj-correction-current-photo" /> : "No photo yet";
    suggestedInput = (
      <div>
        <label className="msj-review-dropzone msj-correction-photo-dropzone">
          <Icon name="upload" size={16} />
          <span>Attach a photo</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
        </label>
        {value.files.length > 0 && (
          <div className="msj-review-media-grid">
            {value.files.map((f, i) => (
              <div className="msj-review-media-thumb" key={i}>
                <MediaThumb src={f.previewUrl} />
                <button type="button" className="msj-review-media-remove" onClick={() => removePhoto(i)} aria-label="Remove"><Icon name="x" size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <input type="text" value={value.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Caption (optional)" maxLength={CORRECTION_TEXT_MAX} style={{ marginTop: 10 }} />
      </div>
    );
  } else {
    current = null;
    suggestedInput = <textarea rows={3} value={value.text} onChange={(e) => set({ text: e.target.value })} placeholder="Describe the correction…" maxLength={CORRECTION_TEXT_MAX} />;
  }

  return (
    <div className="msj-correction-card">
      <div className="msj-correction-card-head">
        <strong>{label}</strong>
        <button type="button" className="msj-correction-remove" onClick={onRemove} aria-label={`Remove ${label}`}><Icon name="x" size={13} /></button>
      </div>
      {current !== null && (
        <div className="msj-correction-current">
          <span className="msj-correction-label">Current</span>
          {typeof current === "string" ? <span>{current}</span> : current}
        </div>
      )}
      <div className="msj-correction-suggested">
        <span className="msj-correction-label">Suggested</span>
        {suggestedInput}
      </div>
    </div>
  );
}

function SuggestEditForm({ masjid, onDone, onCancel }) {
  const masjidId = masjid.id;
  const [selected, setSelected] = useState([]);
  const [values, setValues] = useState({});
  const [categories, setCategories] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/categories`).then(({ data }) => setCategories(data.categories)).catch(() => {});
    axios.get(`${API}/contact-designations`).then(({ data }) => setDesignations(data.designations)).catch(() => {});
  }, []);

  const toggleField = (key) => {
    setSelected((s) => {
      if (s.includes(key)) return s.filter((k) => k !== key);
      return [...s, key];
    });
    setValues((v) => (v[key] ? v : { ...v, [key]: emptyValueFor(key) }));
  };

  const removeField = (key) => setSelected((s) => s.filter((k) => k !== key));

  const submit = async () => {
    if (selected.length === 0) { setError("Please select at least one field to correct."); return; }

    const payload = [];
    const photoFiles = [];
    for (const key of selected) {
      const v = values[key] || emptyValueFor(key);
      if (key === "contact") {
        if (!v.designation || !v.name.trim() || !v.mobile.trim()) { setError("Please fill in designation, name, and mobile number for the contact suggestion."); return; }
        payload.push({ fieldKey: key, suggestedValue: { designation: v.designation, name: v.name.trim(), mobile: v.mobile.trim() } });
      } else if (key === "photos") {
        if (v.files.length === 0) { setError("Please attach at least one photo."); return; }
        v.files.forEach((f) => photoFiles.push(f.file));
        payload.push({ fieldKey: key, suggestedValue: { caption: v.caption.trim() } });
      } else {
        if (!v.text.trim()) { setError(`Please enter a suggested value for ${CORRECTION_FIELDS.find((f) => f.key === key).label}.`); return; }
        payload.push({ fieldKey: key, suggestedValue: { text: v.text.trim() } });
      }
    }

    setBusy(true);
    setError("");
    try {
      const token = getUserToken();
      const fd = new FormData();
      fd.append("fields", JSON.stringify(payload));
      photoFiles.forEach((f) => fd.append("photos", f));
      await axios.post(`${API}/${masjidId}/suggest-edit`, fd, { headers: { Authorization: `Bearer ${token}` } });
      onDone();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your suggestion. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="msj-suggest-edit-form">
      <p className="msj-correction-intro">Select what needs to be corrected — you can pick more than one.</p>
      <div className="msj-correction-checklist">
        {CORRECTION_FIELDS.map((f) => (
          <label key={f.key} className="msj-correction-checkbox">
            <input type="checkbox" checked={selected.includes(f.key)} onChange={() => toggleField(f.key)} />
            {f.label}
          </label>
        ))}
      </div>

      {selected.map((key) => {
        const def = CORRECTION_FIELDS.find((f) => f.key === key);
        return (
          <CorrectionCard
            key={key}
            fieldKey={key}
            label={def.label}
            masjid={masjid}
            categories={categories}
            designations={designations}
            value={values[key] || emptyValueFor(key)}
            onChange={(next) => setValues((v) => ({ ...v, [key]: next }))}
            onRemove={() => removeField(key)}
          />
        );
      })}

      {error && <p className="msj-review-form-error">{error}</p>}
      <div className="msj-review-form-actions">
        <button type="button" className="btn btn-outline-ink" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="button" className="btn btn-gold" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Submit"}</button>
      </div>
    </div>
  );
}

// This app has no server-side video processing, so file size is checked
// client-side too and duration is checked *only* client-side, via reading
// the browser's own <video> metadata — see the plan's disclosed scope note.
const IMAGE_SIZE_MAX_BYTES = 5 * 1024 * 1024;

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

function ReviewRow({ review }) {
  const reviewer = review.reviewer;
  return (
    <div className="msj-review-row">
      <MediaThumb src={reviewer?.profilePhoto ? `${API_ORIGIN}${reviewer.profilePhoto}` : null} className="msj-review-avatar" />
      <div className="msj-review-row-body">
        <div className="msj-review-row-top">
          <strong>{reviewer?.fullName || "A Masjid My Community member"}</strong>
          <span className="msj-review-date">{formatDate(review.createdAt)}</span>
        </div>
        <StarRating value={review.rating} size={13} />
        {review.body && <p className="msj-review-body">{review.body}</p>}
        {review.media?.length > 0 && (
          <div className="msj-review-media-strip">
            {review.media.map((m) => (
              <MediaThumb key={m.id} src={`${API_ORIGIN}${m.url}`} mediaType={m.mediaType} className="msj-review-media-strip-thumb" videoProps={{ controls: true }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MasjidReviewModal({ masjid, initialTab = "overview", onClose }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestSent, setSuggestSent] = useState(false);
  const [reviewSettings, setReviewSettings] = useState(null);
  const loggedIn = !!getUserToken();

  useEffect(() => {
    axios.get(`${API}/review-settings`).then(({ data }) => setReviewSettings(data)).catch(() => {});
  }, []);

  const load = () => {
    axios
      .get(`${API}/${masjid.id}/reviews`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ average: 0, count: 0, breakdown: {}, reviews: [] }));
    if (loggedIn) {
      const token = getUserToken();
      axios
        .get(`${API}/${masjid.id}/reviews/mine`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setMyReview(data.review))
        .catch(() => {});
      axios
        .get(`${API}/${masjid.id}/favorite`, { headers: { Authorization: `Bearer ${token}` } })
        .then(({ data }) => setFavorited(data.favorited))
        .catch(() => {});
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [masjid.id]);

  const handleSaved = (review) => {
    setMyReview(review);
    setShowForm(false);
    load();
  };

  const toggleFavorite = async () => {
    if (!loggedIn) { navigate("/auth"); return; }
    setFavBusy(true);
    const token = getUserToken();
    try {
      if (favorited) {
        await axios.delete(`${API}/${masjid.id}/favorite`, { headers: { Authorization: `Bearer ${token}` } });
        setFavorited(false);
      } else {
        await axios.post(`${API}/${masjid.id}/favorite`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setFavorited(true);
      }
    } catch {
      // no-op — the button simply won't change state, safe to retry
    } finally {
      setFavBusy(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/masjid/${masjid.id}`;
    if (navigator.share) {
      navigator.share({ title: masjid.name, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareLabel("Link Copied!");
      setTimeout(() => setShareLabel("Share"), 2000);
    } catch {
      setShareLabel("Couldn't copy");
      setTimeout(() => setShareLabel("Share"), 2000);
    }
  };

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal msj-modal-wide msj-review-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>

        {tab === "overview" ? (
          <div className="msj-review-photo-wrap">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="msj-review-modal-photo" />
            {masjid.photoCount > 0 && (
              <Link to={`/masjid/${masjid.id}`} className="msj-review-see-photos">
                <Icon name="imageIcon" size={14} /> See Photos
              </Link>
            )}
          </div>
        ) : (
          <div className="msj-review-modal-header">
            <MediaThumb src={masjid.coverPhotoUrl ? `${API_ORIGIN}${masjid.coverPhotoUrl}` : null} className="msj-review-modal-cover" />
            <div>
              <h3>{masjid.name}</h3>
              <div className="msj-review-modal-rating">
                <StarRating value={data?.average || 0} size={16} />
                {data && <span>{data.average.toFixed(1)} ({data.count} review{data.count === 1 ? "" : "s"})</span>}
              </div>
              <p className="msj-list-loc"><Icon name="mapPin" size={13} /> {locationOf(masjid)}</p>
            </div>
          </div>
        )}

        {tab === "overview" && (
          <div className="msj-review-modal-titleblock">
            <h3>{masjid.name}</h3>
            <div className="msj-review-modal-rating">
              <StarRating value={data?.average || 0} size={16} />
              {data && <span>{data.average.toFixed(1)} ({data.count} review{data.count === 1 ? "" : "s"})</span>}
            </div>
            <p className="msj-list-loc"><Icon name="mapPin" size={13} /> {locationOf(masjid)}</p>
          </div>
        )}

        <div className="msj-review-tabs">
          <button type="button" className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>Overview</button>
          <button type="button" className={tab === "reviews" ? "active" : ""} onClick={() => setTab("reviews")}>Reviews</button>
          <button type="button" className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}>About</button>
        </div>

        {tab === "overview" && (
          <div className="msj-review-overview">
            <div className="msj-review-actions-row">
              {directionsUrl(masjid) ? (
                <a href={directionsUrl(masjid)} target="_blank" rel="noopener noreferrer" className="msj-review-action-btn">
                  <span className="msj-review-action-icon"><Icon name="compass" size={20} /></span>
                  Directions
                </a>
              ) : (
                <span className="msj-review-action-btn disabled" title="Location not set for this masjid">
                  <span className="msj-review-action-icon"><Icon name="compass" size={20} /></span>
                  Directions
                </span>
              )}
              <button type="button" className={`msj-review-action-btn ${favorited ? "active" : ""}`} onClick={toggleFavorite} disabled={favBusy}>
                <span className="msj-review-action-icon"><HeartIcon filled={favorited} /></span>
                {favorited ? "Liked" : "Like"}
              </button>
              <button type="button" className="msj-review-action-btn" onClick={handleShare}>
                <span className="msj-review-action-icon"><ShareIcon /></span>
                {shareLabel}
              </button>
            </div>

            {(masjid.formattedAddress || masjid.address) && (
              <p className="msj-review-address"><Icon name="mapPin" size={15} /> {masjid.formattedAddress || masjid.address}</p>
            )}

            <Link to={`/masjid/${masjid.id}`} className="btn btn-outline-ink msj-review-view-profile">View Full Profile</Link>

            <div className="msj-suggest-edit">
              {suggestSent ? (
                <p className="msj-suggest-edit-sent"><Icon name="check" size={15} /> Thanks! Your correction request has been sent for review.</p>
              ) : showSuggest ? (
                loggedIn ? (
                  <SuggestEditForm masjid={masjid} onDone={() => { setShowSuggest(false); setSuggestSent(true); }} onCancel={() => setShowSuggest(false)} />
                ) : (
                  <p className="msj-review-login-prompt"><Link to="/auth">Sign in</Link> to suggest an edit.</p>
                )
              ) : (
                <button type="button" className="msj-suggest-edit-link" onClick={() => setShowSuggest(true)}>Suggest an edit</button>
              )}
            </div>
          </div>
        )}

        {tab === "reviews" && (
          <div className="msj-review-list-panel">
            {data && data.count > 0 && (
              <div className="msj-rating-breakdown">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div className="msj-rating-breakdown-row" key={n}>
                    <span>{n}</span>
                    <div className="msj-rating-breakdown-track">
                      <div className="msj-rating-breakdown-fill" style={{ width: `${data.count ? (data.breakdown[n] / data.count) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!showForm && (
              loggedIn ? (
                <button type="button" className="btn btn-gold" onClick={() => setShowForm(true)}>
                  {myReview ? "Edit Your Review" : "Write a Review"}
                </button>
              ) : (
                <p className="msj-review-login-prompt"><Link to="/auth">Sign in</Link> to write a review.</p>
              )
            )}

            {showForm && (
              <ReviewForm masjidId={masjid.id} existing={myReview} settings={reviewSettings} onSaved={handleSaved} onCancel={() => setShowForm(false)} />
            )}

            <div className="msj-review-list">
              {data?.reviews.length === 0 && <p className="msj-review-empty">No reviews yet — be the first to share your experience.</p>}
              {data?.reviews.map((r) => <ReviewRow review={r} key={r.id} />)}
            </div>
          </div>
        )}

        {tab === "about" && (
          <div className="msj-review-about-panel">
            {masjid.tagline && <p className="msj-review-tagline">{masjid.tagline}</p>}
            {masjid.category && <span className="msj-category-badge">{masjid.category}</span>}
            {masjid.about ? (
              <>
                <h4 className="msj-review-about-heading">About the Masjid</h4>
                <p className="msj-review-about">{masjid.about}</p>
              </>
            ) : (
              <p className="msj-review-empty">No description added yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MasjidReviewModal;
