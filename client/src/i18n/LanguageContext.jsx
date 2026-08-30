import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../config.js";

const LanguageContext = createContext(null);
const STORAGE_KEY = "mmc-language";

// The first React Context in this codebase — introduced here because
// language/direction genuinely need to be readable from anywhere (unlike
// auth, which is checked per guarded-route via localStorage helpers). Wraps
// <BrowserRouter> in App.jsx, so it covers the public site and the nested
// AdminApp route tree in one place.
export function LanguageProvider({ children }) {
  const [languages, setLanguages] = useState([]);
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || "en");
  const [direction, setDirection] = useState("ltr");
  const [values, setValues] = useState({});

  useEffect(() => {
    axios
      .get(`${API_BASE}/i18n/languages`)
      .then(({ data }) => {
        const list = data.languages || [];
        setLanguages(list);
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedIsValid = stored && list.some((l) => l.code === stored);
        if (!storedIsValid) {
          const defaultLang = list.find((l) => l.isDefault) || list[0];
          if (defaultLang) setLanguageState(defaultLang.code);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!language) return;
    axios
      .get(`${API_BASE}/i18n/translations/${language}`)
      .then(({ data }) => {
        setValues(data.values || {});
        setDirection(data.direction || "ltr");
      })
      .catch(() => {
        setValues({});
        setDirection("ltr");
      });
  }, [language]);

  useEffect(() => {
    document.documentElement.lang = language || "en";
    document.documentElement.dir = direction;
  }, [language, direction]);

  const setLanguage = useCallback((code) => {
    localStorage.setItem(STORAGE_KEY, code);
    setLanguageState(code);
  }, []);

  // Falls back to the inline default text (the current hardcoded English
  // copy at each call site) whenever a key hasn't been translated/seeded
  // yet — this is what lets pages be migrated to t() incrementally without
  // ever showing a missing-key placeholder in the meantime.
  const t = useCallback((key, fallback) => values[key] ?? fallback ?? key, [values]);

  return <LanguageContext.Provider value={{ t, language, direction, languages, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within a LanguageProvider");
  return ctx;
}
