import React, { useEffect, useRef, useState } from "react";
import adminApi from "../../../services/adminApi.js";
import { API_BASE } from "../../../../config.js";

function formatDuration(seconds) {
  const s = Number(seconds) || 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

// Live, self-healing "Online Now" indicator. EventSource can't carry the
// admin's Bearer token, so this exchanges it for a short-lived (60s) ticket
// first (see adminVisitorController.js's issueStreamTicket/streamOnline) —
// and since that ticket expires, a dropped connection gets a *fresh* ticket
// before reconnecting rather than relying on EventSource's own retry (which
// would just keep reusing the now-expired one). Falls back to polling
// entirely if streaming repeatedly fails to connect.
function useOnlineVisitors() {
  const [data, setData] = useState({ onlineCount: 0, sessions: [] });
  const esRef = useRef(null);
  const pollRef = useRef(null);
  const failuresRef = useRef(0);
  const stoppedRef = useRef(false);

  const poll = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      adminApi.get("/visitors/online").then(({ data }) => setData(data)).catch(() => {});
    }, 10000);
    adminApi.get("/visitors/online").then(({ data }) => setData(data)).catch(() => {});
  };

  const connect = async () => {
    if (stoppedRef.current) return;
    try {
      const { data: ticketData } = await adminApi.post("/visitors/stream-ticket");
      const es = new EventSource(`${API_BASE}/admin/visitors/stream?ticket=${ticketData.ticket}`);
      esRef.current = es;
      es.onmessage = (e) => {
        failuresRef.current = 0;
        try {
          setData(JSON.parse(e.data));
        } catch {
          // ignore a malformed event
        }
      };
      es.onerror = () => {
        es.close();
        failuresRef.current += 1;
        if (failuresRef.current >= 3) {
          poll();
        } else {
          setTimeout(connect, 1000);
        }
      };
    } catch {
      poll();
    }
  };

  useEffect(() => {
    stoppedRef.current = false;
    connect();
    return () => {
      stoppedRef.current = true;
      esRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return data;
}

function OnlineNowWidget() {
  const { onlineCount, sessions } = useOnlineVisitors();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <span style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button
        type="button"
        className="amx-btn amx-btn-outline amx-btn-sm"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: onlineCount > 0 ? "#5E9A2C" : "var(--a-border)", flexShrink: 0 }} />
        {onlineCount} Visitor{onlineCount === 1 ? "" : "s"} Online Now
      </button>

      {open && (
        <div
          className="amx-card"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxHeight: 400, overflowY: "auto",
            zIndex: 50, padding: 12, boxShadow: "var(--a-shadow-lg)",
          }}
        >
          {sessions.length === 0 ? (
            <div className="amx-panel-sub" style={{ padding: 12, textAlign: "center" }}>No one online right now.</div>
          ) : (
            sessions.map((s) => (
              <div key={s.sessionKey} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 4px", borderBottom: "1px solid var(--a-border)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Visitor #{s.visitorId}</div>
                  <div className="amx-cell-sub">{s.currentPath} · {s.country || "Unknown"}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div className="amx-cell-sub" style={{ textTransform: "capitalize" }}>{s.deviceType || "—"}</div>
                  <div className="amx-cell-sub">{formatDuration(s.durationSeconds)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </span>
  );
}

export default OnlineNowWidget;
