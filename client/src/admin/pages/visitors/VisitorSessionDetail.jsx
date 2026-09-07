import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../../components/Icons.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDateTime } from "../../../utils/formatDateTime.js";

function formatDuration(seconds) {
  const s = Number(seconds) || 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

const STATUS_MAP = { active: "ok", idle: "warn", ended: "neutral" };

function InfoRow({ label, children }) {
  return (
    <div className="amx-hub-snapshot-row" style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--a-border)" }}>
      <span className="amx-panel-sub">{label}</span>
      <strong>{children ?? "—"}</strong>
    </div>
  );
}

function VisitorSessionDetail() {
  const { sessionKey } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    adminApi
      .get(`/visitors/sessions/${sessionKey}`)
      .then(({ data }) => setData(data))
      .catch(() => setNotFound(true));
  }, [sessionKey]);

  if (notFound) {
    return (
      <div className="amx-empty">
        <Icon name="eye" />
        <strong>Session not found</strong>
        <button className="amx-btn amx-btn-outline" style={{ marginTop: 12 }} onClick={() => navigate("/admin/visitors")}>
          Back to Visitors
        </button>
      </div>
    );
  }
  if (!data) return <div className="amx-empty"><Icon name="eye" /><strong>Loading…</strong></div>;

  const { session, visitor, pageViews } = data;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/visitors")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Visitors
          </button>
          <h1 style={{ marginTop: 10 }}>Visitor #{session.visitorId}</h1>
          <p>Session {session.sessionKey}</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center", gap: 10 }}>
          <StatusBadge status={session.visitorType === "new" ? "ok" : "neutral"} label={session.visitorType === "new" ? "New Visitor" : "Returning Visitor"} />
          <StatusBadge status={STATUS_MAP[session.status] || "neutral"} label={session.status[0].toUpperCase() + session.status.slice(1)} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="amx-card amx-panel">
          <div className="amx-panel-head"><h3>Visitor Overview</h3></div>
          <InfoRow label="Visitor ID">#{session.visitorId}</InfoRow>
          <InfoRow label="Session ID">{session.sessionKey}</InfoRow>
          <InfoRow label="First Visit">{visitor ? formatDateTime(visitor.firstSeenAt) : "—"}</InfoRow>
          <InfoRow label="Last Visit">{visitor ? formatDateTime(visitor.lastSeenAt) : "—"}</InfoRow>
          <InfoRow label="Total Sessions">{visitor?.totalSessions ?? "—"}</InfoRow>
          <InfoRow label="Device">{session.deviceType} {session.deviceName ? `(${session.deviceName})` : ""}</InfoRow>
          <InfoRow label="Browser">{session.browser} {session.browserVersion}</InfoRow>
          <InfoRow label="OS">{session.os}</InfoRow>
          <InfoRow label="Location">{session.country || "Unknown"}</InfoRow>
          <InfoRow label="Language">{session.language}</InfoRow>
          <InfoRow label="Referrer">{session.referrerHost || "Direct"}</InfoRow>
          {(session.utmSource || session.utmMedium || session.utmCampaign) && (
            <InfoRow label="Campaign">{[session.utmSource, session.utmMedium, session.utmCampaign].filter(Boolean).join(" / ")}</InfoRow>
          )}
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head"><h3>Session Activity</h3></div>
          <InfoRow label="Landing Page">{session.landingPath}</InfoRow>
          <InfoRow label="Exit Page">{session.exitPath}</InfoRow>
          <InfoRow label="Entry Time">{formatDateTime(session.startedAt)}</InfoRow>
          <InfoRow label="Exit Time">{session.endedAt ? formatDateTime(session.endedAt) : "Still active / not yet ended"}</InfoRow>
          <InfoRow label="Duration">{formatDuration(session.durationSeconds)}</InfoRow>
          <InfoRow label="Pages Viewed">{session.pageCount}</InfoRow>
        </div>
      </div>

      <div className="amx-card amx-panel" style={{ marginTop: 20 }}>
        <div className="amx-panel-head"><h3>Page-by-Page Timeline</h3></div>
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Page</th>
                <th>Viewed At</th>
                <th>Time on Page</th>
              </tr>
            </thead>
            <tbody>
              {pageViews.map((p, i) => {
                const next = pageViews[i + 1];
                const dwellSeconds = next ? Math.round((new Date(next.viewedAt) - new Date(p.viewedAt)) / 1000) : null;
                return (
                  <tr key={p.id}>
                    <td>{p.sequence}</td>
                    <td>
                      <div>{p.path}</div>
                      {p.title && <div className="amx-cell-sub">{p.title}</div>}
                    </td>
                    <td>{formatDateTime(p.viewedAt)}</td>
                    <td>{dwellSeconds != null ? formatDuration(dwellSeconds) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default VisitorSessionDetail;
