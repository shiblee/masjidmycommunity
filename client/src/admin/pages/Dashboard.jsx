import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import TrendChart from "../components/TrendChart.jsx";
import adminApi from "../services/adminApi.js";
import { API_ORIGIN } from "../../config.js";
import { getUser } from "../authStorage.js";

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

// Weekly-bucketed cumulative growth curve, computed from live registered-user
// data — matches the visual shape of the other (mock) KPI sparklines, but
// this one is real: each point is "how many accounts existed by this point,"
// 7 days apart, over the last 8 weeks.
function computeUserRegistrationTrend(users) {
  const BUCKETS = 8;
  const BUCKET_DAYS = 7;
  const now = Date.now();
  const spark = [];
  for (let i = BUCKETS - 1; i >= 0; i--) {
    const cutoff = now - i * BUCKET_DAYS * 24 * 60 * 60 * 1000;
    spark.push(users.filter((u) => new Date(u.createdAt).getTime() <= cutoff).length);
  }
  const first = spark[0];
  const last = spark[spark.length - 1];
  const deltaPct = first > 0 ? ((last - first) / first) * 100 : last > 0 ? 100 : 0;
  return {
    value: last.toLocaleString("en-IN"),
    delta: `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`,
    up: deltaPct >= 0,
    spark,
  };
}

// Weekly-bucketed cumulative count, the same shape computeUserRegistrationTrend
// already produces for the one real KPI card — genericized so every other
// card can compute a real trend from raw {createdAt} rows too, instead of
// each inventing its own copy of this loop.
function bucketWeekly(items, valueAt) {
  const BUCKETS = 8;
  const BUCKET_DAYS = 7;
  const now = Date.now();
  const spark = [];
  for (let i = BUCKETS - 1; i >= 0; i--) {
    const cutoff = now - i * BUCKET_DAYS * 24 * 60 * 60 * 1000;
    spark.push(valueAt(cutoff));
  }
  const first = spark[0];
  const last = spark[spark.length - 1];
  const deltaPct = first > 0 ? ((last - first) / first) * 100 : last > 0 ? 100 : 0;
  return { last, delta: `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%`, up: deltaPct >= 0, spark };
}

function computeCountTrend(items) {
  const { last, delta, up, spark } = bucketWeekly(items, (cutoff) => items.filter((x) => new Date(x.createdAt).getTime() <= cutoff).length);
  return { value: last.toLocaleString("en-IN"), delta, up, spark };
}

function computeSumTrend(items, amountField) {
  const { last, delta, up, spark } = bucketWeekly(items, (cutoff) =>
    items.filter((x) => new Date(x.createdAt).getTime() <= cutoff).reduce((s, x) => s + (x[amountField] || 0), 0)
  );
  return { value: `₹${last.toLocaleString("en-IN")}`, delta, up, spark };
}

// Distinct-by-key cumulative count (Total Donors) — a donor's very first
// donation date is when they "join" the running distinct total.
function computeDistinctCountTrend(items, keyField) {
  const firstSeenAt = new Map();
  for (const item of items) {
    const key = item[keyField];
    const t = new Date(item.createdAt).getTime();
    if (!firstSeenAt.has(key) || t < firstSeenAt.get(key)) firstSeenAt.set(key, t);
  }
  const firstDates = [...firstSeenAt.values()];
  const { last, delta, up, spark } = bucketWeekly(firstDates, (cutoff) => firstDates.filter((t) => t <= cutoff).length);
  return { value: last.toLocaleString("en-IN"), delta, up, spark };
}

function buildKpis(dashStats) {
  if (!dashStats) return [];
  const verified = computeCountTrend(dashStats.verifiedMasjids);
  const campaigns = computeCountTrend(dashStats.activeCampaigns);
  const funds = computeSumTrend(dashStats.donations, "amount");
  const donationCount = computeCountTrend(dashStats.donations);
  const donors = computeDistinctCountTrend(dashStats.donations, "donorKey");
  const verifiedPct = dashStats.totalMasjidsCount > 0 ? ((dashStats.verifiedMasjids.length / dashStats.totalMasjidsCount) * 100).toFixed(1) : "0.0";

  return [
    { label: "Verified Masjids", sub: `${verifiedPct}% of total`, icon: "verify", color: "#5E9A2C", ...verified },
    { label: "Active Campaigns", icon: "campaign", color: "#C9A227", ...campaigns },
    { label: "Total Funds Raised", icon: "wallet", color: "#5E9A2C", ...funds },
    { label: "Total Donations", icon: "donation", color: "#C9A227", ...donationCount },
    { label: "Total Donors", icon: "donors", color: "#5E9A2C", ...donors },
  ];
}

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
  const admin = getUser();
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [dashStats, setDashStats] = useState(null);

  useEffect(() => {
    adminApi
      .get("/users")
      .then(({ data }) => setRegisteredUsers(data.users))
      .catch(() => {})
      .finally(() => setUsersLoading(false));
  }, []);

  useEffect(() => {
    adminApi.get("/dashboard/stats").then(({ data }) => setDashStats(data)).catch(() => {});
  }, []);

  const userCounts = {
    total: registeredUsers.length,
    active: registeredUsers.filter((u) => u.status === "active").length,
    pending: registeredUsers.filter((u) => u.status === "pending_verification").length,
  };
  const recentUsers = [...registeredUsers]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const userTrend = computeUserRegistrationTrend(registeredUsers);
  const kpis = [
    {
      label: "Total Registered Users",
      value: usersLoading ? "—" : userTrend.value,
      delta: usersLoading ? "—" : userTrend.delta,
      up: userTrend.up,
      icon: "donors",
      color: "#5E9A2C",
      spark: userTrend.spark.some((v) => v > 0) ? userTrend.spark : [0, 0, 0, 0, 0, 0, 0, 1],
      to: "/admin/registered-users",
    },
    ...buildKpis(dashStats),
  ];

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Overview</span>
          <h1>Dashboard</h1>
          <p>Welcome back{admin?.name ? `, ${admin.name}` : ""} — here's how the platform is performing today.</p>
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
        {kpis.map((k) => {
          const Wrapper = k.to ? Link : "div";
          const wrapperProps = k.to ? { to: k.to } : {};
          return (
            <Wrapper className={`amx-card amx-kpi${k.to ? " amx-kpi-clickable" : ""}`} key={k.label} {...wrapperProps}>
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
            </Wrapper>
          );
        })}
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
                            {u.profilePhoto ? (
                              <img className="amx-avatar" style={{ width: 30, height: 30, objectFit: "cover" }} src={`${API_ORIGIN}${u.profilePhoto}`} alt={u.fullName} />
                            ) : (
                              <span className="amx-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                                {initialsOf(u.fullName)}
                              </span>
                            )}
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
            <Link to="/admin/campaigns" className="amx-panel-link">
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
