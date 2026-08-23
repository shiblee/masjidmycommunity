import React, { useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { PROJECTS, currency } from "../mockData.js";

function Projects() {
  const [tab, setTab] = useState("ongoing");

  const filtered = useMemo(() => PROJECTS.filter((p) => p.status === tab), [tab]);
  const ongoingCount = PROJECTS.filter((p) => p.status === "ongoing").length;
  const completedCount = PROJECTS.filter((p) => p.status === "completed").length;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Impact</span>
          <h1>Projects</h1>
          <p>
            {ongoingCount} ongoing · {completedCount} completed
          </p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-accent">
            <Icon name="plus" size={16} />
            New Project
          </button>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 20, width: "fit-content" }}>
          <button className={tab === "ongoing" ? "active" : ""} onClick={() => setTab("ongoing")}>
            Ongoing ({ongoingCount})
          </button>
          <button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>
            Completed ({completedCount})
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((p) => {
            const pct = Math.round((p.spent / p.budget) * 100);
            return (
              <div key={p.id} style={{ display: "flex", gap: 18, alignItems: "center", padding: "16px 0", borderBottom: "1px solid var(--a-border)" }}>
                <div className="amx-verify-thumb" style={{ flexShrink: 0 }}>
                  <Icon name="projects" />
                </div>
                <div style={{ flex: "1 1 260px", minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ fontSize: 14, color: "var(--a-text)" }}>{p.name}</strong>
                    <StatusBadge status={p.status} />
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--a-text-faint)", marginTop: 2 }}>{p.masjid}</div>
                  <div style={{ fontSize: 12.5, color: "var(--a-text-dim)", marginTop: 6 }}>{p.milestone}</div>
                </div>
                <div style={{ flex: "1 1 220px", maxWidth: 260 }}>
                  <div className="amx-progress">
                    <span style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11.5, color: "var(--a-text-faint)", fontFamily: "var(--mono)" }}>
                    <span>{currency(p.spent)}</span>
                    <span>of {currency(p.budget)}</span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right", minWidth: 110 }}>
                  <div style={{ fontSize: 12, color: "var(--a-text-faint)", display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                    <Icon name="clock" size={13} />
                    {p.eta}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default Projects;
