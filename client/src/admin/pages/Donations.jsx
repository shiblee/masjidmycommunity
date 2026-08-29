import React, { useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import { DONATIONS, currency } from "../mockData.js";

const PAGE_SIZE = 6;

function Donations() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [page, setPage] = useState(1);

  const methods = ["all", ...Array.from(new Set(DONATIONS.map((d) => d.method))).sort((a, b) => a.localeCompare(b))];

  const filtered = useMemo(() => {
    return DONATIONS.filter((d) => {
      const matchesQuery = !query.trim() || d.donor.toLowerCase().includes(query.toLowerCase()) || d.campaign.toLowerCase().includes(query.toLowerCase()) || d.id.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || d.status === status;
      const matchesMethod = method === "all" || d.method === method;
      return matchesQuery && matchesStatus && matchesMethod;
    });
  }, [query, status, method]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalAmount = DONATIONS.filter((d) => d.status === "ok").reduce((s, d) => s + d.amount, 0);

  const withPage = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Fundraising</span>
          <h1>Donations</h1>
          <p>
            {DONATIONS.length} transactions logged · {currency(totalAmount)} successfully processed
          </p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-outline">
            <Icon name="download" size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input type="text" placeholder="Search by donor, campaign, or ID…" value={query} onChange={(e) => withPage(setQuery)(e.target.value)} />
          </div>
          <select className="amx-select" value={status} onChange={(e) => withPage(setStatus)(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="ok">Completed</option>
            <option value="warn">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select className="amx-select" value={method} onChange={(e) => withPage(setMethod)(e.target.value)}>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m === "all" ? "All methods" : m}
              </option>
            ))}
          </select>
        </div>

        {pageItems.length === 0 ? (
          <div className="amx-empty">
            <Icon name="donation" />
            <strong>No donations match your filters</strong>
            <span>Try adjusting the search term or filters above.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Donor</th>
                  <th>Campaign</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((d) => (
                  <tr key={d.id}>
                    <td className="amx-cell-sub" style={{ fontFamily: "var(--mono)" }}>
                      {d.id}
                    </td>
                    <td>
                      <div className="amx-cell-main">
                        <span className="amx-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                          {d.initials}
                        </span>
                        {d.donor}
                      </div>
                    </td>
                    <td>{d.campaign}</td>
                    <td>{d.method}</td>
                    <td className="num">{currency(d.amount)}</td>
                    <td>{d.date}</td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  );
}

export default Donations;
