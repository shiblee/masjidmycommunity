import React, { useState } from "react";
import { Icon } from "./Icons.jsx";
import GeometricPattern from "./GeometricPattern.jsx";

/**
 * Renders a masjid photo/video with a graceful fallback — if the file 404s,
 * is unreachable, or is still processing, this shows a branded placeholder
 * (the same girih lattice used on the auth page) instead of the browser's
 * broken-image glyph.
 */
function MediaThumb({ src, mediaType = "photo", alt = "", className, style, videoProps }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className={`msj-media-fallback ${className || ""}`} style={style}>
        <GeometricPattern className="msj-media-fallback-pattern" />
        <Icon name="mosque" size={30} />
      </div>
    );
  }

  if (mediaType === "video") {
    // Without a poster image (none is generated at upload time), a <video>
    // paints as a blank black frame until playback starts. preload="auto"
    // (not just "metadata") makes the browser actually fetch frame data up
    // front, and nudging currentTime forward a hair once that data has
    // loaded forces it to decode and paint that frame as a resting
    // thumbnail — still paused, nothing autoplays.
    return (
      <video
        src={src}
        preload="auto"
        className={className}
        style={style}
        onError={() => setFailed(true)}
        onLoadedData={(e) => {
          const el = e.currentTarget;
          if (el.currentTime === 0) {
            try { el.currentTime = 0.1; } catch {}
          }
        }}
        {...videoProps}
      />
    );
  }

  return <img src={src} alt={alt} className={className} style={style} onError={() => setFailed(true)} />;
}

export default MediaThumb;
