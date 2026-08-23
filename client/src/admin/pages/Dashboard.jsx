import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import TrendChart from "../components/TrendChart.jsx";
import adminApi from "../services/adminApi.js";

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

const USER_STATUS_BADGE = {
  active: { cls: "amx-badge-ok", label: "Active" },
  pending_verification: { cls: "amx-badge-warn", label: "Pending" },
  inactive: { cls: "amx-badge-neutral", label: "Inactive" },
  suspended: { cls: "amx-badge-danger", label: "Suspended" },
};

function Spark({ data, color }) {
  const w = 100;
  const h = 32;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  const areaPts = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg className="amx-kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height="32">
      <polygon points={areaPts} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const KPIS = [
  {
    label: "Total Registered Masjids",
    value: "1,284",
    delta: "+6.2%",
    up: true,
    icon: "mosque",
    color: "#5E9A2C",
    spark: [980, 1020, 1060, 1090, 1140, 1180, 1220, 1284],
  },
  {
    label: "Verified Masjids",
    value: "968",
    sub: "75.4% of total",
    delta: "+4.1%",
    up: true,
    icon: "verify",
    color: "#5E9A2C",
    spark: [760, 790, 820, 850, 880, 910, 940, 968],
  },
  {
    label: "Active Campaigns",
    value: "312",
    delta: "+11.8%",
    up: true,
    icon: "campaign",
    color: "#C9A227",
    spark: [210, 230, 240, 260, 275, 290, 300, 312],
  },
  {
    label: "Total Funds Raised",
    value: "₹4.82M",
    delta: "+18.4%",
    up: true,
    icon: "wallet",
    color: "#5E9A2C",
    spark: [2.1, 2.4, 2.8, 3.2, 3.6, 4.0, 4.4, 4.82],
  },
  {
    label: "Total Donations",
    value: "28,540",
    delta: "+9.7%",
    up: true,
    icon: "donation",
    color: "#C9A227",
    spark: [19200, 20800, 22100, 23600, 24900, 26200, 27400, 28540],
  },
  {
    label: "Total Donors",
    value: "12,860",
    delta: "+7.3%",
    up: true,
    icon: "donors",
    color: "#5E9A2C",
    spark: [9400, 9900, 10400, 10900, 11400, 11900, 12400, 12860],
  },
  {
    label: "Ongoing Projects",
    value: "146",
    delta: "-2.1%",
    up: false,
    icon: "projects",
    color: "#C24B3F",
    spark: [168, 164, 160, 156, 152, 150, 148, 146],
  },
  {
    label: "Completed Projects",
    value: "892",
    delta: "+14.5%",
    up: true,
    icon: "target",
    color: "#5E9A2C",
    spark: [640, 680, 720, 760, 800, 840, 870, 892],
  },
];

const CAMPAIGNS = [
  { name: "Winter Relief Drive", masjid: "Masjid Al-Falah, London", raised: 186400, goal: 200000 },
  { name: "Masjid Renovation Fund", masjid: "Green Valley Masjid, Toronto", raised: 412000, goal: 650000 },
  { name: "Ramadan Food Bank", masjid: "Baitul Aman Masjid, Dhaka", raised: 298500, goal: 300000 },
  { name: "Youth Education Fund", masjid: "Masjid Ar-Rahman, Cape Town", raised: 74200, goal: 150000 },
];

const DONATIONS = [
  { donor: "Yusuf Rahman", initials: "YR", campaign: "Winter Relief Drive", amount: 12500, date: "Aug 21, 2026", status: "ok" },
  { donor: "Anonymous", initials: "AN", campaign: "Masjid Al-Falah Renovation", amount: 5000, date: "Aug 21, 2026", status: "ok" },
  { donor: "Fatima Noor", initials: "FN", campaign: "Ramadan Food Bank", amount: 25000, date: "Aug 20, 2026", status: "ok" },
  { donor: "Ibrahim Malik", initials: "IM", campaign: "New Wudu Facility", amount: 8750, date: "Aug 20, 2026", status: "warn" },
  { donor: "Sana Ahmed", initials: "SA", campaign: "Youth Education Fund", amount: 3200, date: "Aug 19, 2026", status: "ok" },
  { donor: "Anonymous", initials: "AN", campaign: "Emergency Relief Fund", amount: 15000, date: "Aug 19, 2026", status: "ok" },
];

const VERIFICATIONS = [
  { name: "Green Valley Masjid", loc: "Toronto, Canada", time: "Submitted 2 days ago" },
  { name: "Baitul Aman Masjid", loc: "Dhaka, Bangladesh", time: "Submitted 3 days ago" },
  { name: "Masjid Al-Ihsan", loc: "Jakarta, Indonesia", time: "Submitted 5 days ago" },
  { name: "Noor Islamic Center", loc: "Houston, USA", time: "Submitted 6 days ago" },
];

const REGISTRATIONS = [
  { name: "Green Valley Masjid", loc: "Toronto, Canada", status: "warn", statusLabel: "Pending" },
  { name: "Masjid Al-Noor", loc: "Birmingham, UK", status: "ok", statusLabel: "Verified" },
  { name: "Baitul Aman Masjid", loc: "Dhaka, Bangladesh", status: "warn", statusLabel: "Pending" },
  { name: "Masjid Ar-Rahman", loc: "Cape Town, South Africa", status: "ok", statusLabel: "Verified" },
];

const ACTIVITIES = [
  { icon: "verify", color: "ok", text: <>Aisha Karim approved <strong>Masjid Al-Noor's</strong> verification.</>, time: "12m ago" },
  { icon: "megaphone", color: "warn", text: <>New campaign <strong>Clean Water Initiative</strong> launched by Masjid Al-Ihsan.</>, time: "1h ago" },
  { icon: "donation", color: "ok", text: <><strong>Yusuf Rahman</strong> contributed ₹12,500 to Winter Relief Drive.</>, time: "3h ago" },
  { icon: "fileText", color: "neutral", text: <>Fund utilization report for July was published.</>, time: "6h ago" },
  { icon: "building", color: "neutral", text: <><strong>Masjid Ar-Rahman</strong> updated their project milestones.</>, time: "1d ago" },
];

const QUICK_ACTIONS = [
  { icon: "plus", label: "Add Masjid", desc: "Register a new masjid profile", to: "/admin/masjids" },
  { icon: "campaign", label: "Create Campaign", desc: "Launch a new fundraising campaign", to: "/admin/campaigns" },
  { icon: "verify", label: "Review Verifications", desc: "4 requests awaiting review", to: "/admin/verification" },
  { icon: "reports", label: "Generate Report", desc: "Export fund-utilization report", to: "/admin/reports" },
];

function fmt(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function Dashboard() {
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    adminApi
      .get("/users")
      .then(({ data }) => setRegisteredUsers(data.users))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, []);

  const userCounts = {
    total: registeredUsers.length,
    active: registeredUsers.filter((u) => u.status === "active").length,
    pending: registeredUsers.filter((u) => u.status === "pending_verification").length,
  };
  const recentUsers = [...registeredUsers]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Overview</span>
          <h1>Dashboard</h1>
          <p>Welcome back, Aisha — here's how the platform is performing today.</p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-outline">
            <Icon name="download" size={16} />
            Export Report
          </button>
          <button className="amx-btn amx-btn-accent">
            <Icon name="plus" size={16} />
            New Campaign
          </button>
        </div>
      </div>

      <div className="amx-kpi-grid">
        {KPIS.map((k) => (
          <div className="amx-card amx-kpi" key={k.label}>
            <div className="amx-kpi-top">
              <div className="amx-kpi-icon" style={{ background: `${k.color}1a`, color: k.color }}>
                <Icon name={k.icon} />
              </div>
              <span className={`amx-kpi-delta ${k.up ? "up" : "down"}`}>
                <Icon name={k.up ? "trendUp" : "trendDown"} />
                {k.delta}
              </span>
            </div>
            <div>
              <div className="amx-kpi-value">{k.value}</div>
              <div className="amx-kpi-label">{k.sub ? `${k.label} · ${k.sub}` : k.label}</div>
            </div>
            <Spark data={k.spark} color={k.color} />
          </div>
        ))}
      </div>

      <div className="amx-grid-2" style={{ marginBottom: 18 }}>
        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Recent User Registrations</h3>
              <div className="amx-panel-sub">Newest public accounts on Masjid My Community</div>
            </div>
            <Link to="/admin/registered-users" className="amx-panel-link">
              View all
              <Icon name="arrowRight" />
            </Link>
          </div>
          {usersLoading ? (
            <div className="amx-empty">
              <Icon name="donors" />
              <strong>Loading registered users…</strong>
            </div>
          ) : recentUsers.length === 0 ? (
            <div className="amx-empty">
              <Icon name="donors" />
              <strong>No registered users yet</strong>
              <span>New signups will appear here.</span>
            </div>
          ) : (
            <div className="amx-table-wrap">
              <table className="amx-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Contact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => {
                    const badge = USER_STATUS_BADGE[u.status] || USER_STATUS_BADGE.inactive;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="amx-cell-main">
                            <span className="amx-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                              {initialsOf(u.fullName)}
                            </span>
                            {u.fullName}
                          </div>
                        </td>
                        <td>{u.email || u.mobile}</td>
                        <td>
                          <span className={`amx-badge ${badge.cls}`}>
                            <span className="amx-badge-dot" />
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Registered Users Overview</h3>
              <div className="amx-panel-sub">Account status breakdown</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, marginBottom: 26 }}>
            <div>
              <div className="amx-kpi-value">{userCounts.total}</div>
              <div className="amx-kpi-label">Total Registered</div>
            </div>
            <div>
              <div className="amx-kpi-value">{userCounts.active}</div>
              <div className="amx-kpi-label">Active</div>
            </div>
            <div>
              <div className="amx-kpi-value">{userCounts.pending}</div>
              <div className="amx-kpi-label">Pending Verification</div>
            </div>
          </div>
          <Link to="/admin/registered-users" className="amx-btn amx-btn-outline" style={{ width: "100%", justifyContent: "center" }}>
            Manage Registered Users
            <Icon name="arrowRight" size={16} />
          </Link>
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
              <h3>Campaign Performance</h3>
              <div className="amx-panel-sub">Top campaigns by funds raised</div>
            </div>
            <Link to="/admin/campaigns" className="amx-panel-link">
              View all
              <Icon name="arrowRight" />
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {CAMPAIGNS.map((c) => {
              const pct = Math.round((c.raised / c.goal) * 100);
              return (
                <div key={c.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--a-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--a-text-faint)" }}>{c.masjid}</div>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 700, color: "var(--a-text)", flexShrink: 0 }}>
                      {pct}%
                    </div>
                  </div>
                  <div className="amx-progress">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11.5, color: "var(--a-text-faint)", fontFamily: "var(--mono)" }}>
                    <span>{fmt(c.raised)}</span>
                    <span>of {fmt(c.goal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="amx-grid-2" style={{ marginBottom: 18 }}>
        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Recent Donations</h3>
              <div className="amx-panel-sub">Latest contributions across all campaigns</div>
            </div>
            <Link to="/admin/donations" className="amx-panel-link">
              View all
              <Icon name="arrowRight" />
            </Link>
          </div>
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Donor</th>
                  <th>Campaign</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {DONATIONS.map((d, i) => (
                  <tr key={i}>
                    <td>
                      <div className="amx-cell-main">
                        <span className="amx-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                          {d.initials}
                        </span>
                        {d.donor}
                      </div>
                    </td>
                    <td>{d.campaign}</td>
                    <td className="num">{fmt(d.amount)}</td>
                    <td>{d.date}</td>
                    <td>
                      <span className={`amx-badge ${d.status === "ok" ? "amx-badge-ok" : "amx-badge-warn"}`}>
                        <span className="amx-badge-dot" />
                        {d.status === "ok" ? "Completed" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Verification Requests</h3>
              <div className="amx-panel-sub">4 masjids awaiting review</div>
            </div>
            <Link to="/admin/verification" className="amx-panel-link">
              View all
              <Icon name="arrowRight" />
            </Link>
          </div>
          <div>
            {VERIFICATIONS.map((v) => (
              <div className="amx-verify-item" key={v.name}>
                <div className="amx-verify-thumb">
                  <Icon name="mosque" />
                </div>
                <div className="amx-verify-info">
                  <strong>{v.name}</strong>
                  <span>
                    {v.loc} · {v.time}
                  </span>
                </div>
                <div className="amx-verify-actions">
                  <button className="amx-icon-action approve" aria-label="Approve">
                    <Icon name="check" />
                  </button>
                  <button className="amx-icon-action reject" aria-label="Reject">
                    <Icon name="x" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="amx-grid-2" style={{ marginBottom: 18 }}>
        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Recent Masjid Registrations</h3>
              <div className="amx-panel-sub">Newest masjid profiles on the platform</div>
            </div>
            <Link to="/admin/masjids" className="amx-panel-link">
              View all
              <Icon name="arrowRight" />
            </Link>
          </div>
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Masjid</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {REGISTRATIONS.map((r) => (
                  <tr key={r.name}>
                    <td>
                      <div className="amx-cell-main">
                        <span className="amx-avatar" style={{ width: 30, height: 30, background: "var(--a-bg)", color: "var(--a-navy-soft)" }}>
                          <Icon name="mosque" size={14} />
                        </span>
                        {r.name}
                      </div>
                    </td>
                    <td>{r.loc}</td>
                    <td>
                      <span className={`amx-badge ${r.status === "ok" ? "amx-badge-ok" : "amx-badge-warn"}`}>
                        <span className="amx-badge-dot" />
                        {r.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head">
            <div>
              <h3>Recent Activities</h3>
              <div className="amx-panel-sub">Platform-wide activity log</div>
            </div>
          </div>
          <div className="amx-feed">
            {ACTIVITIES.map((a, i) => (
              <div className="amx-feed-item" key={i}>
                <div
                  className="amx-feed-icon"
                  style={{
                    background: a.color === "ok" ? "var(--a-ok-bg)" : a.color === "warn" ? "var(--a-warn-bg)" : "var(--a-bg)",
                    color: a.color === "ok" ? "var(--a-green-deep)" : a.color === "warn" ? "var(--a-warn)" : "var(--a-navy-soft)",
                  }}
                >
                  <Icon name={a.icon} />
                </div>
                <div>
                  <p>{a.text}</p>
                  <time>{a.time}</time>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-panel-head">
          <div>
            <h3>Quick Actions</h3>
            <div className="amx-panel-sub">Frequently used administrative tasks</div>
          </div>
        </div>
        <div className="amx-quick-grid">
          {QUICK_ACTIONS.map((q) => (
            <Link to={q.to} className="amx-quick-card" key={q.label}>
              <div className="amx-quick-icon">
                <Icon name={q.icon} />
              </div>
              <strong>{q.label}</strong>
              <span>{q.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
