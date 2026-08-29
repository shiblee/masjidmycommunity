import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config.js";

const MENTION_TOKEN_RE = /@\[([^\]]+)\]/g;

function labelForToken(inner) {
  const bits = inner.split(":");
  if (bits.length >= 3 && (bits[0] === "masjid" || bits[0] === "campaign")) return bits.slice(2).join(":");
  return inner; // legacy @[City] token
}

// Splits a raw stored value (plain text interleaved with `@[...]` tokens)
// into an ordered list of text/chip segments, for building the editable DOM.
function parseValueToSegments(value) {
  const segments = [];
  let lastIndex = 0;
  let m;
  MENTION_TOKEN_RE.lastIndex = 0;
  while ((m = MENTION_TOKEN_RE.exec(value))) {
    if (m.index > lastIndex) segments.push({ type: "text", value: value.slice(lastIndex, m.index) });
    segments.push({ type: "chip", token: m[0], label: labelForToken(m[1]) });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < value.length) segments.push({ type: "text", value: value.slice(lastIndex) });
  return segments;
}

function buildEditableDom(value) {
  const frag = document.createDocumentFragment();
  for (const seg of parseValueToSegments(value)) {
    if (seg.type === "text") {
      frag.appendChild(document.createTextNode(seg.value));
    } else {
      const chip = document.createElement("span");
      chip.className = "cw-mention-chip";
      chip.contentEditable = "false";
      chip.dataset.token = seg.token;
      chip.textContent = `@${seg.label}`;
      frag.appendChild(chip);
    }
  }
  return frag;
}

// Reads the editable element's current DOM back into the raw stored string
// (text nodes as-is, mention chips back to their `@[...]` token). Walks
// defensively into any stray <div>/<p>/<br> a browser's native paste or
// newline handling might introduce, treating each as a line break, so the
// serialized value never silently drops content.
function serializeEditable(root) {
  let out = "";
  const walk = (node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.classList?.contains("cw-mention-chip")) {
          out += child.dataset.token || "";
        } else if (child.tagName === "BR") {
          out += "\n";
        } else if (child.tagName === "DIV" || child.tagName === "P") {
          if (out && !out.endsWith("\n")) out += "\n";
          walk(child);
        } else {
          walk(child);
        }
      }
    });
  };
  walk(root);
  return out;
}

