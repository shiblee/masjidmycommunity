import React from "react";
import Icon from "../components/Icons.jsx";
import { PROJECTS, currency } from "../mockData.js";

const ALLOCATION = [
  { label: "Relief & Emergency Aid", pct: 34, color: "#5E9A2C" },
  { label: "Infrastructure & Renovation", pct: 28, color: "#1E3A46" },
  { label: "Education Programs", pct: 18, color: "#C9A227" },
  { label: "Community Development", pct: 12, color: "#2A4E5C" },
  { label: "Operations & Platform", pct: 8, color: "#C24B3F" },
];

function Donut() {
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {ALLOCATION.map((a) => {
          const dash = (a.pct / 100) * c;
          const el = (
            <circle
              key={a.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </g>
      <text x="50%" y="47%" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--a-text)" fontFamily="var(--sans)">
        ₹4.82M
      </text>
      <text x="50%" y="60%" textAnchor="middle" fontSize="11" fill="var(--a-text-faint)" fontFamily="var(--mono)">
        Total Disbursed
      </text>
    </svg>
  );
}

function FundUtilization() {
  const rows = PROJECTS.map((p) => ({
    ...p,
    utilization: Math.round((p.spent / p.budget) * 100),
  }));

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Impact</span>
          <h1>Fund Utilization</h1>
          <p>How donated funds are allocated and disbursed across projects</p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-outline">
            <Icon name="download" size={16} />
            Download Report
          </button>
        </div>
      </div>

      <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#5E9A2C1a", color: "#5E9A2C" }}>
              <Icon name="wallet" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">₹4.82M</div>
            <div className="amx-kpi-label">Total Funds Disbursed</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#5E9A2C1a", color: "#5E9A2C" }}>
              <Icon name="target" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">92%</div>
            <div className="amx-kpi-label">Program Spend Ratio</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#C9A2271a", color: "#C9A227" }}>
              <Icon name="reports" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">8%</div>
            <div className="amx-kpi-label">Operations Overhead</div>
          </div>
        </div>
      </div>

      <div className="amx-grid-2" style={{ marginBottom: 18 }}>
        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Allocation by Category</h3>
              <div className="amx-panel-sub">Share of total disbursed funds</div>
            </div>
          </div>
          <div className="amx-ring-row">
            <Donut />
            <ul className="amx-ring-list">
              {ALLOCATION.map((a) => (
                <li key={a.label}>
                  <i style={{ background: a.color }} />
                  {a.label}
                  <strong>{a.pct}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Utilization by Project</h3>
              <div className="amx-panel-sub">Budget spent vs. allocated</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {rows.slice(0, 4).map((p) => (
              <div key={p.id}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: "var(--a-text)" }}>{p.name}</span>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--a-text-dim)" }}>{p.utilization}%</span>
                </div>
                <div className="amx-progress">
                  <span style={{ width: `${Math.min(p.utilization, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-panel-head">
          <div>
            <h3>Fund Utilization Reports</h3>
            <div className="amx-panel-sub">Per-project breakdown of allocated and spent funds</div>
          </div>
        </div>
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Masjid</th>
                <th>Allocated</th>
                <th>Spent</th>
                <th>Utilization</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="amx-cell-sub">{p.masjid}</td>
                  <td className="num">{currency(p.budget)}</td>
                  <td className="num">{currency(p.spent)}</td>
                  <td>{p.utilization}%</td>
                  <td>
                    <span className={`amx-badge ${p.status === "completed" ? "amx-badge-ok" : "amx-badge-warn"}`}>
                      <span className="amx-badge-dot" />
                      {p.status === "completed" ? "Complete" : "In Progress"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default FundUtilization;
