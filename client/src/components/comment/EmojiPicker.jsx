import React from "react";
import ComposerPopover from "./ComposerPopover.jsx";

// A flat, curated grid of commonly-used emoji — no library/network call, so
// it's always available regardless of any external service configuration.
const EMOJI = [
  "😀", "😂", "🥰", "😍", "😊", "😉", "😎", "🤔",
  "😢", "😭", "😡", "😮", "👍", "👎", "🙏", "👏",
  "💪", "🤲", "❤️", "🧡", "💚", "💙", "💜", "🔥",
  "✨", "🎉", "🎊", "🥳", "👌", "🤝", "💯", "🌸",
  "🌙", "🕌", "⭐", "☀️",
];

function EmojiPicker({ open, onClose, anchorRef, onPick }) {
  return (
    <ComposerPopover open={open} onClose={onClose} anchorRef={anchorRef} width={272} className="cmt-emoji-popover">
      <div className="cmt-emoji-grid">
        {EMOJI.map((e) => (
          <button type="button" key={e} className="cmt-emoji-item" onClick={() => onPick(e)}>{e}</button>
        ))}
      </div>
    </ComposerPopover>
  );
}

export default EmojiPicker;