// Looks for an in-progress "@word" ending exactly at the caret, scoped to
// the text node the caret is currently in — which is always where the "@"
// and everything typed after it live, since a mention chip or a newline
// naturally breaks typing into a fresh node.
function detectMentionAtCaret(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return null;
  const textBefore = node.textContent.slice(0, range.startOffset);
  const match = /(^|[\s(])@([^\s@]{0,40})$/.exec(textBefore);
  if (!match) return null;
  return { node, atOffsetInNode: match.index + match[1].length, query: match[2] };
}

// Drop-in replacement for a plain <textarea> that adds a live "@" mention
// autocomplete for Masjids and Campaigns — used by the post composer, the
// comment composer, and the reply/edit boxes, so mentioning stays consistent
// everywhere text is entered on the Wall. Selecting a suggestion inserts a
// non-editable "@Name" chip (rather than showing the raw `@[masjid:12:Name]`
// storage token while composing); the chip carries that token in a data
// attribute and is serialized back to it on every edit, so PostBodyText.jsx
// can later render the same token as a link.
function MentionTextarea({ value, onChange, onKeyDown, rows = 3, placeholder, autoFocus, id, className }) {
  const editableRef = useRef(null);
  const lastEmitted = useRef(undefined);
  const mentionCtxRef = useRef(null);
  const blurTimeout = useRef(null);

  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ masjids: [], campaigns: [] });
  const [loading, setLoading] = useState(false);

  const showingPlaceholder = !value && !focused;

  // Resync the DOM from `value` only when it changed for a reason other than
  // our own onInput → onChange echo (an external reset, or switching which
  // comment/post is being edited) — otherwise this would fight the caret on
  // every keystroke.
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const root = editableRef.current;
    if (!root) return;
    root.innerHTML = "";
    root.appendChild(buildEditableDom(value || ""));
    lastEmitted.current = value;
  }, [value]);

  useEffect(() => {
    const root = editableRef.current;
    if (!root) return;
    if (showingPlaceholder) {
      root.textContent = placeholder || "";
      root.classList.add("is-placeholder");
    } else if (root.classList.contains("is-placeholder")) {
      root.textContent = "";
      root.classList.remove("is-placeholder");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingPlaceholder, placeholder]);

  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  useEffect(() => {
    if (!open || !query) {
      setResults({ masjids: [], campaigns: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      axios
        .get(`${API_BASE}/community/mention-search`, { params: { q: query } })
        .then(({ data }) => setResults({ masjids: data.masjids || [], campaigns: data.campaigns || [] }))
        .catch(() => setResults({ masjids: [], campaigns: [] }))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  const syncFromDom = () => {
    const root = editableRef.current;
    if (!root) return;
    const raw = serializeEditable(root);
    lastEmitted.current = raw;
    onChange(raw);

    const ctx = detectMentionAtCaret(root);
    if (ctx) {
      mentionCtxRef.current = ctx;
      setQuery(ctx.query);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const pick = (type, item) => {
    const ctx = mentionCtxRef.current;
    if (!ctx) return;
    const label = type === "masjid" ? item.name : item.title;
    const ref = type === "masjid" ? item.id : item.slug;
    const token = `@[${type}:${ref}:${label}]`;

    const { node, atOffsetInNode, query: q } = ctx;
    const fullText = node.textContent;
    const before = fullText.slice(0, atOffsetInNode);
    const after = fullText.slice(atOffsetInNode + 1 + q.length);

    const chip = document.createElement("span");
    chip.className = "cw-mention-chip";
    chip.contentEditable = "false";
    chip.dataset.token = token;
    chip.textContent = `@${label}`;

    const beforeNode = document.createTextNode(before);
    const spaceNode = document.createTextNode(` ${after}`);
    const parent = node.parentNode;
    parent.insertBefore(beforeNode, node);
    parent.insertBefore(chip, node);
    parent.insertBefore(spaceNode, node);
    parent.removeChild(node);

    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(spaceNode, 1);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    setOpen(false);
    editableRef.current?.focus();
    syncFromDom();
  };

  const hasResults = results.masjids.length > 0 || results.campaigns.length > 0;

  return (
    <div className="cw-mention-input-wrap">
      <div
        id={id}
        ref={editableRef}
        className={`mention-editable${className ? ` ${className}` : ""}`}
        style={{ minHeight: `${rows * 1.5}em` }}
        contentEditable
        suppressContentEditableWarning
        autoFocus={autoFocus}
        onInput={syncFromDom}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            setOpen(false);
            return;
          }
          if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            document.execCommand("insertText", false, "\n");
            return;
          }
          onKeyDown?.(e);
        }}
        onFocus={() => {
          setFocused(true);
          clearTimeout(blurTimeout.current);
        }}
        onBlur={() => {
          setFocused(false);
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && query && (
        <div className="cw-mention-dropdown">
          {loading && <div className="cw-mention-empty">Searching…</div>}
          {!loading && !hasResults && <div className="cw-mention-empty">No matching masjids or campaigns.</div>}
          {!loading && results.masjids.length > 0 && (
            <div className="cw-mention-group">
              <span className="cw-mention-group-label">Masjids</span>
              {results.masjids.map((m) => (
                <button type="button" key={`m-${m.id}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pick("masjid", m)}>
                  {m.name}
                  {m.city && <span className="cw-mention-sub"> · {m.city}</span>}
                </button>
              ))}
            </div>
          )}
          {!loading && results.campaigns.length > 0 && (
            <div className="cw-mention-group">
              <span className="cw-mention-group-label">Campaigns</span>
              {results.campaigns.map((c) => (
                <button type="button" key={`c-${c.id}`} onMouseDown={(e) => e.preventDefault()} onClick={() => pick("campaign", c)}>
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MentionTextarea;
