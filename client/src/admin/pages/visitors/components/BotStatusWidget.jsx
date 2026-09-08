import React, { useEffect, useRef, useState } from "react";
import Icon from "../../../components/Icons.jsx";
import adminApi from "../../../services/adminApi.js";
import { formatDateTime } from "../../../../utils/formatDateTime.js";

// Read-only monitoring for the synthetic visitor bot (configured under
// Settings → Visitor Bot) — polling only, since this is glance-at
// information rather than something that needs sub-second live updates
// like OnlineNowWidget's real visitor feed.
function useBotStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let stopped = false;
    const load = () => adminApi.get("/visitors/bot/status").then(({ data }) => !stopped && setStatus(data)).catch(() => {});
    load();
    const interval = setInterval(load, 15000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, []);
  return status;
}

function BotStatusWidget() {
  const status = useBotStatus();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!status) return null;

  return (
    <span style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button
        type="button"
        className="amx-btn amx-btn-outline amx-btn-sm"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8 }}
        title="Synthetic visitor bot status"
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: status.enabled ? "#C9942C" : "var(--a-border)", flexShrink: 0 }} />
        Visitor Bot: {status.enabled ? "Running" : "Off"}
      </button>

      {open && (
        <div
          className="amx-card"
          style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 300, zIndex: 50, padding: 14, boxShadow: "var(--a-shadow-lg)" }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Synthetic Visitor Bot</div>
          <div className="amx-cell-sub" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Status</span><strong>{status.schedulerStatus === "running" ? "Running" : "Stopped"}</strong>
          </div>
          <div className="amx-cell-sub" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Configured</span><strong>{status.visitorsPerHour}/hour</strong>
          </div>
          <div className="amx-cell-sub" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Generated this hour</span><strong>{status.generatedThisHour}</strong>
          </div>
          <div className="amx-cell-sub" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Generated today</span><strong>{status.generatedToday}</strong>
          </div>
          {status.enabled && status.estimatedNextVisit && (
            <div className="amx-cell-sub" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>Next visit (est.)</span><strong>{formatDateTime(status.estimatedNextVisit)}</strong>
            </div>
          )}
          {status.lastGenerated && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--a-border)" }}>
              <div className="amx-cell-sub" style={{ marginBottom: 2 }}>Last generated</div>
              <div style={{ fontSize: 13 }}>{status.lastGenerated.city}, {status.lastGenerated.country} · {status.lastGenerated.deviceType} / {status.lastGenerated.browser}</div>
            </div>
          )}
          {status.lastError && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--a-border)", color: "var(--a-danger)" }}>
              <Icon name="info" size={13} /> {status.lastError.message}
            </div>
          )}
          <div className="amx-panel-sub" style={{ marginTop: 10 }}>Configure under Settings → Visitor Bot.</div>
        </div>
      )}
    </span>
  );
}

export default BotStatusWidget;
