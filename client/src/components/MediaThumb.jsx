import React, { useState } from "react";
import { Icon } from "./Icons.jsx";
import GeometricPattern from "./GeometricPattern.jsx";

/**
 * Renders a masjid photo/video with a graceful fallback — if the file 404s,
 * is unreachable, or is still processing, this shows a branded placeholder
 * (the same girih lattice used on the auth page) instead of the browser's
 * broken-image glyph.
 */
function MediaThumb({ src, poster, mediaType = "photo", alt = "", className, style, videoProps }) {
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
    // `poster` is a real frame extracted server-side at upload time (see
    // server/src/utils/videoThumbnail.js) — pass it whenever the caller has
    // one and the browser shows it immediately, no decoding required. Only
    // videos uploaded before that existed have no poster; for those, fall
    // back to nudging currentTime forward once a frame has loaded, which
    // works in most (not all) browsers.
    return (
      <video
        src={src}
        poster={poster || undefined}
        preload={poster ? "metadata" : "auto"}
        className={className}
        style={style}
        onError={() => setFailed(true)}
        onLoadedData={
          poster
            ? undefined
            : (e) => {
                const el = e.currentTarget;
                if (el.currentTime === 0) {
                  try { el.currentTime = 0.1; } catch {}
                }
              }
        }
        {...videoProps}
      />
    );
  }

  return <img src={src} alt={alt} className={className} style={style} onError={() => setFailed(true)} />;
}

export default MediaThumb;
