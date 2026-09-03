import React from "react";
import { Icon } from "./Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { useSpeechToText } from "../hooks/useSpeechToText.js";

const ERROR_KEYS = {
  "not-allowed": ["speech.errNotAllowed", "Microphone access was denied. Enable it in your browser settings to use voice input."],
  "permission-denied": ["speech.errNotAllowed", "Microphone access was denied. Enable it in your browser settings to use voice input."],
  "no-speech": ["speech.errNoSpeech", "We didn't catch that. Please try again."],
  "audio-capture": ["speech.errNoMic", "No microphone was found on this device."],
  network: ["speech.errNetwork", "Voice input needs an internet connection."],
};

// Self-contained mic control for a text input — pass `onTranscript` and it
// pours the live/final speech transcript straight into the caller's state.
// Renders nothing when the browser has no SpeechRecognition support (e.g.
// Firefox) rather than showing a button that can never work.
function MicButton({ onTranscript, className = "" }) {
  const { t, language, direction } = useTranslation();
  const { supported, state, errorReason, toggle } = useSpeechToText({ languageCode: language, onTranscript });

  if (!supported) return null;

  const errorEntry = errorReason && (ERROR_KEYS[errorReason] || ["speech.errGeneric", "Voice input isn't working right now. Please try again."]);
  const label =
    state === "listening"
      ? t("speech.stop", "Stop listening")
      : t("speech.start", "Use voice input");

  return (
    <span className={`mic-btn-wrap ${className}`}>
      <button
        type="button"
        className={`mic-btn mic-btn-${state}`}
        onClick={toggle}
        aria-label={label}
        aria-pressed={state === "listening"}
        disabled={state === "processing"}
      >
        <span className="mic-btn-icon">
          {state === "processing" ? <span className="mic-btn-spinner" /> : <Icon name="mic" size={20} />}
          {state === "listening" && <span className="mic-btn-pulse" aria-hidden="true" />}
        </span>
      </button>
      {errorEntry && (
        <span className="mic-btn-tooltip" dir={direction} role="alert">
          {t(errorEntry[0], errorEntry[1])}
        </span>
      )}
    </span>
  );
}

export default MicButton;
