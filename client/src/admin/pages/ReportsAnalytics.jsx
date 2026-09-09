import React from "react";
import Icon from "../components/Icons.jsx";
import TrendChart from "../components/TrendChart.jsx";
import { CAMPAIGNS, MASJIDS, currency } from "../mockData.js";

const REGION_DATA = [
  { region: "Asia", value: 1840000, color: "#5E9A2C" },
  { region: "Europe", value: 1320000, color: "#1E3A46" },
  { region: "Americas", value: 980000, color: "#C9A227" },
  { region: "Africa", value: 460000, color: "#2A4E5C" },
  { region: "Oceania", value: 220000, color: "#C24B3F" },
];

function BarChart() {
  const max = Math.max(...REGION_DATA.map((r) => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 6 }}>
      {REGION_DATA.map((r) => (
        <div key={r.region}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, color: "var(--a-text)" }}>{r.region}</span>
            <span style={{ fontFamily: "var(--mono)", color: "var(--a-text-dim)" }}>{currency(r.value)}</span>
          </div>
          <div style={{ height: 10, background: "var(--a-bg)", borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(r.value / max) * 100}%`, background: r.color, borderRadius: 100, transition: "width .6s var(--a-ease)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsAnalytics() {
  const topCampaigns = [...CAMPAIGNS].sort((a, b) => b.raised - a.raised).slice(0, 5);
  const topMasjids = [...MASJIDS].sort((a, b) => b.raised - a.raised).slice(0, 5);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Insights</span>
          <h1>Reports &amp; Analytics</h1>
          <p>Platform-wide performance across masjids, campaigns, and donors</p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-outline">
            <Icon name="download" size={16} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#5E9A2C1a", color: "#5E9A2C" }}>
              <Icon name="trendUp" />
            </div>
            <span className="amx-kpi-delta up">
              <Icon name="trendUp" />
              +3.4%
            </span>
          </div>
          <div>
            <div className="amx-kpi-value">4.8%</div>
            <div className="amx-kpi-label">Visitor → Donor Conversion</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#C9A2271a", color: "#C9A227" }}>
              <Icon name="wallet" />
            </div>
            <span className="amx-kpi-delta up">
              <Icon name="trendUp" />
              +5.9%
            </span>
          </div>
          <div>
            <div className="amx-kpi-value">₹3,140</div>
            <div className="amx-kpi-label">Average Donation Size</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#5E9A2C1a", color: "#5E9A2C" }}>
              <Icon name="donors" />
            </div>
            <span className="amx-kpi-delta up">
              <Icon name="trendUp" />
              +2.1%
            </span>
          </div>
          <div>
            <div className="amx-kpi-value">61%</div>
            <div className="amx-kpi-label">Donor Retention Rate</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#C24B3F1a", color: "#C24B3F" }}>
              <Icon name="target" />
            </div>
            <span className="amx-kpi-delta down">
              <Icon name="trendDown" />
              -1.2%
            </span>
          </div>
          <div>
            <div className="amx-kpi-value">78%</div>
            <div className="amx-kpi-label">Campaign Success Rate</div>
          </div>
        </div>
      </div>

      <div className="amx-grid-2" style={{ marginBottom: 18 }}>
        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Fundraising Trends</h3>
              <div className="amx-panel-sub">Funds raised vs. target pace</div>
            </div>
          </div>
          <TrendChart />
        </div>
        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Funds Raised by Region</h3>
              <div className="amx-panel-sub">Cumulative, all time</div>
            </div>
          </div>
          <BarChart />
        </div>
      </div>

      <div className="amx-grid-2">
        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Top Performing Campaigns</h3>
            </div>
          </div>
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Category</th>
                  <th>Raised</th>
                </tr>
              </thead>
              <tbody>
                {topCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td className="amx-cell-sub">{c.category}</td>
                    <td className="num">{currency(c.raised)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Top Masjids by Impact</h3>
            </div>
          </div>
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Masjid</th>
                  <th>Location</th>
                  <th>Raised</th>
                </tr>
              </thead>
              <tbody>
                {topMasjids.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td className="amx-cell-sub">
                      {m.city}, {m.country}
                    </td>
                    <td className="num">{currency(m.raised)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default ReportsAnalytics;
