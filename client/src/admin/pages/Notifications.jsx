import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const SECTIONS = [
  { key: "overview", label: "Overview", icon: "dashboard" },
  { key: "templates", label: "Email Templates", icon: "mail" },
  { key: "settings", label: "Email Settings", icon: "settings" },
];

const TYPE_LABEL = {
  otp_verification: "OTP Verification",
  welcome_registration: "Welcome Email",
  account_status_changed: "Account Status Changed",
  masjid_submitted_admin: "New Masjid – Admin Notification",
  masjid_submitted_user: "Masjid Submission Acknowledgement",
  masjid_changes_requested_user: "Masjid Changes Requested",
  campaign_submitted_admin: "New Campaign – Admin Notification",
  campaign_submitted_user: "Campaign Submission Acknowledgement",
  campaign_changes_requested_user: "Campaign Changes Requested",
  campaign_change_response_admin: "Campaign Change Response – Admin Notification",
  campaign_approved_user: "Campaign Approved",
  campaign_rejected_user: "Campaign Rejected",
  campaign_status_updated_user: "Campaign Status Updated",
  concern_submitted_admin: "New Concern – Admin Notification",
  concern_submitted_user: "Concern Submission Acknowledgement",
  concern_resolved_user: "Concern Resolved",
  contact_message_admin: "New Contact Message – Admin Notification",
  password_changed: "Password Changed",
  email_changed: "Email Address Changed",
};

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}


