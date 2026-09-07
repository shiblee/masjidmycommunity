import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const STATUS_LABEL = { pending: "Pending Review", partially_approved: "Partially Approved", approved: "Approved", rejected: "Rejected" };
const FIELD_LABEL = { name: "Name", category: "Category", location: "Location", photos: "Photos", contact: "Contact", prayer_times: "Prayer Timings", other: "Other" };

function MasjidCorrections() {
  const [requests, setRequests] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const load = () => {
    adminApi.get("/masjid-corrections", { params: statusFilter === "all" ? {} : { status: statusFilter } })
      .then(({ data }) => setRequests(data.requests))
      .catch(() => setRequests([]));
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Masjid Data</span>
          <h1>Correction Requests</h1>
          <p>Structured corrections users have suggested for masjid details — review each field independently.</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending Review" },
            { key: "partially_approved", label: "Partially Approved" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
          ].map((t) => (
            <button key={t.key} className={statusFilter === t.key ? "active" : ""} onClick={() => setStatusFilter(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {requests && requests.length === 0 && (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>Nothing here</strong>
            <span>Correction requests will show up here once users submit them.</span>
          </div>
        )}

        {requests && requests.length > 0 && (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Masjid</th>
                  <th>Submitted By</th>
                  <th>Fields</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.masjid?.name || "—"}</strong></td>
                    <td>{r.submitter?.fullName || "Unknown"}</td>
                    <td>{r.fieldKeys.map((k) => FIELD_LABEL[k]).join(", ")}</td>
                    <td><StatusBadge status={r.status === "partially_approved" ? "warn" : r.status} label={STATUS_LABEL[r.status]} /></td>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/admin/masjid-corrections/${r.id}`} className="amx-btn amx-btn-sm amx-btn-outline">Review</Link>
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

export default MasjidCorrections;
