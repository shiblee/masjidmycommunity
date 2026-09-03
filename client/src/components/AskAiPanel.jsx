import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { askAi, sendAiFeedback, getFaqSessionId } from "../services/faqApi.js";

// Session-only: conversation state lives in this component's state and
// resets on refresh — no history is persisted to the server (the server
// only logs each question + outcome for admin visibility, not a thread).
function AskAiPanel({ suggestedQuestions = [] }) {
  const { t, direction, language } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const listRef = useRef(null);

  const scrollToEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  };

  const send = async (questionText) => {
    const question = (questionText ?? input).trim();
    if (!question || loading) return;

    const userMsg = { role: "user", id: `u-${Date.now()}`, text: question };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    scrollToEnd();

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.role === "user" ? m.text : m.answer || "" }));

    try {
      const { data } = await askAi({
        question,
        languageCode: language,
        history,
        sessionId: getFaqSessionId(),
      });
      setMessages((m) => [...m, { role: "assistant", id: `a-${Date.now()}`, ...data }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          id: `a-${Date.now()}`,
          error: err.response?.data?.message || t("askAi.genericError", "Something went wrong. Please try again."),
        },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  const giveFeedback = async (msg, value) => {
    if (!msg.logId || msg.feedbackGiven) return;
    setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, feedbackGiven: value } : x)));
    try {
      await sendAiFeedback(msg.logId, value);
    } catch {
      // Non-critical — leave the optimistic UI state as-is.
    }
  };

  const copyAnswer = (msg) => {
    if (!msg.answer) return;
    navigator.clipboard.writeText(msg.answer).then(() => {
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="ask-ai-panel" dir={direction}>
      <div className="ask-ai-head">
        <div className="ask-ai-head-icon">
          <Icon name="bulb" size={22} />
        </div>
        <div>
          <h3>{t("askAi.title", "Ask Masjid My Community AI")}</h3>
          <p>{t("askAi.subtitle", "Ask anything about our mission, features, policies, privacy, or how the platform works.")}</p>
        </div>
      </div>

      {messages.length === 0 && suggestedQuestions.length > 0 && (
        <div className="ask-ai-suggestions">
          {suggestedQuestions.map((q) => (
            <button key={q} className="ask-ai-suggestion-chip" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="ask-ai-messages" ref={listRef}>
        {messages.map((msg) => (
          <div className={`ask-ai-message ${msg.role}`} key={msg.id}>
            {msg.role === "user" ? (
              <p>{msg.text}</p>
            ) : msg.error ? (
              <div className="ask-ai-state ask-ai-state-error">
                <Icon name="info" size={18} />
                <p>{msg.error}</p>
              </div>
            ) : !msg.aiConfigured ? (
              <div className="ask-ai-state">
                <Icon name="bulb" size={18} />
                <p>{t("askAi.notConfigured", "The AI assistant isn't set up yet. In the meantime, here's the closest match from our FAQs:")}</p>
                {msg.bestFaqMatch && (
                  <Link to={`/faq#faq-${msg.bestFaqMatch.id}`} className="ask-ai-faq-link">
                    {msg.bestFaqMatch.question} <span className="btn-arrow">→</span>
                  </Link>
                )}
              </div>
            ) : msg.belowThreshold ? (
              <div className="ask-ai-state">
                <Icon name="search" size={18} />
                <p>{t("askAi.belowThreshold", "I don't have enough information about that in Masjid My Community's published content yet.")}</p>
                {msg.bestFaqMatch && (
                  <Link to={`/faq#faq-${msg.bestFaqMatch.id}`} className="ask-ai-faq-link">
                    {t("askAi.closestMatch", "Closest match:")} {msg.bestFaqMatch.question} <span className="btn-arrow">→</span>
                  </Link>
                )}
              </div>
            ) : !msg.answer ? (
              <div className="ask-ai-state ask-ai-state-error">
                <Icon name="info" size={18} />
                <p>{t("askAi.unavailable", "The assistant is temporarily unavailable. Please try again shortly.")}</p>
                {msg.bestFaqMatch && (
                  <Link to={`/faq#faq-${msg.bestFaqMatch.id}`} className="ask-ai-faq-link">
                    {t("askAi.closestMatch", "Closest match:")} {msg.bestFaqMatch.question} <span className="btn-arrow">→</span>
                  </Link>
                )}
              </div>
            ) : (
              <>
                <p className="ask-ai-answer">{msg.answer}</p>
                {msg.keyPoints?.length > 0 && (
                  <ul className="ask-ai-key-points">
                    {msg.keyPoints.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                )}
                {msg.sources?.length > 0 && (
                  <div className="ask-ai-sources">
                    <span>{t("askAi.basedOn", "Based on:")}</span>
                    {msg.sources.map((s) => (
                      <Link to={s.url} className="ask-ai-source-chip" key={s.category}>
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
                {msg.islamicReference && (
                  <div className="ask-ai-islamic-ref">
                    <span className="ask-ai-islamic-label">
                      {msg.islamicReference.type === "Hadith"
                        ? t("askAi.hadithReminder", "Hadith Reminder")
                        : t("askAi.quranicReflection", "Quranic Reflection")}
                    </span>
                    <p className="ask-ai-islamic-arabic">{msg.islamicReference.arabic}</p>
                    <p className="ask-ai-islamic-translation">“{msg.islamicReference.translation}”</p>
                    <span className="ask-ai-islamic-source">{msg.islamicReference.source}</span>
                  </div>
                )}
                <div className="ask-ai-actions">
                  <button className="ask-ai-action-btn" onClick={() => copyAnswer(msg)}>
                    <Icon name="edit" size={14} /> {copiedId === msg.id ? t("askAi.copied", "Copied!") : t("askAi.copyAnswer", "Copy answer")}
                  </button>
                  <div className="ask-ai-fb-buttons">
                    <span>{t("askAi.helpfulLabel", "Helpful?")}</span>
                    <button
                      className={`ask-ai-fb-btn${msg.feedbackGiven === "helpful" ? " active" : ""}`}
                      onClick={() => giveFeedback(msg, "helpful")}
                      disabled={Boolean(msg.feedbackGiven)}
                      aria-label="Yes, this was helpful"
                    >
                      <Icon name="check" size={13} />
                    </button>
                    <button
                      className={`ask-ai-fb-btn${msg.feedbackGiven === "unhelpful" ? " active" : ""}`}
                      onClick={() => giveFeedback(msg, "unhelpful")}
                      disabled={Boolean(msg.feedbackGiven)}
                      aria-label="Not helpful"
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
        {loading && (
          <div className="ask-ai-message assistant">
            <div className="ask-ai-typing">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <form
        className="ask-ai-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("askAi.inputPlaceholder", "Ask a question about Masjid My Community…")}
          maxLength={500}
          disabled={loading}
        />
        <button type="submit" className="btn btn-gold" disabled={loading || !input.trim()}>
          {loading ? t("askAi.askingBtn", "Asking…") : t("askAi.askBtn", "Ask")}
        </button>
      </form>
    </div>
  );
}

export default AskAiPanel;
