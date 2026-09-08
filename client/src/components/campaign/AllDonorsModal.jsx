import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";

const PAGE_SIZE = 15;

function AllDonorsModal({ slug, total, onClose }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [donors, setDonors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(total);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      axios
        .get(`${API_BASE}/campaigns/public/${slug}/donors`, { params: { q: q || undefined, page, pageSize: PAGE_SIZE } })
        .then(({ data }) => {
          setDonors((prev) => (page === 1 ? data.donors : [...prev, ...data.donors]));
          setTotalCount(data.total);
        })
        .catch(() => { if (page === 1) setDonors([]); })
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, q, page]);

  const canLoadMore = donors && donors.length < totalCount;

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div className="msj-modal msj-modal-wide" onClick={(e) => e.stopPropagation()}>
        <button className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3>All Donors</h3>
        <p className="msj-modal-sub">{totalCount} contribution{totalCount === 1 ? "" : "s"} to this campaign.</p>

        <div className="msj-search" style={{ marginBottom: 14 }}>
          <Icon name="search" size={16} />
          <input type="text" placeholder="Search donors…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>

        <div className="camp-donor-list camp-donor-list-modal">
          {donors === null && <p className="msj-note">Loading…</p>}
          {donors && donors.length === 0 && <p className="msj-note">No donors match this search yet.</p>}
          {donors?.map((d) => (
            <div className="camp-donor-row" key={d.id}>
              <div className="camp-donor-avatar">{d.donorName === "Anonymous" ? <Icon name="heart" size={14} /> : d.donorName.trim()[0]?.toUpperCase()}</div>
              <div className="camp-donor-info">
                <strong>{d.donorName}</strong>
                <span>{formatDate(d.createdAt)}</span>
              </div>
              <div className="camp-donor-amount">₹{Number(d.amount).toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>

        {canLoadMore && (
          <button type="button" className="btn btn-outline-ink" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} disabled={loading} onClick={() => setPage((p) => p + 1)}>
            {loading ? "Loading…" : "Load More Donors"}
          </button>
        )}
      </div>
    </div>
  );
}

export default AllDonorsModal;
