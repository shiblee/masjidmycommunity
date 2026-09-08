import React from "react";
import Icon from "../../../components/Icons.jsx";

const DIRECTION_ICON = { up: "trendUp", down: "trendDown", attention: "flag", neutral: "activity" };
const DIRECTION_COLOR = { up: "#5E9A2C", down: "#C24B3F", attention: "#C9942C", neutral: "#2C7A9C" };

// Every card here comes straight from a real aggregation query
// (visitorInsightsService.js) — nothing here is a generic/fabricated
// statement, and the panel simply doesn't render when there isn't enough
// data yet to say something meaningful (the service omits those itself).
function VisitorInsights({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
      <div className="amx-panel-head"><h3>Insights</h3></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {insights.map((insight) => (
          <div
            key={insight.key}
            style={{
              display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px",
              borderRadius: "var(--a-radius-sm)", background: "var(--a-bg)", border: "1px solid var(--a-border)",
            }}
          >
            <span style={{ color: DIRECTION_COLOR[insight.direction] || DIRECTION_COLOR.neutral, flexShrink: 0, marginTop: 2 }}>
              <Icon name={DIRECTION_ICON[insight.direction] || "activity"} size={16} />
            </span>
            <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>{insight.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VisitorInsights;
