import React, { useState } from "react";

// Small hand-rolled SVG bar chart for a daily activity series (30 bars) —
// deliberately separate from TrendChart.jsx, which is a hardcoded two-line
// revenue widget with no props at all; this one is generic and prop-driven
// so it can be reused anywhere a { date, count } series needs charting,
// without touching TrendChart's two existing hardcoded callers.
const W = 620;
const H = 160;
const PAD_L = 4;
const PAD_R = 4;
const PAD_T = 10;
const PAD_B = 20;

function formatDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function ActivityBarChart({ data }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const gap = 2;
  const barW = innerW / data.length - gap;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="160" style={{ overflow: "visible" }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD_L} x2={W - PAD_R} y1={PAD_T + innerH * (1 - f)} y2={PAD_T + innerH * (1 - f)} stroke="rgba(30,58,70,.08)" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const x = PAD_L + i * (barW + gap);
          const barH = (d.count / maxVal) * innerH;
          const y = PAD_T + innerH - barH;
          const isToday = i === data.length - 1;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={Math.max(barW, 1)}
              height={Math.max(barH, d.count > 0 ? 2 : 0)}
              fill={isToday ? "var(--a-gold)" : "var(--a-green-deep)"}
              opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.45}
              rx="1.5"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => (
          <text key={i} x={PAD_L + i * (barW + gap) + barW / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--a-text-faint)" fontFamily="var(--mono)">
            {formatDay(data[i].date)}
          </text>
        ))}
      </svg>
      {hoverIdx != null && (
        <div
          className="amx-chart-tooltip"
          style={{ left: `${((PAD_L + hoverIdx * (barW + gap) + barW / 2) / W) * 100}%`, top: "10%" }}
        >
          <strong>{data[hoverIdx].count} action{data[hoverIdx].count === 1 ? "" : "s"}</strong>
          {formatDay(data[hoverIdx].date)}
        </div>
      )}
    </div>
  );
}

export default ActivityBarChart;
