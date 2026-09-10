import React, { useEffect, useState } from "react";
import communityApi from "../../services/communityApi.js";
import { Icon } from "../Icons.jsx";
import ComposerPopover from "./ComposerPopover.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// Shared search-and-grid picker for both GIF and Sticker — both are backed
// by GIPHY's sibling /gifs and /stickers endpoints via
// server/src/services/gifService.js, so they only differ in which endpoint
// they hit and their copy. `configured:false` (rather than an error) is how
// the server says the feature isn't wired up yet, so this shows an honest
// unavailable state instead of a broken search.
function MediaPicker({ open, onClose, anchorRef, onPick, endpoint, resultsKey, searchPlaceholder, emptyText, unavailableText, className }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [items, setItems] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQ("");
    setItems(null);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      communityApi
        .get(endpoint, { params: { q: q || undefined } })
        .then(({ data }) => {
          setConfigured(data.configured);
          setItems(data[resultsKey]);
        })
        .catch(() => setError(t("commentSection.media.loadError", "Couldn't load results.")));
    }, q ? 350 : 0);
    return () => clearTimeout(handle);
  }, [q, open, endpoint, resultsKey, t]);

  return (
    <ComposerPopover open={open} onClose={onClose} anchorRef={anchorRef} width={320} className={className}>
      {configured === false ? (
        <p className="cmt-picker-empty">{unavailableText}</p>
      ) : (
        <>
          <div className="cmt-gif-search">
            <Icon name="search" size={13} />
            <input type="text" autoFocus placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {error && <p className="cmt-picker-empty">{error}</p>}
          {!error && items === null && <p className="cmt-picker-empty">{t("commentSection.media.loading", "Loading…")}</p>}
          {!error && items?.length === 0 && <p className="cmt-picker-empty">{emptyText}</p>}
          {items?.length > 0 && (
            <div className="cmt-gif-grid">
              {items.map((g) => (
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

export default MediaPicker;
