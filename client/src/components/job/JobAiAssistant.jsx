import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icons.jsx";
import MicButton from "../MicButton.jsx";
import publicJobApi from "../../services/publicJobApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const SESSION_KEY = "mmc-job-ai-session-id";
function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// Small, optional, collapsible panel — never a full takeover of the Jobs
// page. Mirrors AskAiPanel.jsx's grounded-Q&A shape (session-only history,
// no server-persisted thread) pointed at /jobs/public/ai-ask instead of the
// FAQ endpoint, with its own honest "not available" state rather than ever
// fabricating an answer.
function JobAiAssistant() {
  const { t, direction, language } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const examplePrompts = [
    t("jobAi.example1", "What jobs are open right now?"),
    t("jobAi.example2", "Are there any remote openings?"),
    t("jobAi.example3", "What jobs match my skills?"),
    t("jobAi.example4", "Do you have any teaching roles?"),
  ];

  const scrollToEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }));
  };

  const send = async (questionText) => {
    const question = (questionText ?? input).trim();
    if (!question || loading) return;

    setMessages((m) => [...m, { role: "user", id: `u-${Date.now()}`, text: question }]);
    setInput("");
    setLoading(true);
    scrollToEnd();

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.role === "user" ? m.text : m.answer || "" }));

    try {
      const { data } = await publicJobApi.post("/ai-ask", { question, languageCode: language, history, sessionId: getSessionId() });
      setMessages((m) => [...m, { role: "assistant", id: `a-${Date.now()}`, ...data }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", id: `a-${Date.now()}`, error: err.response?.data?.message || t("jobAi.genericError", "Something went wrong. Please try again.") }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  };

  return (
    <div className="job-ai-assistant">
      <button type="button" className="job-ai-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="job-ai-toggle-icon"><Icon name="sparkle" size={16} /></span>
        <span>
          <strong>{t("jobAi.toggleTitle", "Ask AI about jobs")}</strong>
          <span>{t("jobAi.toggleSubtitle", "Find the right opening in plain language")}</span>
        </span>
        <Icon name="chevronDown" size={16} style={{ marginLeft: "auto", transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>

      {open && (
        <div className="job-ai-panel" dir={direction}>
          {messages.length === 0 && (
            <div className="ask-ai-suggestions">
              {examplePrompts.map((q) => (
                <button key={q} className="ask-ai-suggestion-chip" onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          )}

          <div className="ask-ai-messages job-ai-messages" ref={listRef}>
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
                    <Icon name="sparkle" size={18} />
                    <p>{t("jobAi.notConfigured", "The job assistant isn't available right now — try browsing with the filters above instead.")}</p>
                  </div>
                ) : !msg.answer ? (
                  <div className="ask-ai-state ask-ai-state-error">
                    <Icon name="info" size={18} />
                    <p>{t("jobAi.unavailable", "The assistant is temporarily unavailable. Please try again shortly.")}</p>
                  </div>
                ) : (
                  <>
                    <p className="ask-ai-answer">{msg.answer}</p>
                    {msg.keyPoints?.length > 0 && (
                      <ul className="ask-ai-key-points">
                        {msg.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
                      </ul>
                    )}
                    {msg.referencedJobs?.length > 0 && (
                      <div className="job-ai-referenced">
                        {msg.referencedJobs.map((j) => (
                          <Link to={`/job/${j.slug}`} className="job-ai-referenced-chip" key={j.id}>
                            {j.title} <span className="btn-arrow">→</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {loading && (
              <div className="ask-ai-message assistant">
                <div className="ask-ai-typing"><span /><span /><span /></div>
              </div>
            )}
          </div>

          <form
            className="ask-ai-input-row"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <div className="ask-ai-input-wrap">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("jobAi.inputPlaceholder", "Ask about open jobs…")}
                maxLength={500}
                disabled={loading}
              />
              <MicButton onTranscript={(text) => setInput(text)} className="ask-ai-mic" />
            </div>
            <button type="submit" className="btn btn-gold" disabled={loading || !input.trim()}>
              {loading ? t("jobAi.askingBtn", "Asking…") : t("jobAi.askBtn", "Ask")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default JobAiAssistant;
