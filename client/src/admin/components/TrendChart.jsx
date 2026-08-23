import React, { useMemo, useRef, useState } from "react";

const DATASETS = {
  "12M": [
    { l: "Sep", raised: 1240, goal: 1400 },
    { l: "Oct", raised: 1380, goal: 1450 },
    { l: "Nov", raised: 1290, goal: 1450 },
    { l: "Dec", raised: 1620, goal: 1550 },
    { l: "Jan", raised: 1510, goal: 1600 },
    { l: "Feb", raised: 1740, goal: 1650 },
    { l: "Mar", raised: 1980, goal: 1800 },
    { l: "Apr", raised: 1860, goal: 1850 },
    { l: "May", raised: 2120, goal: 1950 },
    { l: "Jun", raised: 2340, goal: 2100 },
    { l: "Jul", raised: 2480, goal: 2250 },
    { l: "Aug", raised: 2610, goal: 2400 },
  ],
  "90D": [
    { l: "W1", raised: 480, goal: 500 },
    { l: "W2", raised: 560, goal: 520 },
    { l: "W3", raised: 610, goal: 560 },
    { l: "W4", raised: 590, goal: 580 },
    { l: "W5", raised: 690, goal: 620 },
    { l: "W6", raised: 740, goal: 660 },
    { l: "W7", raised: 810, goal: 700 },
    { l: "W8", raised: 860, goal: 750 },
    { l: "W9", raised: 920, goal: 800 },
    { l: "W10", raised: 980, goal: 850 },
    { l: "W11", raised: 1040, goal: 900 },
    { l: "W12", raised: 1120, goal: 950 },
  ],
  "7D": [
    { l: "Mon", raised: 118, goal: 100 },
    { l: "Tue", raised: 142, goal: 110 },
    { l: "Wed", raised: 129, goal: 115 },
    { l: "Thu", raised: 168, goal: 120 },
    { l: "Fri", raised: 201, goal: 130 },
    { l: "Sat", raised: 244, goal: 150 },
    { l: "Sun", raised: 226, goal: 155 },
  ],
};

const W = 620;
const H = 220;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 14;
const PAD_B = 26;

function buildPath(points, key, maxVal) {
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const step = innerW / (points.length - 1);
  return points.map((p, i) => {
    const x = PAD_L + step * i;
    const y = PAD_T + innerH - (p[key] / maxVal) * innerH;
    return { x, y, ...p };
  });
}

function smoothPath(coords) {
  if (coords.length < 2) return "";
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const c1 = coords[i];
    const c2 = coords[i + 1];
    const midX = (c1.x + c2.x) / 2;
    d += ` C ${midX} ${c1.y}, ${midX} ${c2.y}, ${c2.x} ${c2.y}`;
  }
  return d;
}

function TrendChart() {
  const [range, setRange] = useState("12M");
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const points = DATASETS[range];
  const maxVal = useMemo(() => Math.max(...points.map((p) => Math.max(p.raised, p.goal))) * 1.15, [points]);

  const raisedCoords = useMemo(() => buildPath(points, "raised", maxVal), [points, maxVal]);
  const goalCoords = useMemo(() => buildPath(points, "goal", maxVal), [points, maxVal]);

  const raisedLine = smoothPath(raisedCoords);
  const goalLine = smoothPath(goalCoords);
  const areaPath = `${raisedLine} L ${raisedCoords[raisedCoords.length - 1].x} ${H - PAD_B} L ${raisedCoords[0].x} ${H - PAD_B} Z`;

  const handleMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const step = (W - PAD_L - PAD_R) / (points.length - 1);
    let idx = Math.round((relX - PAD_L) / step);
    idx = Math.max(0, Math.min(points.length - 1, idx));
    setHoverIdx(idx);
  };

  const active = hoverIdx != null ? raisedCoords[hoverIdx] : null;
  const activeGoal = hoverIdx != null ? goalCoords[hoverIdx] : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div className="amx-chart-legend">
          <span>
            <i style={{ background: "var(--a-green)" }} /> Funds raised
          </span>
          <span>
            <i style={{ background: "var(--a-gold)" }} /> Target pace
          </span>
        </div>
        <div className="amx-tabs">
          {["7D", "90D", "12M"].map((r) => (
            <button key={r} className={range === r ? "active" : ""} onClick={() => { setRange(r); setHoverIdx(null); }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="220"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
          style={{ overflow: "visible", cursor: "crosshair" }}
        >
          <defs>
            <linearGradient id="amxAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8DC63F" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#8DC63F" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={PAD_L}
              x2={W - PAD_R}
              y1={PAD_T + (H - PAD_T - PAD_B) * f}
              y2={PAD_T + (H - PAD_T - PAD_B) * f}
              stroke="rgba(30,58,70,.08)"
              strokeWidth="1"
            />
          ))}

          <path d={areaPath} fill="url(#amxAreaFill)" />
          <path d={goalLine} fill="none" stroke="var(--a-gold)" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
          <path d={raisedLine} fill="none" stroke="var(--a-green-deep)" strokeWidth="2.5" strokeLinecap="round" />

          {raisedCoords.map((c, i) => (
            <circle key={i} cx={c.x} cy={c.y} r={hoverIdx === i ? 5 : 0} fill="#fff" stroke="var(--a-green-deep)" strokeWidth="2.5" />
          ))}

          {hoverIdx != null && (
            <line x1={active.x} x2={active.x} y1={PAD_T} y2={H - PAD_B} stroke="rgba(30,58,70,.18)" strokeWidth="1" />
          )}

          {points.map((p, i) => (
            <text
              key={p.l}
              x={raisedCoords[i].x}
              y={H - 6}
              textAnchor="middle"
              fontSize="10.5"
              fill="rgba(23,38,44,.42)"
              fontFamily="var(--mono)"
            >
              {p.l}
            </text>
          ))}
        </svg>

        {hoverIdx != null && active && (
          <div
            className="amx-chart-tooltip"
            style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100}%` }}
          >
            <strong>₹{(active.raised * 1000).toLocaleString("en-IN")}</strong>
            {points[hoverIdx].l} · target ₹{(activeGoal.goal * 1000).toLocaleString("en-IN")}
          </div>
        )}
      </div>
    </div>
  );
}

export default TrendChart;
