import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const TABS = [
  { key: "all", label: "All Concerns" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "closed", label: "Closed" },
];

function Concerns() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [concernType, setConcernType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState([]);
  const [data, setData] = useState({ concerns: [], total: 0, pageSize: 20, counts: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get("/concern-types").then(({ data }) => setTypes([...data.types].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/concerns", { params: { status: tab, concernType, q: q || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, concernType, q, dateFrom, dateTo, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Trust &amp; Safety</span>
          <h1>Raise a Concern</h1>
          <p>Review and act on concerns submitted through the Raise a Concern form</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => { setTab(t.key); setPage(1); }}>
              {t.label}{t.key !== "all" && data.counts?.[t.key] !== undefined ? ` (${data.counts[t.key]})` : ""}
            </button>
          ))}
        </div>

        <div className="amx-filters" style={{ marginBottom: 20 }}>
          <div className="amx-search" style={{ maxWidth: 320 }}>
            <Icon name="search" />
            <input type="text" placeholder="Search reference, name, email, subject…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <select className="amx-select" value={concernType} onChange={(e) => { setConcernType(e.target.value); setPage(1); }}>
            <option value="all">All concern types</option>
            {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <input type="date" className="amx-select" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          <input type="date" className="amx-select" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>

        {!loading && data.concerns.length === 0 && (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>No concerns here</strong>
            <span>Nothing matches this filter right now.</span>
          </div>
        )}

        {data.concerns.length > 0 && (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Concern ID</th>
                  <th>User</th>
                  <th>Concern Type</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.concerns.map((c) => (
                  <tr key={c.id}>
                    <td><strong className="mono">{c.reference}</strong></td>
                    <td>
                      <div>{c.fullName}</div>
                      <div className="amx-cell-sub">{c.email}</div>
                    </td>
                    <td>{c.concernType}</td>
                    <td>{c.subject}</td>
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/admin/concerns/${c.id}`} className="amx-btn amx-btn-sm amx-btn-outline">Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={data.total} pageSize={data.pageSize} onChange={setPage} />
      </div>
    </>
  );
}

export default Concerns;
