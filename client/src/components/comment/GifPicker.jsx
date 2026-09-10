import React, { useEffect, useState } from "react";
import communityApi from "../../services/communityApi.js";
import { Icon } from "../Icons.jsx";
import ComposerPopover from "./ComposerPopover.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// Backed by server/src/services/gifService.js (GIPHY) — `configured:false`
// (rather than an error) is how the server says the feature isn't wired up
// yet, so this shows an honest unavailable state instead of a broken search.
function GifPicker({ open, onClose, anchorRef, onPick }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [gifs, setGifs] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    setGifs(null);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      communityApi
        .get("/gifs", { params: { q: q || undefined } })
        .then(({ data }) => {
          setConfigured(data.configured);
          setGifs(data.gifs);
        })
        .catch(() => setError(t("commentSection.gif.loadError", "Couldn't load GIFs.")));
    }, q ? 350 : 0);
    return () => clearTimeout(handle);
  }, [q, open, t]);

  return (
    <ComposerPopover open={open} onClose={onClose} anchorRef={anchorRef} width={320} className="cmt-gif-popover">
      {configured === false ? (
        <p className="cmt-picker-empty">{t("commentSection.gif.unavailable", "GIF search isn't set up yet.")}</p>
      ) : (
        <>
          <div className="cmt-gif-search">
            <Icon name="search" size={13} />
            <input
              type="text"
              autoFocus
              placeholder={t("commentSection.gif.searchPlaceholder", "Search GIFs…")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {error && <p className="cmt-picker-empty">{error}</p>}
          {!error && gifs === null && <p className="cmt-picker-empty">{t("commentSection.gif.loading", "Loading…")}</p>}
          {!error && gifs?.length === 0 && <p className="cmt-picker-empty">{t("commentSection.gif.empty", "No GIFs found.")}</p>}
          {gifs?.length > 0 && (
            <div className="cmt-gif-grid">
              {gifs.map((g) => (
                <button type="button" key={g.id} className="cmt-gif-item" onClick={() => onPick(g)}>
                  <img src={g.previewUrl} alt={g.alt} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </ComposerPopover>
  );
}

export default GifPicker;
