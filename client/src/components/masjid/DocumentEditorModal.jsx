import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import { Icon } from "../Icons.jsx";
import { getCroppedDocumentBlob } from "../../utils/cropDocument.js";
import { checkImageQuality } from "../../utils/imageQualityCheck.js";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const NON_IMAGE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

function validateFile(file, allowedFormats) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (allowedFormats?.length && !allowedFormats.includes(ext)) {
    return `This document type only accepts: ${allowedFormats.join(", ").toUpperCase()}.`;
  }
  if (!IMAGE_TYPES.has(file.type) && !NON_IMAGE_TYPES.has(file.type)) {
    return "Please choose a PDF, JPG, PNG, DOC, or DOCX file.";
  }
  return null;
}

// Adapted from components/profile/PhotoEditorModal.jsx for sensitive
// documents: a rectangular, free-aspect crop (not the profile photo's round
// 1:1) via the same already-installed react-easy-crop, plus a lightweight
// quality check and a "Fit to screen" reset. PDFs/DOC/DOCX skip the crop
// step entirely — there's nothing to visually adjust — and go straight to a
// filename/size preview. The original file is only handed to the caller
// once the user explicitly confirms, never before.
function DocumentEditorModal({ allowedFormats, onClose, onSave, saving, error }) {
  const [step, setStep] = useState("select"); // "select" | "crop" | "preview-file"
  const [localError, setLocalError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [rawFile, setRawFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [qualityWarnings, setQualityWarnings] = useState([]);

  const browseInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const openFile = (file) => {
    if (!file) return;
    const err = validateFile(file, allowedFormats);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError("");
    setRawFile(file);
    setQualityWarnings([]);

    if (IMAGE_TYPES.has(file.type)) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setStep("crop");
      checkImageQuality(url).then(setQualityWarnings);
    } else {
      setStep("preview-file");
    }
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

  const chooseDifferentFile = () => {
    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(null);
    setRawFile(null);
    setLocalError("");
    setStep("select");
  };

  const saveImage = async () => {
    if (!croppedAreaPixels) return;
    try {
      const blob = await getCroppedDocumentBlob(imageSrc, croppedAreaPixels, rotation);
      onSave(new File([blob], rawFile.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
    } catch {
      setLocalError("Couldn't process this image. Please try a different file.");
    }
  };

  const saveFile = () => onSave(rawFile);

  return createPortal(
    <div className="msj-modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="msj-modal msj-modal-wide photo-editor-modal doc-editor-modal" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label="Close" disabled={saving}>
          <Icon name="x" size={16} />
        </button>
        <h3>Upload Document</h3>

        {step === "select" && (
          <>
            <p className="msj-modal-sub">Upload a photo or scan of the document, or take a new photo.</p>
            <div
              className={`photo-dropzone${dragOver ? " drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <Icon name="fileText" size={30} />
              <p>Drag &amp; drop a file here</p>
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
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              hidden
              onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }}
            />
          </>
        )}

        {step === "crop" && (
          <>
            <p className="msj-modal-sub">Drag to reposition, then crop, zoom, or rotate so the whole document is visible.</p>

            <div className="photo-crop-area doc-crop-area">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                cropShape="rect"
                showGrid
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
              <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              <button type="button" className="profile-icon-btn" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}>
                <Icon name="plus" size={15} />
              </button>
            </div>

            <div className="photo-crop-control">
              <span className="photo-crop-control-label">Rotate</span>
              <button type="button" className="profile-icon-btn" aria-label="Rotate left" onClick={() => setRotation((r) => r - 90)}>
                <Icon name="rotate" size={15} style={{ transform: "scaleX(-1)" }} />
              </button>
              <input type="range" min={-180} max={180} step={1} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} />
              <button type="button" className="profile-icon-btn" aria-label="Rotate right" onClick={() => setRotation((r) => r + 90)}>
                <Icon name="rotate" size={15} />
              </button>
            </div>

            {qualityWarnings.map((w) => (
              <div className="auth-alert" key={w} style={{ marginTop: 4 }}>
                <Icon name="bulb" size={17} />
                {w}
              </div>
            ))}
            {(localError || error) && (
              <div className="auth-alert" style={{ marginTop: 4 }}>
                <Icon name="bulb" size={17} />
                {localError || error}
              </div>
            )}

            <p className="msj-modal-sub" style={{ marginTop: 10 }}>
              For faster verification, make sure the entire document is visible, readable, and not blurred.
            </p>

            <div className="photo-editor-actions photo-editor-actions-crop">
              <button type="button" className="profile-link-btn" onClick={resetAdjustments} disabled={saving}>Fit to Screen / Reset</button>
              <button type="button" className="profile-link-btn" onClick={chooseDifferentFile} disabled={saving}>Choose a different file</button>
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-outline-ink" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-gold" onClick={saveImage} disabled={saving || !croppedAreaPixels}>
                {saving ? "Uploading…" : "Confirm & Upload"}
              </button>
            </div>
          </>
        )}

        {step === "preview-file" && rawFile && (
          <>
            <p className="msj-modal-sub">This file type can't be visually cropped — review the details below before uploading.</p>
            <div className="doc-file-preview">
              <Icon name="fileText" size={26} />
              <div>
                <strong>{rawFile.name}</strong>
                <span>{(rawFile.size / 1024).toFixed(0)} KB</span>
              </div>
            </div>

            {(localError || error) && (
              <div className="auth-alert" style={{ marginTop: 14 }}>
                <Icon name="bulb" size={17} />
                {localError || error}
              </div>
            )}

            <div className="photo-editor-actions photo-editor-actions-crop">
              <button type="button" className="profile-link-btn" onClick={chooseDifferentFile} disabled={saving}>Choose a different file</button>
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-outline-ink" onClick={onClose} disabled={saving}>Cancel</button>
              <button type="button" className="btn btn-gold" onClick={saveFile} disabled={saving}>
                {saving ? "Uploading…" : "Confirm & Upload"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default DocumentEditorModal;
