import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

const VARIABLE_HINTS = {
  user_name: "The recipient's full name",
  otp_code: "The 6-digit verification code",
  platform_name: "Masjid My Community",
  current_year: "Current calendar year",
  account_status: "The account's new status (Active / Deactivated / Suspended)",
  status_detail: "A sentence explaining what the new account status means",
  masjid_name: "The masjid's name",
  masjid_id: "The masjid's ID number",
  category: "The masjid's category",
  submitted_by: "The full name of the person who submitted the masjid",
  submission_date: "Date and time the masjid was submitted",
  status: "The masjid's current review status",
};

function EmailTemplateEditor() {
  const { key } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const [previewHtml, setPreviewHtml] = useState("");
  const [previewWidth, setPreviewWidth] = useState(600);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testTo, setTestTo] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState("");

  const messageRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    setLoading(true);
    adminApi
      .get(`/notifications/templates/${key}`)
      .then(({ data }) => setForm(data.template))
      .catch(() => setError("Couldn't load this template."))
      .finally(() => setLoading(false));
  }, [key]);

  // Debounced live preview whenever the draft changes.
  useEffect(() => {
    if (!form) return;
    setPreviewLoading(true);
    const id = setTimeout(() => {
      adminApi
        .post(`/notifications/templates/${key}/preview`, form)
        .then(({ data }) => setPreviewHtml(data.html))
        .catch(() => {})
        .finally(() => setPreviewLoading(false));
    }, 400);
    return () => clearTimeout(id);
  }, [form, key]);

  const update = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
  };

  const insertVariable = (name) => {
    const token = `{{${name}}}`;
    const el = messageRef.current;
    if (!el) {
      setForm((f) => ({ ...f, message: `${f.message || ""}${token}` }));
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const nextValue = `${form.message.slice(0, start)}${token}${form.message.slice(end)}`;
    setForm((f) => ({ ...f, message: nextValue }));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  };

  const save = async (nextStatus) => {
    setSaving(true);
    setError("");
    try {
      const payload = nextStatus ? { ...form, status: nextStatus } : form;
      const { data } = await adminApi.put(`/notifications/templates/${key}`, payload);
      setForm(data.template);
      showToast(nextStatus === "active" ? "Template published and active." : nextStatus === "inactive" ? "Template deactivated." : "Draft saved.");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this template.");
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return;
    setTestSending(true);
    setTestResult("");
    try {
      const { data } = await adminApi.post(`/notifications/templates/${key}/test`, { to: testTo.trim() });
      setTestResult(data.message);
    } catch (err) {
      setTestResult(err.response?.data?.message || "Couldn't send the test email.");
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return (
      <div className="amx-empty">
        <Icon name="mail" />
        <strong>Loading template…</strong>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="amx-empty">
        <Icon name="mail" />
        <strong>Template not found</strong>
        <span>It may have been removed.</span>
      </div>
    );
  }

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/notifications")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} />
            Back to Notifications
          </button>
          <h1 style={{ marginTop: 10 }}>{form.name}</h1>
          <p>{form.purpose}</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center" }}>
          <StatusBadge status={form.status} />
          <Toggle on={form.status === "active"} onClick={() => save(form.status === "active" ? "inactive" : "active")} disabled={saving} />
        </div>
      </div>

      {error && (
        <div className="amx-form-error">
          <Icon name="info" size={17} />
          {error}
        </div>
      )}

      <div className="amx-editor-layout">
        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Email Content</h3>
              <div className="amx-panel-sub">Changes appear in the live preview as you type</div>
            </div>
          </div>

          <div className="amx-form-group">
            <label>Email Subject</label>
            <input type="text" value={form.subject} onChange={update("subject")} />
          </div>
          <div className="amx-form-group">
            <label>Heading</label>
            <input type="text" value={form.heading} onChange={update("heading")} />
          </div>

          <div className="amx-form-group">
            <label>Main Message</label>
            <textarea ref={messageRef} rows={6} value={form.message} onChange={update("message")} />
          </div>

          <div className="amx-var-palette">
            <span className="amx-var-palette-label">Insert variable:</span>
            {(form.availableVariables || []).map((v) => (
              <button key={v} type="button" className="amx-var-chip" title={VARIABLE_HINTS[v] || v} onClick={() => insertVariable(v)}>
                {`{{${v}}}`}
              </button>
            ))}
          </div>

          <div className="amx-form-grid" style={{ marginTop: 20 }}>
            <div className="amx-form-group">
              <label>Call-to-Action Text</label>
              <input type="text" placeholder="Optional" value={form.ctaText || ""} onChange={update("ctaText")} />
            </div>
            <div className="amx-form-group">
              <label>Call-to-Action Link</label>
              <input type="text" placeholder="Optional" value={form.ctaLink || ""} onChange={update("ctaLink")} />
            </div>
          </div>

          <div className="amx-form-group">
            <label>Footer Content</label>
            <textarea rows={3} value={form.footerText || ""} onChange={update("footerText")} />
          </div>

          <div className="amx-settings-row">
            <div>
              <strong>Islamic Quote Section</strong>
              <span>Show a short, verified Qur'an or Hadith reminder at the end of the message.</span>
            </div>
            <Toggle on={!!form.quoteEnabled} onClick={() => setForm((f) => ({ ...f, quoteEnabled: !f.quoteEnabled }))} />
          </div>

          {form.quoteEnabled && (
            <div className="amx-quote-fields">
              <div className="amx-form-group">
                <label>Transliteration</label>
                <input type="text" value={form.quoteTransliteration || ""} onChange={update("quoteTransliteration")} />
              </div>
              <div className="amx-form-group">
                <label>English Translation</label>
                <input type="text" value={form.quoteTranslation || ""} onChange={update("quoteTranslation")} />
              </div>
              <div className="amx-form-group">
                <label>Source / Reference</label>
                <input type="text" value={form.quoteSource || ""} onChange={update("quoteSource")} />
              </div>
            </div>
          )}

          <div className="amx-editor-actions">
            <button className="amx-btn amx-btn-outline" onClick={() => save()} disabled={saving}>
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button className="amx-btn amx-btn-accent" onClick={() => save("active")} disabled={saving}>
              Publish / Activate
            </button>
          </div>

          <div className="amx-test-send">
            <div className="amx-form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Send Test Email</label>
              <input type="text" placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            </div>
            <button className="amx-btn amx-btn-outline" onClick={sendTest} disabled={testSending || !testTo.trim()}>
              {testSending ? "Sending…" : "Send Test"}
            </button>
          </div>
          {testResult && <div className="amx-form-hint">{testResult}</div>}
        </div>

        <div className="amx-card amx-panel amx-preview-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Live Preview</h3>
              <div className="amx-panel-sub">Rendered with sample data</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button className={`amx-btn amx-btn-sm ${previewWidth === 600 ? "amx-btn-accent" : "amx-btn-outline"}`} onClick={() => setPreviewWidth(600)}>
              <Icon name="grid" size={14} />
              Desktop
            </button>
            <button className={`amx-btn amx-btn-sm ${previewWidth === 375 ? "amx-btn-accent" : "amx-btn-outline"}`} onClick={() => setPreviewWidth(375)}>
              <Icon name="activity" size={14} />
              Mobile
            </button>
          </div>
          <div className="amx-preview-frame-wrap">
            {previewLoading && !previewHtml ? (
              <div className="amx-empty">
                <Icon name="mail" />
                <strong>Rendering preview…</strong>
              </div>
            ) : (
              <iframe title="Live email preview" srcDoc={previewHtml} style={{ width: previewWidth }} className="amx-preview-frame" sandbox="" />
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="amx-toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </>
  );
}

export default EmailTemplateEditor;
