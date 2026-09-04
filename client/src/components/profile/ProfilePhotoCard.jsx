import React, { useState } from "react";
import { Icon } from "../Icons.jsx";
import userApi from "../../services/userApi.js";
import adminApi from "../../admin/services/adminApi.js";
import { API_ORIGIN } from "../../config.js";
import PhotoEditorModal from "./PhotoEditorModal.jsx";

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function editConfig(mode, targetUserId) {
  return mode === "admin" ? { client: adminApi, base: `/users/${targetUserId}` } : { client: userApi, base: "/me" };
}

// mode: "self" (owner editing their own profile) or "admin" (admin managing
// a user's photo on their behalf) — both get full add/change/remove rights
// via a single pencil badge on the avatar itself, which opens the crop
// editor; there's no separate "Upload Photo" button or card chrome — this
// renders just the avatar in place, wherever the caller puts it.
function ProfilePhotoCard({ user, onUserUpdated, mode = "self", targetUserId }) {
  const { client, base } = editConfig(mode, targetUserId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  const saveCroppedPhoto = async (blob) => {
    setError("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("photo", blob, "profile-photo.jpg");
      const { data } = await client.post(`${base}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      onUserUpdated(data.user);
      setEditorOpen(false);
      showToast("Profile photo updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't upload that photo.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await client.delete(`${base}/photo`);
      onUserUpdated(data.user);
      showToast("Profile photo removed.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't remove this photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-photo-inline">
      <div className="profile-avatar-wrap profile-avatar-wrap-edit">
        {user.profilePhoto ? (
          <img className="profile-avatar-img" src={`${API_ORIGIN}${user.profilePhoto}`} alt={user.fullName} />
        ) : (
          <div className="acct-avatar profile-avatar-fallback">{initialsOf(user.fullName)}</div>
        )}
        <button
          type="button"
          className="profile-avatar-edit-btn"
          aria-label="Update profile photo"
          title="Update profile photo"
          disabled={busy}
          onClick={() => setEditorOpen(true)}
        >
          <Icon name="edit" size={14} />
        </button>
      </div>

      {user.profilePhoto && (
        <button type="button" className="profile-link-btn" disabled={busy} onClick={remove}>
          Remove Photo
        </button>
      )}

      {error && <span className="auth-field-error">{error}</span>}
      {toast && <div className="acct-toast"><Icon name="check" size={16} />{toast}</div>}

      {editorOpen && (
        <PhotoEditorModal
          onClose={() => { if (!busy) setEditorOpen(false); }}
          onSave={saveCroppedPhoto}
          saving={busy}
          error={error}
        />
      )}
    </div>
  );
}

export default ProfilePhotoCard;
