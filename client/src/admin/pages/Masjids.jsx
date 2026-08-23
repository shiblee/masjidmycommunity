import React, { useMemo, useState } from "react";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import { MASJIDS, currency } from "../mockData.js";

const PAGE_SIZE = 6;

function Masjids() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [region, setRegion] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return MASJIDS.filter((m) => {
      const matchesQuery =
        !query.trim() ||
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.city.toLowerCase().includes(query.toLowerCase()) ||
        m.country.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "all" || m.status === status;
      const matchesRegion = region === "all" || m.region === region;
      return matchesQuery && matchesStatus && matchesRegion;
    });
  }, [query, status, region]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setAndResetPage = (setter) => (v) => {
    setter(v);
    setPage(1);
  };

  const regions = ["all", ...Array.from(new Set(MASJIDS.map((m) => m.region)))];

  const counts = {
    total: MASJIDS.length,
    verified: MASJIDS.filter((m) => m.status === "verified").length,
    pending: MASJIDS.filter((m) => m.status === "pending").length,
  };

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Directory</span>
          <h1>Masjids</h1>
          <p>
            {counts.total} registered · {counts.verified} verified · {counts.pending} pending review
          </p>
        </div>
        <div className="amx-page-actions">
          <button className="amx-btn amx-btn-outline">
            <Icon name="download" size={16} />
            Export
          </button>
          <button className="amx-btn amx-btn-accent">
            <Icon name="plus" size={16} />
            Add Masjid
          </button>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-filters">
          <div className="amx-search">
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search by masjid, city, or country…"
              value={query}
              onChange={(e) => setAndResetPage(setQuery)(e.target.value)}
            />
          </div>
          <select className="amx-select" value={status} onChange={(e) => setAndResetPage(setStatus)(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="amx-select" value={region} onChange={(e) => setAndResetPage(setRegion)(e.target.value)}>
            {regions.map((r) => (
              <option value={r} key={r}>
                {r === "all" ? "All regions" : r}
              </option>
            ))}
          </select>
        </div>

        {pageItems.length === 0 ? (
          <div className="amx-empty">
            <Icon name="mosque" />
            <strong>No masjids match your filters</strong>
            <span>Try adjusting the search term or filters above.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Masjid</th>
                  <th>Location</th>
                  <th>Campaigns</th>
                  <th>Funds Raised</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="amx-cell-main">
                        <span className="amx-avatar" style={{ width: 32, height: 32, background: "var(--a-bg)", color: "var(--a-navy-soft)" }}>
                          <Icon name="mosque" size={15} />
                        </span>
                        <div>
                          <div>{m.name}</div>
                          <div className="amx-cell-sub">{m.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {m.city}, {m.country}
                    </td>
                    <td>{m.campaigns}</td>
                    <td className="num">{currency(m.raised)}</td>
                    <td>{m.registered}</td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td>
                      <div className="amx-row-actions">
                        <button className="amx-icon-action" aria-label="View" style={{ color: "var(--a-navy-soft)" }}>
                          <Icon name="arrowRight" />
                        </button>
                      </div>
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

export default Masjids;
