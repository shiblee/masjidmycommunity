import React, { useEffect, useRef, useState } from "react";
import { searchAddresses, resolveAddress } from "../utils/addressProviders.js";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 450;

function AddressAutocomplete({ value, onChange, onResolved, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [highlighted, setHighlighted] = useState(-1);

  const wrapRef = useRef(null);
  const abortRef = useRef(null);
  // Set while applying a selection, so the resulting value change doesn't
  // immediately trigger a fresh search for the text we just filled in.
  const skipNextSearch = useRef(false);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const query = value?.trim() || "";
    if (query.length < MIN_CHARS) {
      setSuggestions([]);
      setOpen(false);
      setError("");
      return;
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError("");
      searchAddresses(query, controller.signal)
        .then((results) => {
          setSuggestions(results);
          setHighlighted(-1);
          setOpen(true);
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setSuggestions([]);
          setError("Address search is unavailable — you can still type the address manually.");
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value]);

  const applySuggestion = async (suggestion) => {
    setOpen(false);
    setLoading(true);
    skipNextSearch.current = true;
    try {
      const fields = await resolveAddress(suggestion);
      onResolved(fields);
    } catch {
      skipNextSearch.current = false;
      setError("Couldn't load details for that address. Please fill the fields manually.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      applySuggestion(suggestions[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="msj-addr-wrap" ref={wrapRef}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {loading && <span className="msj-addr-spinner" aria-hidden="true" />}

      {open && suggestions.length > 0 && (
        <ul className="msj-addr-list" role="listbox">
          {suggestions.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === highlighted}>
              <button
                type="button"
                className={i === highlighted ? "highlighted" : ""}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => applySuggestion(s)}
              >
                <strong>{s.primary || s.label}</strong>
                {s.secondary && <span>{s.secondary}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <span className="msj-field-hint">{error}</span>}
    </div>
  );
}

export default AddressAutocomplete;
