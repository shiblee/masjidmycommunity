import React, { useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { CAMPAIGNS, currency } from "../mockData.js";

const CATEGORY_STYLE = {
  Relief: { bg: "linear-gradient(135deg,#5E9A2C,#8DC63F)", icon: "megaphone" },
  Infrastructure: { bg: "linear-gradient(135deg,#1E3A46,#2A4E5C)", icon: "building" },
  Education: { bg: "linear-gradient(135deg,#B8862F,#C9A227)", icon: "layers" },
  Community: { bg: "linear-gradient(135deg,#2A4E5C,#5E9A2C)", icon: "donors" },
};

const TABS = ["all", "active", "completed", "paused"];

function Campaigns() {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = ["all", ...Array.from(new Set(CAMPAIGNS.map((c) => c.category)))];

  const filtered = useMemo(() => {
    return CAMPAIGNS.filter((c) => {
      const matchesTab = tab === "all" || c.status === tab;
      const matchesCat = category === "all" || c.category === category;
      const matchesQuery = !query.trim() || c.name.toLowerCase().includes(query.toLowerCase()) || c.masjid.toLowerCase().includes(query.toLowerCase());
      return matchesTab && matchesCat && matchesQuery;
    });
  }, [tab, category, query]);

  const totalActive = CAMPAIGNS.filter((c) => c.status === "active").length;
  const totalRaised = CAMPAIGNS.reduce((s, c) => s + c.raised, 0);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Fundraising</span>
          <h1>Campaigns</h1>
          <p>
            {totalActive} active campaigns · {currency(totalRaised)} raised across all campaigns
          </p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-outline">
            <Icon name="download" size={16} />
            Export
          </button>
          <button className="amx-btn amx-btn-accent">
            <Icon name="plus" size={16} />
            New Campaign
          </button>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters" style={{ justifyContent: "space-between" }}>
          <div className="amx-tabs">
            {TABS.map((t) => (
              <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <div className="amx-search">
              <Icon name="search" />
              <input type="text" placeholder="Search campaigns…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="amx-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="amx-empty">
            <Icon name="campaign" />
            <strong>No campaigns match your filters</strong>
            <span>Try a different search term, category, or status tab.</span>
          </div>
        ) : (
          <div className="amx-campaign-grid">
            {filtered.map((c) => {
              const pct = Math.round((c.raised / c.goal) * 100);
              const style = CATEGORY_STYLE[c.category] || CATEGORY_STYLE.Relief;
              return (
                <div className="amx-campaign-card" key={c.id}>
                  <div className="amx-campaign-cover" style={{ background: style.bg }}>
                    <Icon name={style.icon} />
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="amx-campaign-body">
                    <div>
                      <h4>{c.name}</h4>
                      <div className="amx-campaign-masjid">{c.masjid}</div>
                    </div>
                    <div>
                      <div className="amx-progress">
                        <span style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <div className="amx-campaign-stats" style={{ marginTop: 7 }}>
                        <span>{currency(c.raised)} raised</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    <div className="amx-campaign-foot">
                      <span>
                        <Icon name="target" />
                        {currency(c.goal)} goal
                      </span>
                      <span>
                        <Icon name="clock" />
                        {c.status === "completed" ? "Ended" : c.ends}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default Campaigns;
