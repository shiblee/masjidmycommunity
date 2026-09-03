import { useCallback, useEffect, useRef, useState } from "react";

// Maps this app's language codes to the BCP-47 locale tags the browser's
// speech recognizer expects. en-US/hi-IN/ar-SA are broadly supported;
// ur-PK support is thinner across engines but Chrome (the primary target,
// since Firefox has no SpeechRecognition support at all) recognizes it.
const RECOGNITION_LANG = { en: "en-US", hi: "hi-IN", ur: "ur-PK", ar: "ar-SA" };

// Thin wrapper around the browser's native SpeechRecognition — no server
// round-trip, no API key, works entirely client-side. Support varies
// (Chrome/Edge/Safari; not Firefox), so `supported` must be checked before
// rendering any mic UI: this is a progressive enhancement, not guaranteed.
//
// `onTranscript(text, isFinal)` fires with the live-updating transcript
// while listening (isFinal=false) and once more with the settled text when
// recognition ends (isFinal=true) — the caller just pours it into an <input>.
export function useSpeechToText({ languageCode, onTranscript }) {
  const [state, setState] = useState("idle"); // idle | listening | processing | error
  const [errorReason, setErrorReason] = useState(null);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const SpeechRecognitionCtor =
    typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;
  const supported = Boolean(SpeechRecognitionCtor);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  useEffect(() => stop, [stop]); // stop any live recognition on unmount

  const start = useCallback(() => {
    if (!supported || state === "listening") return;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = RECOGNITION_LANG[languageCode] || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    finalTranscriptRef.current = "";

    recognition.onstart = () => {
      setErrorReason(null);
      setState("listening");
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscriptRef.current += transcript;
        else interim += transcript;
      }
      onTranscriptRef.current?.((finalTranscriptRef.current + interim).trim(), false);
    };
    recognition.onerror = (event) => {
      setState("error");
      setErrorReason(event.error); // "not-allowed" | "no-speech" | "audio-capture" | "network" | ...
    };
    recognition.onend = () => {
      setState((s) => {
        if (s === "error") return s;
        const finalText = finalTranscriptRef.current.trim();
        if (finalText) onTranscriptRef.current?.(finalText, true);
        return "idle";
      });
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setState("error");
      setErrorReason("start-failed");
    }
  }, [supported, state, languageCode, SpeechRecognitionCtor]);

  // Auto-clear a transient error back to idle so the mic stays usable.
  useEffect(() => {
    if (state !== "error") return;
    const timeout = setTimeout(() => setState("idle"), 3500);
    return () => clearTimeout(timeout);
  }, [state]);

  const toggle = useCallback(() => {
    if (state === "listening") {
      setState("processing");
      stop();
    } else if (state === "idle" || state === "error") {
      start();
    }
  }, [state, start, stop]);

  return { supported, state, errorReason, toggle };
}
