import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import communityApi from "../services/communityApi.js";
import { Icon } from "./Icons.jsx";
import MentionTextarea from "./MentionTextarea.jsx";
import { API_ORIGIN } from "../config.js";

function initialsOf(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

function PostComposer({ user, onPosted, maxLength = 2000 }) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState([]); // [{file, previewUrl}]
  const [video, setVideo] = useState(null); // {file, previewUrl}
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  useEffect(() => () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    if (video) URL.revokeObjectURL(video.previewUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) {
    return (
      <div className="cw-composer cw-composer-guest">
        <p>Sign in to share an update with the community.</p>
        <Link to="/auth" className="btn btn-gold">Sign In</Link>
      </div>
    );
  }

  const onPickImages = (e) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))].slice(0, 5));
    e.target.value = "";
  };

  const onPickVideo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo({ file, previewUrl: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeVideo = () => {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  };

  const overLimit = body.length > maxLength;
  const canPublish = (body.trim() || images.length || video) && !posting && !overLimit;

  const publish = async () => {
    if (!canPublish) return;
    setPosting(true);
    setError("");
    try {
      const form = new FormData();
      if (body.trim()) form.append("body", body.trim());
      images.forEach((i) => form.append("media", i.file));
      if (video) form.append("media", video.file);

      const { data } = await communityApi.post("/posts", form);
      onPosted(data.activity);

      setBody("");
      images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      setImages([]);
      if (video) URL.revokeObjectURL(video.previewUrl);
      setVideo(null);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't publish your post. Please try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="cw-composer">
      <div className="cw-composer-head">
        {user.profilePhoto ? (
          <img className="cw-composer-avatar cw-composer-avatar-photo" src={`${API_ORIGIN}${user.profilePhoto}`} alt={user.fullName} />
        ) : (
          <div className="cw-composer-avatar">{initialsOf(user.fullName)}</div>
        )}
        <strong>{user.fullName}</strong>
      </div>

      <label className="cw-composer-prompt" htmlFor="wall-composer-textarea">What would you like to share with the community?</label>
      <MentionTextarea
        id="wall-composer-textarea"
        rows={3}
        placeholder="What's happening in your community? Type @ to mention a masjid or campaign."
        value={body}
        onChange={setBody}
      />

      {images.length > 0 && (
        <div className="cw-composer-media-grid">
          {images.map((img, i) => (
            <div className="cw-composer-media-item" key={i}>
              <img src={img.previewUrl} alt="" />
              <button type="button" onClick={() => removeImage(i)} aria-label="Remove image"><Icon name="x" size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {video && (
        <div className="cw-composer-video-preview">
          <video src={video.previewUrl} controls />
          <button type="button" onClick={removeVideo} aria-label="Remove video"><Icon name="x" size={13} /></button>
        </div>
      )}

      {error && <div className="auth-alert" style={{ marginTop: 12 }}><Icon name="info" size={17} />{error}</div>}

      <div className="cw-composer-actions">
        <div className="cw-composer-tools">
          <button type="button" className="cw-composer-tool" onClick={() => imageInputRef.current?.click()}>
            <Icon name="imageIcon" size={16} /> Image
          </button>
          <button type="button" className="cw-composer-tool" onClick={() => videoInputRef.current?.click()} disabled={!!video}>
            <Icon name="play" size={16} /> Video
          </button>
        </div>
        <button type="button" className="btn btn-gold" disabled={!canPublish} onClick={publish}>
          {posting ? "Publishing…" : "Publish"}
        </button>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" multiple hidden onChange={onPickImages} />
      <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={onPickVideo} />
    </div>
  );
}

export default PostComposer;
