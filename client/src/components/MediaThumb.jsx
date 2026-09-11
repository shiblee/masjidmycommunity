import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons.jsx";
import GeometricPattern from "./GeometricPattern.jsx";

// Viewport-based autoplay, shared by every video MediaThumb renders
// anywhere in the app (Community Wall posts, masjid/campaign galleries,
// review media, wizard previews, ...) — one implementation instead of each
// page reinventing scroll-driven play/pause. Muted-by-default satisfies
// browser autoplay policy; a native volume control is available whenever
// the caller renders real `controls`.
//
// Deliberately stateless across visibility transitions: leaving the
// viewport always stops AND rewinds to 0:00 (never plays in the background,
// never just pauses in place), and re-entering always restarts from 0:00 —
// a prior manual pause does not carry over into the next time the video
// becomes visible, per the "visible = play from beginning" rule. A manual
// pause is still respected while the video stays visible, since nothing
// here re-triggers on its own without a visibility change.
function useAutoplayOnVisible(videoRef, enabled) {
  useEffect(() => {
    if (!enabled) return;
    const el = videoRef.current;
    if (!el) return;

    // React's `muted` JSX attribute doesn't always reliably sync to the
    // DOM property on first render (a long-standing React quirk) -- set it
    // imperatively once so autoplay (which browsers only allow when
    // actually muted) doesn't silently fail.
    el.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.currentTime = 0;
          const p = el.play();
          if (p?.catch) p.catch(() => {});
        } else {
          el.pause();
          el.currentTime = 0;
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [videoRef, enabled]);
}

/**
 * Renders a masjid photo/video with a graceful fallback — if the file 404s,
 * is unreachable, or is still processing, this shows a branded placeholder
 * (the same girih lattice used on the auth page) instead of the browser's
 * broken-image glyph.
 */
function MediaThumb({ src, poster, mediaType = "photo", alt = "", className, style, videoProps, autoPlayOnVisible = true }) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef(null);
  useAutoplayOnVisible(videoRef, mediaType === "video" && autoPlayOnVisible && !failed);

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
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        muted
        playsInline
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
