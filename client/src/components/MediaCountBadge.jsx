import React from "react";
import { Icon } from "./Icons.jsx";

/** Small "12 photos · 4 videos" overlay badge shown on cover images across Grid/List/Map views. */
function MediaCountBadge({ photoCount, videoCount }) {
  if (!photoCount && !videoCount) return null;
  return (
    <span className="msj-media-badge">
      {photoCount > 0 && <span><Icon name="imageIcon" size={12} /> {photoCount}</span>}
      {videoCount > 0 && <span><Icon name="play" size={12} /> {videoCount}</span>}
    </span>
  );
}

export default MediaCountBadge;
