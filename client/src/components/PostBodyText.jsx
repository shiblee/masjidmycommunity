import React from "react";
import { Link } from "react-router-dom";

// Renders a Wall post's text, turning `@[...]` mention tokens (inserted by
// the composer's @ autocomplete) into links, and `#hashtag` into a
// click-to-filter button — the same syntax the composer writes into the
// stored body, so no separate mentions/hashtags table is needed.
//
// Two mention token shapes exist:
//   `@[masjid:<id>:<name>]` / `@[campaign:<slug>:<title>]` — links straight
//   to that masjid/campaign's profile page.
//   `@[City]` — the older, plain community-city mention format from before
//   entity mentions existed; kept working for posts written before this.
const TOKEN_RE = /(@\[[^\]]+\]|#\w+)/g;

function PostBodyText({ text, onHashtagClick }) {
  if (!text) return null;
  const parts = text.split(TOKEN_RE);

  return (
    <>
      {parts.map((part, i) => {
        const mentionMatch = /^@\[([^\]]+)\]$/.exec(part);
        if (mentionMatch) {
          const inner = mentionMatch[1];
          const bits = inner.split(":");
          if (bits.length >= 3 && bits[0] === "masjid") {
            const [, id, ...rest] = bits;
            return (
              <Link key={i} to={`/masjid/${id}`} className="cw-mention">
                @{rest.join(":")}
              </Link>
            );
          }
          if (bits.length >= 3 && bits[0] === "campaign") {
            const [, slug, ...rest] = bits;
            return (
              <Link key={i} to={`/campaign/${slug}`} className="cw-mention">
                @{rest.join(":")}
              </Link>
            );
          }
          const city = inner;
          return (
            <Link key={i} to={`/explore-masjids?city=${encodeURIComponent(city)}`} className="cw-mention">
              @{city} Community
            </Link>
          );
        }
        if (/^#\w+$/.test(part)) {
          return (
            <button key={i} type="button" className="cw-hashtag" onClick={() => onHashtagClick?.(part.slice(1))}>
              {part}
            </button>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export default PostBodyText;
