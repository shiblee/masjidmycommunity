import React, { useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import { DONORS, currency } from "../mockData.js";

const TIER_BADGE = {
  Champion: "amx-badge-ok",
  Regular: "amx-badge-neutral",
  New: "amx-badge-warn",
};

function Donors() {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("all");

  const filtered = useMemo(() => {
    return DONORS.filter((d) => {
      const matchesQuery = !query.trim() || d.name.toLowerCase().includes(query.toLowerCase()) || d.email.toLowerCase().includes(query.toLowerCase());
      const matchesTier = tier === "all" || d.tier === tier;
      return matchesQuery && matchesTier;
    });
  }, [query, tier]);

  const totalDonated = DONORS.reduce((s, d) => s + d.total, 0);
  const avgDonation = Math.round(totalDonated / DONORS.reduce((s, d) => s + d.donations, 0));
  const topDonor = [...DONORS].sort((a, b) => b.total - a.total)[0];

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Community</span>
          <h1>Donors</h1>
          <p>{DONORS.length} donors on record across all campaigns</p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-outline">
            <Icon name="download" size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="amx-kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#5E9A2C1a", color: "#5E9A2C" }}>
              <Icon name="donors" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">12,860</div>
            <div className="amx-kpi-label">Total Donors</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#C9A2271a", color: "#C9A227" }}>
              <Icon name="wallet" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">{currency(avgDonation)}</div>
            <div className="amx-kpi-label">Average Donation</div>
          </div>
        </div>
        <div className="amx-card amx-kpi">
          <div className="amx-kpi-top">
            <div className="amx-kpi-icon" style={{ background: "#5E9A2C1a", color: "#5E9A2C" }}>
              <Icon name="target" />
            </div>
          </div>
          <div>
            <div className="amx-kpi-value">{topDonor.name}</div>
            <div className="amx-kpi-label">Top Donor · {currency(topDonor.total)}</div>
          </div>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search donors by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="amx-select" value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">All tiers</option>
            <option value="Champion">Champion</option>
            <option value="Regular">Regular</option>
            <option value="New">New</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="amx-empty">
            <Icon name="donors" />
            <strong>No donors match your filters</strong>
            <span>Try a different search term or tier filter.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Email</th>
                  <th>Donations</th>
                  <th>Total Given</th>
                  <th>Donor Since</th>
                  <th>Tier</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="amx-cell-main">
                        <span className="amx-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                          {d.initials}
                        </span>
                        {d.name}
                      </div>
                    </td>
                    <td>{d.email}</td>
                    <td>{d.donations}</td>
                    <td className="num">{currency(d.total)}</td>
                    <td>{d.since}</td>
                    <td>
                      <span className={`amx-badge ${TIER_BADGE[d.tier]}`}>
                        <span className="amx-badge-dot" />
                        {d.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default Donors;
