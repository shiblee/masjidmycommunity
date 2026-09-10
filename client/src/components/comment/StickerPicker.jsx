import React from "react";
import ComposerPopover from "./ComposerPopover.jsx";

// A small built-in "sticker" set — larger, more expressive emoji (some
// paired) rendered as big tappable tiles and sent immediately, the same
// tap-to-send convention chat apps use for real sticker packs. Pure Unicode,
// so it works with zero external service or asset pipeline.
const STICKERS = [
  "🎉🎉", "❤️", "😂", "👍👍", "🔥", "🙏", "😍", "😢",
  "😮", "👏👏", "🕌", "🌙", "⭐", "💚", "🤲", "✅",
  "🥳", "😎", "💯", "🤝", "📿", "🌸", "☀️", "🎊",
];

function StickerPicker({ open, onClose, anchorRef, onPick }) {
  return (
    <ComposerPopover open={open} onClose={onClose} anchorRef={anchorRef} width={300} className="cmt-sticker-popover">
      <div className="cmt-sticker-grid">
        {STICKERS.map((s) => (
          <button type="button" key={s} className="cmt-sticker-item" onClick={() => onPick(s)}>{s}</button>
        ))}
      </div>
    </ComposerPopover>
  );
}

export default StickerPicker;
