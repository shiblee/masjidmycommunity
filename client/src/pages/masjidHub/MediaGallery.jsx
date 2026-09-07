import React, { useEffect, useState } from "react";
import { Icon } from "../../components/Icons.jsx";
import MediaThumb from "../../components/MediaThumb.jsx";
import { API_ORIGIN } from "../../config.js";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "photo", label: "Photos" },
  { key: "video", label: "Videos" },
];

function Lightbox({ items, index, onClose, onPrev, onNext }) {
  const item = items[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  if (!item) return null;

  return (
    <div className="msj-lightbox-overlay" onClick={onClose}>
      <button type="button" className="msj-lightbox-close" onClick={onClose} aria-label="Close"><Icon name="x" size={20} /></button>
      {items.length > 1 && (
        <button type="button" className="msj-lightbox-nav prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous">
          <Icon name="chevronLeft" size={22} />
        </button>
      )}
      <div className="msj-lightbox-stage" onClick={(e) => e.stopPropagation()}>
        {item.mediaType === "video" ? (
          <video src={`${API_ORIGIN}${item.url}`} poster={item.posterUrl ? `${API_ORIGIN}${item.posterUrl}` : undefined} controls autoPlay className="msj-lightbox-media" />
        ) : (
          <img src={`${API_ORIGIN}${item.url}`} alt={item.caption || ""} className="msj-lightbox-media" />
        )}
        {item.caption && <p className="msj-lightbox-caption">{item.caption}</p>}
      </div>
      {items.length > 1 && (
        <button type="button" className="msj-lightbox-nav next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next">
          <Icon name="chevronRight" size={22} />
        </button>
      )}
    </div>
  );
}

function MediaGallery({ photos }) {
  const [filter, setFilter] = useState("all");
  const [openIndex, setOpenIndex] = useState(null);

  const filtered = photos.filter((p) => filter === "all" || p.mediaType === filter);
  const photoCount = photos.filter((p) => p.mediaType === "photo").length;
  const videoCount = photos.filter((p) => p.mediaType === "video").length;

  if (photos.length === 0) {
    return (
      <div className="msj-hub-coming-soon">
        <Icon name="imageIcon" size={26} />
        <strong>No media yet</strong>
        <span>Photos and videos added to this masjid will appear here.</span>
      </div>
    );
  }

  return (
    <div className="msj-hub-media">
      <div className="msj-hub-media-filters">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={filter === f.key ? "active" : ""} onClick={() => setFilter(f.key)}>
            {f.label}
            {f.key === "photo" && ` (${photoCount})`}
            {f.key === "video" && ` (${videoCount})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="msj-review-empty">No {filter === "photo" ? "photos" : "videos"} yet.</p>
      ) : (
        <div className="msj-hub-media-grid">
          {filtered.map((p, i) => (
            <button type="button" key={p.id} className="msj-hub-media-tile" onClick={() => setOpenIndex(i)}>
              <MediaThumb src={`${API_ORIGIN}${p.url}`} poster={p.posterUrl ? `${API_ORIGIN}${p.posterUrl}` : undefined} mediaType={p.mediaType} />
              {p.mediaType === "video" && <span className="msj-hub-media-play"><Icon name="play" size={18} /></span>}
            </button>
          ))}
        </div>
      )}

      {openIndex !== null && (
        <Lightbox
          items={filtered}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onPrev={() => setOpenIndex((i) => (i - 1 + filtered.length) % filtered.length)}
          onNext={() => setOpenIndex((i) => (i + 1) % filtered.length)}
        />
      )}
    </div>
  );
}

export default MediaGallery;