function TestEmailModal({ templateKey, onClose }) {
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const send = async () => {
    if (!to.trim()) {
      setError("Enter an email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await adminApi.post(`/notifications/templates/${templateKey}/test`, { to: to.trim() });
      setResult(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the test email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={onClose}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
        <h3>Send Test Email</h3>
        <p className="amx-modal-sub">Send a preview of {TYPE_LABEL[templateKey] || templateKey} with sample data to any inbox.</p>
        {result ? (
          <div className="amx-modal-success">
            <div className="amx-modal-success-icon">
              <Icon name="check" size={22} />
            </div>
            <p>{result}</p>
            <button className="amx-btn amx-btn-accent" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="amx-form-group">
              <label>Send to</label>
              <input type="text" placeholder="you@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
              {error && (
                <div className="amx-form-hint" style={{ color: "var(--a-danger)" }}>
                  {error}
                </div>
              )}
            </div>
            <button className="amx-btn amx-btn-accent" style={{ width: "100%", justifyContent: "center" }} onClick={send} disabled={loading}>
              {loading ? "Sending…" : "Send Test Email"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PreviewModal({ templateKey, onClose }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    adminApi
      .post(`/notifications/templates/${templateKey}/preview`, {})
      .then(({ data }) => setHtml(data.html))
      .finally(() => setLoading(false));
  }, [templateKey]);

  return (
    <div className="amx-modal-overlay" onClick={onClose}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
        <button className="amx-modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
        <h3>Preview — {TYPE_LABEL[templateKey] || templateKey}</h3>
        <div style={{ display: "flex", gap: 8, margin: "10px 0 16px" }}>
          <button className={`amx-btn amx-btn-sm ${width === 600 ? "amx-btn-accent" : "amx-btn-outline"}`} onClick={() => setWidth(600)}>
            Desktop
          </button>
          <button className={`amx-btn amx-btn-sm ${width === 375 ? "amx-btn-accent" : "amx-btn-outline"}`} onClick={() => setWidth(375)}>
            Mobile
          </button>
        </div>
        <div style={{ background: "var(--a-bg)", borderRadius: 12, padding: 16, display: "flex", justifyContent: "center" }}>
          {loading ? (
            <div className="amx-empty">
              <Icon name="mail" />
              <strong>Loading preview…</strong>
            </div>
          ) : (
            <iframe
              title="Email preview"
              srcDoc={html}
              style={{ width, height: 560, maxWidth: "100%", border: "1px solid var(--a-border)", borderRadius: 8, background: "#fff", transition: "width .25s" }}
              sandbox=""
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Notifications() {
  const [section, setSection] = useState("overview");
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const [settings, setSettings] = useState(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState(null);

  const [previewKey, setPreviewKey] = useState(null);
  const [testKey, setTestKey] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  const loadOverview = () => {
    setLogsLoading(true);
    Promise.all([adminApi.get("/notifications/stats"), adminApi.get("/notifications/logs")])
      .then(([statsRes, logsRes]) => {
        setStats(statsRes.data);
        setLogs(logsRes.data.logs);
      })
      .finally(() => setLogsLoading(false));
  };

  const loadTemplates = () => {
    setTemplatesLoading(true);
    adminApi
      .get("/notifications/templates")
      .then(({ data }) => setTemplates(data.templates))
      .finally(() => setTemplatesLoading(false));
  };

  const loadSettings = () => {
    setSettingsLoading(true);
    adminApi
      .get("/notifications/settings")
      .then(({ data }) => {
        setSettings(data.settings);
        setSmtpConfigured(data.smtpConfigured);
      })
      .finally(() => setSettingsLoading(false));
  };

  useEffect(() => {
    loadOverview();
    loadTemplates();
    loadSettings();
  }, []);

  const toggleTemplateStatus = async (tpl) => {
    const nextStatus = tpl.status === "active" ? "inactive" : "active";
    try {
      const { data } = await adminApi.put(`/notifications/templates/${tpl.key}`, { ...tpl, status: nextStatus });
      setTemplates((prev) => prev.map((t) => (t.key === tpl.key ? data.template : t)));
      showToast(`${tpl.name} is now ${nextStatus === "active" ? "active" : "inactive"}.`);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't update the template.");
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const { data } = await adminApi.put("/notifications/settings", settings);
      setSettings(data.settings);
      showToast("Email settings saved.");
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Communication</span>
          <h1>Notifications</h1>
          <p>Manage automated emails, templates and delivery activity</p>
        </div>
      </div>

      <div className="amx-settings-layout">
        <nav className="amx-settings-nav">
          {SECTIONS.map((s) => (
            <button key={s.key} className={section === s.key ? "active" : ""} onClick={() => setSection(s.key)}>
              <Icon name={s.icon} />
              {s.label}
            </button>
          ))}
        </nav>

        <div>
          {section === "overview" && (
            <>
              <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 18 }}>
                <div className="amx-card amx-kpi">
                  <div className="amx-kpi-value">{stats?.totalEmails ?? "—"}</div>
                  <div className="amx-kpi-label">Total Emails Sent</div>
                </div>
                <div className="amx-card amx-kpi">
                  <div className="amx-kpi-value">{stats?.otpEmails ?? "—"}</div>
                  <div className="amx-kpi-label">OTP Emails Sent</div>
                </div>
                <div className="amx-card amx-kpi">
                  <div className="amx-kpi-value">{stats?.registrationEmails ?? "—"}</div>
                  <div className="amx-kpi-label">Registration Emails Sent</div>
                </div>
                <div className="amx-card amx-kpi">
                  <div className="amx-kpi-value">{stats?.successfulDeliveries ?? "—"}</div>
                  <div className="amx-kpi-label">Successful Deliveries</div>
                </div>
                <div className="amx-card amx-kpi">
                  <div className="amx-kpi-value">{stats?.failedEmails ?? "—"}</div>
                  <div className="amx-kpi-label">Failed Emails</div>
                </div>
                <div className="amx-card amx-kpi">
                  <div className="amx-kpi-value">{stats?.activeTemplates ?? "—"}</div>
                  <div className="amx-kpi-label">Active Templates</div>
                </div>
              </div>

              <div className="amx-card amx-panel">
                <div className="amx-panel-head">
                  <div>
                    <h3>Email Activity Log</h3>
                    <div className="amx-panel-sub">Most recent 200 notification attempts</div>
                  </div>
                </div>
                {logsLoading ? (
                  <div className="amx-empty">
                    <Icon name="mail" />
                    <strong>Loading activity…</strong>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="amx-empty">
                    <Icon name="mail" />
                    <strong>No email activity yet</strong>
                    <span>Sent notifications will appear here.</span>
                  </div>
                ) : (
                  <div className="amx-table-wrap">
                    <table className="amx-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Type</th>
                          <th>Date &amp; Time</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((l) => (
                          <tr key={l.id}>
                            <td>{l.userName || "—"}</td>
                            <td>{l.userEmail || "—"}</td>
                            <td>{TYPE_LABEL[l.notificationType] || l.notificationType}</td>
                            <td>{formatDateTime(l.createdAt)}</td>
                            <td>
                              <StatusBadge status={l.status === "sent" ? "ok" : l.status === "failed" ? "failed" : "neutral"} label={l.status === "sent" ? "Sent" : l.status === "failed" ? "Failed" : "Skipped"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {section === "templates" && (
            <div className="amx-card amx-panel">
              <div className="amx-panel-head">
                <div>
                  <h3>Email Notifications</h3>
                  <div className="amx-panel-sub">Automated transactional emails sent by the platform</div>
                </div>
              </div>
              {templatesLoading ? (
                <div className="amx-empty">
                  <Icon name="mail" />
                  <strong>Loading templates…</strong>
                </div>
              ) : (
                <div className="amx-table-wrap">
                  <table className="amx-table">
                    <thead>
                      <tr>
                        <th>Notification</th>
                        <th>Subject</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((t) => (
                        <tr key={t.key}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{t.name}</div>
                            <div className="amx-cell-sub">{t.purpose}</div>
                          </td>
                          <td>{t.subject}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <StatusBadge status={t.status} />
                              <Toggle on={t.status === "active"} onClick={() => toggleTemplateStatus(t)} />
                            </div>
                          </td>
                          <td>{formatDateTime(t.updatedAt)}</td>
                          <td>
                            <div className="amx-row-actions">
                              <button className="amx-icon-action" aria-label="Preview" onClick={() => setPreviewKey(t.key)}>
                                <Icon name="eye" />
                              </button>
                              <button className="amx-icon-action" aria-label="Send test email" onClick={() => setTestKey(t.key)}>
                                <Icon name="megaphone" />
                              </button>
                              <button className="amx-icon-action" aria-label="Edit" onClick={() => navigate(`/admin/notifications/templates/${t.key}`)} style={{ color: "var(--a-navy-soft)" }}>
                                <Icon name="edit" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {section === "settings" && settings && (
            <div className="amx-card amx-panel">
              <div className="amx-panel-head">
                <div>
                  <h3>Email Settings</h3>
                  <div className="amx-panel-sub">Sender details and delivery configuration</div>
                </div>
              </div>

              <div className={`amx-alert-banner ${smtpConfigured ? "ok" : "warn"}`}>
                <Icon name={smtpConfigured ? "check" : "info"} size={16} />
                {smtpConfigured
                  ? "A live SMTP provider is configured — notifications are delivered for real."
                  : "No live SMTP provider is configured yet. Emails are logged to the server console instead of being delivered (dev mode). Add SMTP_HOST, SMTP_USER and SMTP_PASS to the server environment to go live."}
              </div>

              <div className="amx-form-grid" style={{ marginTop: 20 }}>
                <div className="amx-form-group">
                  <label>Sender Name</label>
                  <input type="text" value={settings.senderName} onChange={(e) => setSettings((s) => ({ ...s, senderName: e.target.value }))} />
                </div>
                <div className="amx-form-group">
                  <label>Sender Email Address</label>
                  <input type="text" value={settings.senderEmail} onChange={(e) => setSettings((s) => ({ ...s, senderEmail: e.target.value }))} />
                </div>
                <div className="amx-form-group">
                  <label>Reply-To Email Address</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={settings.replyTo || ""}
                    onChange={(e) => setSettings((s) => ({ ...s, replyTo: e.target.value }))}
                  />
                </div>
                <div className="amx-form-group">
                  <label>Email Provider</label>
                  <input type="text" value={settings.provider} disabled />
                </div>
              </div>

              <div className="amx-settings-row">
                <div>
                  <strong>Enable Email Notifications</strong>
                  <span>Master switch — turn off to pause all automated emails platform-wide.</span>
                </div>
                <Toggle on={settings.enabled} onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))} />
              </div>

              <button className="amx-btn amx-btn-accent" style={{ marginTop: 20 }} onClick={saveSettings} disabled={settingsLoading || savingSettings}>
                {savingSettings ? "Saving…" : "Save Settings"}
              </button>
            </div>
          )}

          {section === "settings" && settings && (
            <div className="amx-card amx-panel" style={{ marginTop: 20 }}>
              <div className="amx-panel-head">
                <div>
                  <h3>Notification Email Configuration</h3>
                  <div className="amx-panel-sub">Where system notification emails are sent, beyond the general Sender Email above</div>
                </div>
              </div>

              <div className="amx-form-grid">
                <div className="amx-form-group">
                  <label>New Masjid Notification Email</label>
                  <input
                    type="text"
                    placeholder="admin@example.com"
                    value={settings.adminNotificationEmail || ""}
                    onChange={(e) => setSettings((s) => ({ ...s, adminNotificationEmail: e.target.value }))}
                  />
                  <span className="amx-panel-sub" style={{ display: "block", marginTop: 6 }}>
                    Receives an alert every time a user submits a masjid for review.
                  </span>
                </div>
                <div className="amx-form-group">
                  <label>Notification / Sender Email</label>
                  <input type="text" value={settings.senderEmail} disabled />
                  <span className="amx-panel-sub" style={{ display: "block", marginTop: 6 }}>
                    Used as the "From" address for the masjid submission acknowledgement and every other system email — configured as Sender Email Address above.
                  </span>
                </div>
              </div>

              <button className="amx-btn amx-btn-accent" style={{ marginTop: 20 }} onClick={saveSettings} disabled={settingsLoading || savingSettings}>
                {savingSettings ? "Saving…" : "Save Settings"}
              </button>
            </div>
          )}
        </div>
      </div>

      {previewKey && <PreviewModal templateKey={previewKey} onClose={() => setPreviewKey(null)} />}
      {testKey && <TestEmailModal templateKey={testKey} onClose={() => setTestKey(null)} />}

      {toast && (
        <div className="amx-toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </>
  );
}

export default Notifications;
