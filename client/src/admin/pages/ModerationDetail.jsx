import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

function Section({ title, children }) {
  return (
    <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
      <div className="amx-panel-head"><h3>{title}</h3></div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span className="amx-panel-sub" style={{ display: "block" }}>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function ModerationDetail() {
  const { targetType, targetId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [reports, setReports] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = () => {
    adminApi.get(`/moderation/content/${targetType}/${targetId}`).then(({ data }) => {
      setContent(data.content);
      setReports(data.reports);
    });
  };

  useEffect(() => { load(); }, [targetType, targetId]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const act = async (action, successMsg) => {
    setBusy(true);
    try {
      await adminApi.post(`/moderation/content/${targetType}/${targetId}/action`, { action });
      load();
      showToast(successMsg);
    } catch (err) {
      showToast(err.response?.data?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (!content) return <div className="amx-empty"><Icon name="flag" /><strong>Loading…</strong></div>;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/moderation")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Reported Content
          </button>
          <h1 style={{ marginTop: 10 }}>{content.name}</h1>
          <p>{content.contentTypeLabel} · {content.reportCount} report{content.reportCount === 1 ? "" : "s"} (threshold {content.threshold})</p>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center" }}>
          <StatusBadge status={content.status} />
        </div>
      </div>

      <div className="amx-editor-layout">
        <div>
          <Section title="Content Owner">
            <Row label="Name" value={content.owner?.fullName} />
            <Row label="Email" value={content.owner?.email} />
          </Section>

          <Section title="Content Details">
            <Row label="Content Type" value={content.contentTypeLabel} />
            <Row label="Name / Title" value={content.name} />
            {content.targetType === "comment" && (
              <Row label="On Post" value={content.activityId ? `Wall post #${content.activityId}` : null} />
            )}
            {(content.targetType === "masjid" || content.targetType === "campaign") && (
              <>
                <Row label="Approval Status" value={content.raw.status} />
                <Row label="Location" value={[content.raw.city, content.raw.country].filter(Boolean).join(", ")} />
              </>
            )}
            <Row label="Moderation Status" value={content.status === "under_review" ? "Under Review / Temporarily Hidden" : "Active"} />
            <Row label="Last Reviewed" value={content.moderationReviewedAt ? formatDateTime(content.moderationReviewedAt) : "Not yet reviewed"} />
          </Section>

          <Section title={`Individual Reports (${reports.length})`}>
            {reports.map((r) => (
              <div key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--a-border)" }}>
                <strong>{r.reason}</strong>
                <span className="amx-panel-sub" style={{ marginLeft: 8 }}>
                  {formatDateTime(r.createdAt)} · {r.reporter?.fullName || "Unknown user"}{r.reporter?.email ? ` (${r.reporter.email})` : ""}
                </span>
                {r.comment && <p style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{r.comment}</p>}
                {r.status === "closed" && <span className="amx-panel-sub">Closed</span>}
              </div>
            ))}
            {reports.length === 0 && <p>No reports on file.</p>}
          </Section>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head"><h3>Moderation Actions</h3></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {content.status === "under_review" ? (
              <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => act("keep_active", "Content restored and reports cleared.")}>
                <Icon name="check" size={16} /> Keep Active
              </button>
            ) : (
              <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => act("resolve", "Reports cleared as invalid.")}>
                <Icon name="check" size={16} /> Resolve / Clear Reports
              </button>
            )}
            <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => act("keep_hidden", "Marked as reviewed — still hidden.")}>
              Keep Hidden
            </button>
            <button className="amx-btn amx-btn-outline" style={{ color: "#C24B3F", borderColor: "#C24B3F" }} disabled={busy} onClick={() => act("remove", "Content removed.")}>
              <Icon name="trash" size={15} /> Remove Content
            </button>
          </div>
        </div>
      </div>

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}
    </>
  );
}

export default ModerationDetail;
