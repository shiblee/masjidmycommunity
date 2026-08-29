import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const TYPE_LABEL = { masjid: "Masjid", campaign: "Campaign", activity: "Wall Post", comment: "Comment" };

function Moderation() {
  const [content, setContent] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");

  const load = () => {
    adminApi.get("/moderation/content").then(({ data }) => setContent(data.content)).catch(() => setContent([]));
  };

  useEffect(() => { load(); }, []);

  const filtered = (content || []).filter((c) => typeFilter === "all" || c.targetType === typeFilter);

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Trust &amp; Safety</span>
          <h1>Reported Content</h1>
          <p>Masjids, campaigns, Wall posts, and comments that community members have reported</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "All" },
            { key: "masjid", label: "Masjids" },
            { key: "campaign", label: "Campaigns" },
            { key: "activity", label: "Wall Posts" },
            { key: "comment", label: "Comments" },
          ].map((t) => (
            <button key={t.key} className={typeFilter === t.key ? "active" : ""} onClick={() => setTypeFilter(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {content && filtered.length === 0 && (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>Nothing reported right now</strong>
            <span>Content will show up here once it receives a community report.</span>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Type</th>
                  <th>Reports</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Last Activity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={`${c.targetType}-${c.targetId}`}>
                    <td><strong>{c.name}</strong></td>
                    <td>{TYPE_LABEL[c.targetType]}</td>
                    <td>{c.reportCount}</td>
                    <td>{c.threshold}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{formatDateTime(c.updatedAt)}</td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/admin/moderation/${c.targetType}/${c.targetId}`} className="amx-btn amx-btn-sm amx-btn-outline">Review</Link>
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

export default Moderation;
