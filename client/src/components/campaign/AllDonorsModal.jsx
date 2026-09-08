import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../Icons.jsx";
import DonorRow from "./DonorRow.jsx";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";

const PAGE_SIZE = 15;

function DonorRowSkeleton() {
  return (
    <div className="camp-donor-row camp-donor-row-skeleton" aria-hidden="true">
      <div className="camp-donor-avatar camp-donor-skel-block" />
      <div className="camp-donor-info">
        <span className="camp-donor-skel-block camp-donor-skel-line" style={{ width: "55%" }} />
        <span className="camp-donor-skel-block camp-donor-skel-line" style={{ width: "35%" }} />
      </div>
      <span className="camp-donor-skel-block camp-donor-skel-line" style={{ width: 48 }} />
    </div>
  );
}

function AllDonorsModal({ slug, total, campaignTitle, onClose }) {
  useBodyScrollLock();
  const trapRef = useFocusTrap();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [donors, setDonors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [totalCount, setTotalCount] = useState(total);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setError(false);
      if (page === 1) setLoading(true); else setLoadingMore(true);
      axios
        .get(`${API_BASE}/campaigns/public/${slug}/donors`, { params: { q: q || undefined, page, pageSize: PAGE_SIZE } })
        .then(({ data }) => {
          setDonors((prev) => (page === 1 ? data.donors : [...(prev || []), ...data.donors]));
          setTotalCount(data.total);
        })
        .catch(() => {
          setError(true);
          if (page === 1) setDonors([]);
        })
        .finally(() => { setLoading(false); setLoadingMore(false); });
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, q, page, reloadKey]);

  const retry = useCallback(() => {
    setPage(1);
    setReloadKey((k) => k + 1);
  }, []);

  const canLoadMore = donors && !error && donors.length < totalCount;
  const showEmpty = donors && donors.length === 0 && !error;

  return (
    <div className="msj-modal-overlay" onClick={onClose}>
      <div
        className="msj-modal msj-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-donors-title"
        tabIndex={-1}
        ref={trapRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="msj-modal-close" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
        <h3 id="all-donors-title">All Donors</h3>
        <p className="msj-modal-sub">
          {totalCount} contribution{totalCount === 1 ? "" : "s"}{campaignTitle ? ` to ${campaignTitle}.` : " to this campaign."}
        </p>

        <div className="msj-search" style={{ marginBottom: 14 }}>
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Search donors…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            aria-label="Search donors"
          />
        </div>

        <div className="camp-donor-list camp-donor-list-modal">
          {loading && Array.from({ length: 5 }).map((_, i) => <DonorRowSkeleton key={i} />)}

          {!loading && error && (
            <div className="camp-donor-state camp-donor-state-error">
              <p>Couldn't load donors right now.</p>
              <button type="button" className="btn btn-outline-ink" onClick={retry}>Try Again</button>
            </div>
          )}

          {!loading && showEmpty && (
            <div className="camp-donor-state">
              <Icon name="heart" size={22} />
              <p>{q ? "No donors match this search." : "Be the first to support this campaign."}</p>
            </div>
          )}

          {!loading && donors?.map((d) => <DonorRow key={d.id} donor={d} />)}
          {loadingMore && Array.from({ length: 3 }).map((_, i) => <DonorRowSkeleton key={`more-${i}`} />)}
        </div>

        {canLoadMore && !loadingMore && (
          <button type="button" className="btn btn-outline-ink" style={{ width: "100%", justifyContent: "center", marginTop: 14 }} onClick={() => setPage((p) => p + 1)}>
            Load More Donors
          </button>
        )}
      </div>
    </div>
  );
}

export default AllDonorsModal;
