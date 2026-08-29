import React, { useRef, useState } from "react";
import { Icon } from "../Icons.jsx";
import userApi from "../../services/userApi.js";
import { API_ORIGIN } from "../../config.js";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function ProfilePhotoCard({ user, onUserUpdated }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pickFile = () => inputRef.current?.click();

  const upload = async (file) => {
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Only JPG, PNG, or WEBP photos are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`Photos must be under ${MAX_BYTES / (1024 * 1024)}MB.`);
      return;
    }
    setError("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const { data } = await userApi.post("/me/photo", formData, { headers: { "Content-Type": "multipart/form-data" } });
      onUserUpdated(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload that photo.");
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) upload(file);
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await userApi.delete("/me/photo");
      onUserUpdated(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't remove your photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card profile-card profile-photo-card">
      <div className="profile-avatar-wrap">
        {user.profilePhoto ? (
          <img className="profile-avatar-img" src={`${API_ORIGIN}${user.profilePhoto}`} alt={user.fullName} />
        ) : (
          <div className="acct-avatar profile-avatar-fallback">{initialsOf(user.fullName)}</div>
        )}
      </div>
      <div className="profile-photo-actions">
        <button type="button" className="btn btn-outline-ink" disabled={busy} onClick={pickFile}>
          <Icon name="camera" size={15} /> {user.profilePhoto ? "Change Photo" : "Upload Photo"}
        </button>
        {user.profilePhoto && (
          <button type="button" className="profile-link-btn" disabled={busy} onClick={remove}>
            Remove
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFileChange} />
      </div>
      {error && <span className="auth-field-error">{error}</span>}
    </div>
  );
}

export default ProfilePhotoCard;
