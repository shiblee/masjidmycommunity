import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { Icon } from "../Icons.jsx";
import { getCroppedImageBlob } from "../../utils/cropImage.js";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_RAW_BYTES = 15 * 1024 * 1024;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

function validateFile(file) {
  if (!ACCEPTED_TYPES.has(file.type)) return "Please choose a JPG, PNG, or WEBP photo.";
  if (file.size > MAX_RAW_BYTES) return `That image is too large — please choose one under ${MAX_RAW_BYTES / (1024 * 1024)}MB.`;
  return null;
}

// Self-contained select → crop flow. `onSave(blob)` receives the final,
// standardized-size compressed JPEG; the caller owns the actual upload call
// (and therefore `saving`/`error` state), so this component never talks to
// the network itself — it only produces a Blob.
function PhotoEditorModal({ onClose, onSave, saving, error }) {
  const [step, setStep] = useState("select"); // "select" | "crop"
  const [localError, setLocalError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const browseInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const openFile = (file) => {
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError("");
    setImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setStep("crop");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    openFile(e.dataTransfer.files?.[0]);
  };

  const resetAdjustments = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const chooseDifferentPhoto = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setLocalError("");
    setStep("select");
  };

  const save = async () => {
    if (!croppedAreaPixels) return;
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, rotation);
      onSave(blob);
    } catch {
      setLocalError("Couldn't process this image. Please try a different photo.");
    }
  };

  // Portaled straight to <body> — this component is mounted deep inside
  // Profile.jsx's `.cw-side` column, which is `position:sticky` and
  // therefore establishes its own CSS stacking context. Without a portal,
  // this overlay's `position:fixed; z-index:1000` only wins stacking battles
  // *within* that context — the sibling right-hand `.cw-side` column (later
  // in DOM, same stacking priority) would paint entirely on top of it
  // regardless of z-index. Rendering at the document root sidesteps that.
  return createPortal(
    <div className="msj-modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="msj-modal msj-modal-wide photo-editor-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label="Close" disabled={saving}>
          <Icon name="x" size={16} />
        </button>
        <h3>Update Profile Photo</h3>

        {step === "select" && (
          <>
            <p className="msj-modal-sub">Upload a photo from your device, or take a new one.</p>
            <div
              className={`photo-dropzone${dragOver ? " drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <Icon name="imageIcon" size={30} />
              <p>Drag &amp; drop a photo here</p>
              <span>or choose an option below</span>
            </div>

            {(localError || error) && (
              <div className="auth-alert" style={{ marginTop: 14 }}>
                <Icon name="bulb" size={17} />
                {localError || error}
              </div>
            )}

            <div className="photo-editor-actions">
              <button type="button" className="btn btn-outline-ink" onClick={() => browseInputRef.current?.click()}>
                <Icon name="upload" size={16} /> Upload from Device
              </button>
              <button type="button" className="btn btn-outline-ink" onClick={() => cameraInputRef.current?.click()}>
                <Icon name="camera" size={16} /> Take Photo
              </button>
            </div>

            <input
              ref={browseInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              hidden
              onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }}
            />
          </>
        )}

        {step === "crop" && (
          <>
            <p className="msj-modal-sub">Drag to reposition, and use the controls below to zoom or rotate.</p>

            <div className="photo-crop-area">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>

            <div className="photo-crop-control">
              <span className="photo-crop-control-label">Zoom</span>
              <button type="button" className="profile-icon-btn" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}>
                <Icon name="minus" size={15} />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <button type="button" className="profile-icon-btn" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}>
                <Icon name="plus" size={15} />
              </button>
            </div>

            <div className="photo-crop-control">
              <span className="photo-crop-control-label">Rotate</span>
              <button type="button" className="profile-icon-btn" aria-label="Rotate left" onClick={() => setRotation((r) => r - 90)}>
                <Icon name="rotate" size={15} style={{ transform: "scaleX(-1)" }} />
              </button>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
              />
              <button type="button" className="profile-icon-btn" aria-label="Rotate right" onClick={() => setRotation((r) => r + 90)}>
                <Icon name="rotate" size={15} />
              </button>
            </div>

            {(localError || error) && (
              <div className="auth-alert" style={{ marginTop: 4 }}>
                <Icon name="bulb" size={17} />
                {localError || error}
              </div>
            )}

            <div className="photo-editor-actions photo-editor-actions-crop">
              <button type="button" className="profile-link-btn" onClick={resetAdjustments} disabled={saving}>
                Reset
              </button>
              <button type="button" className="profile-link-btn" onClick={chooseDifferentPhoto} disabled={saving}>
                Choose a different photo
              </button>
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-outline-ink" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn btn-gold" onClick={save} disabled={saving || !croppedAreaPixels}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default PhotoEditorModal;
