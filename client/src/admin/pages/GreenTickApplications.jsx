import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const TABS = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "documents_required", label: "Documents Required" },
  { key: "clarification_required", label: "Clarification Required" },
  { key: "approved", label: "Approved" },
  { key: "green_tick_issued", label: "Green Tick Issued" },
  { key: "suspended", label: "Suspended" },
  { key: "revoked", label: "Revoked" },
];

const STATUS_BADGE_CLASS = {
  draft: "neutral", submitted: "warn", under_review: "warn", documents_required: "warn",
  clarification_required: "warn", partially_verified: "warn", verification_failed: "failed",
  approved: "ok", green_tick_issued: "ok", suspended: "suspended", revoked: "rejected",
};

function GreenTickApplications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [rawQuery, setRawQuery] = useState("");

  const status = TABS.some((t) => t.key === searchParams.get("status")) ? searchParams.get("status") : "all";
  const q = searchParams.get("q") || "";

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    adminApi
      .get("/green-tick-applications", { params: { status, q, page, pageSize: 20 } })
      .then(({ data }) => setData(data))
      .catch(() => setData({ applications: [], total: 0 }));
  }, [status, q, page]);

  useEffect(() => { setPage(1); }, [status, q]);

  useEffect(() => {
    const t = setTimeout(() => setParam("q", rawQuery), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuery]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / 20)) : 1;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Trust &amp; Safety</span>
          <h1>Green Tick Verification</h1>
          <p>Review masjid representative identity, authorization, and document verification applications.</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 16, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.key} className={status === t.key ? "active" : ""} onClick={() => setParam("status", t.key === "all" ? "" : t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="amx-search" style={{ marginBottom: 16, maxWidth: 320 }}>
          <Icon name="search" />
          <input type="text" placeholder="Search by masjid name…" value={rawQuery} onChange={(e) => setRawQuery(e.target.value)} />
        </div>

        {!data ? (
          <div className="amx-empty"><Icon name="shieldCheck" /><strong>Loading…</strong></div>
        ) : data.applications.length === 0 ? (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>No applications here</strong>
            <span>Green Tick applications will show up here once masjids apply.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Masjid</th>
                  <th>Verification ID</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Last Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.applications.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.masjid?.name || "—"}</strong>
                      <div className="amx-cell-sub">{[a.masjid?.category, a.masjid?.city].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td>{a.verificationId || "—"}</td>
                    <td><StatusBadge status={STATUS_BADGE_CLASS[a.status]} label={a.statusLabel} /></td>
                    <td>{a.submittedAt ? formatDateTime(a.submittedAt) : "—"}</td>
                    <td>{formatDateTime(a.updatedAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/admin/masjids/${a.masjidId}/greentick`} className="amx-btn amx-btn-sm amx-btn-outline">Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && <Pagination page={page} totalPages={totalPages} totalItems={data.total} pageSize={20} onChange={setPage} />}
      </div>
    </>
  );
}

export default GreenTickApplications;
