import React, { useEffect, useState } from "react";
import Icon from "../../../components/Icons.jsx";
import adminApi from "../../../services/adminApi.js";

// Admin-configurable counting rules (spec: "Admin should be able to
// configure the counting rules if required") — everything here maps
// directly to server/src/models/VisitorSettings.js, so a change here
// takes effect on the very next tracking request, no redeploy.
function VisitorSettingsModal({ onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.get("/visitors/settings").then(({ data }) => setForm(data)).catch(() => setError("Couldn't load settings."));
  }, []);

  const setField = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await adminApi.put("/visitors/settings", form);
      onSaved(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="amx-modal-overlay" onClick={() => (saving ? null : onClose())}>
      <div className="amx-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onClose} aria-label="Close" disabled={saving}><Icon name="x" size={16} /></button>
        <h3>Visitor Counting Rules</h3>
        <p className="amx-modal-sub">Controls how sessions, new-vs-returning visitors, and "online now" are defined.</p>

        {!form ? (
          <p className="amx-panel-sub">Loading…</p>
        ) : (
          <>
            <div className="amx-form-group">
              <label>Session timeout (minutes)</label>
              <input type="number" min="1" value={form.sessionTimeoutMinutes} onChange={setField("sessionTimeoutMinutes")} />
              <span className="amx-field-hint">A gap longer than this between page views starts a new session.</span>
            </div>
            <div className="amx-form-group">
              <label>"Online now" window (seconds)</label>
              <input type="number" min="10" value={form.onlineWindowSeconds} onChange={setField("onlineWindowSeconds")} />
              <span className="amx-field-hint">A session counts as active if its last activity was within this many seconds.</span>
            </div>
            <div className="amx-form-group">
              <label>Returning-visitor window (days)</label>
              <input type="number" min="1" value={form.returningWindowDays} onChange={setField("returningWindowDays")} />
              <span className="amx-field-hint">A visitor whose last visit was longer ago than this counts as "new" again.</span>
            </div>
            <div className="amx-form-group">
              <label>IP address retention (days)</label>
              <input type="number" min="1" value={form.ipRetentionDays} onChange={setField("ipRetentionDays")} />
              <span className="amx-field-hint">IP addresses are cleared from older sessions automatically after this many days.</span>
            </div>
            <div className="amx-form-group">
              <label>Public counter counts</label>
              <select value={form.publicCounterMode} onChange={setField("publicCounterMode")}>
                <option value="unique_visitors">Unique visitors</option>
                <option value="sessions">Sessions</option>
              </select>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input type="checkbox" checked={form.countBots} onChange={setField("countBots")} />
              Count detected bots/crawlers
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <input type="checkbox" checked={form.trackingEnabled} onChange={setField("trackingEnabled")} />
              Tracking enabled
            </label>

            {error && <div className="amx-field-error"><Icon name="info" size={14} />{error}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
              <button type="button" className="amx-btn amx-btn-primary" style={{ flex: 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VisitorSettingsModal;
