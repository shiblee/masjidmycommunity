import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

const TABS = [
  { key: "all", label: "All Messages" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "closed", label: "Closed" },
];

function ContactInquiries() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [topics, setTopics] = useState([]);
  const [data, setData] = useState({ contacts: [], total: 0, pageSize: 20, counts: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.get("/contact-topics").then(({ data }) => setTopics([...data.topics].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    adminApi
      .get("/contact-inquiries", { params: { status: tab, topic, q: q || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab, topic, q, dateFrom, dateTo, page]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Support</span>
          <h1>Contact Us Inquiries</h1>
          <p>Review and reply to messages submitted through the Contact Us form</p>
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
            <input type="text" placeholder="Search reference, name, email, message…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <select className="amx-select" value={topic} onChange={(e) => { setTopic(e.target.value); setPage(1); }}>
            <option value="all">All topics</option>
            {topics.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <input type="date" className="amx-select" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          <input type="date" className="amx-select" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>

        {!loading && data.contacts.length === 0 && (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>No messages here</strong>
            <span>Nothing matches this filter right now.</span>
          </div>
        )}

        {data.contacts.length > 0 && (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>User</th>
                  <th>Topic</th>
                  <th>Message</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.contacts.map((c) => (
                  <tr key={c.id}>
                    <td><strong className="mono">{c.reference}</strong></td>
                    <td>
                      <div>{c.fullName}</div>
                      <div className="amx-cell-sub">{c.email}</div>
                    </td>
                    <td>{c.topic}</td>
                    <td>{c.message.length > 60 ? `${c.message.slice(0, 60)}…` : c.message}</td>
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/admin/contact-inquiries/${c.id}`} className="amx-btn amx-btn-sm amx-btn-outline">Review</Link>
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

export default ContactInquiries;
