import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import publicMasjidApi from "../../services/publicMasjidApi.js";
import ExploreMasjidsGrid from "../exploreMasjids/ExploreMasjidsGrid.jsx";
import MasjidReviewModal from "../exploreMasjids/MasjidReviewModal.jsx";

const PAGE_SIZE = 12;

// Reuses the same Grid card + review modal Explore Masjids already uses —
// one masjid card, everywhere, per the "used everywhere" requirement — so
// liking/unliking here (or seeing an updated rating) stays in sync with
// every other screen without any bespoke rendering of its own.
function LikedMasjids() {
  const [masjids, setMasjids] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);

  const load = (p) => {
    if (p === 1) setMasjids(null);
    else setLoadingMore(true);
    publicMasjidApi
      .get("/liked/mine", { params: { page: p, pageSize: PAGE_SIZE } })
      .then(({ data }) => {
        setMasjids((prev) => (p === 1 ? data.masjids : [...(prev || []), ...data.masjids]));
        setTotal(data.total);
        setPage(p);
      })
      .catch(() => setMasjids((prev) => prev || []))
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => { load(1); }, []);

  const openReviews = (m, initialTab = "overview") => setReviewModal({ masjid: m, initialTab });

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">Your Liked Masjids</span>
            <h1>Liked Masjids</h1>
            <p>Every masjid you've liked, in one place.</p>
          </div>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {masjids === null ? (
            <p>Loading…</p>
          ) : masjids.length === 0 ? (
            <div className="msj-empty-state">
              <Icon name="heart" size={30} />
              <h3>You haven't liked any masjids yet</h3>
              <p>Explore masjids and tap the like button on the ones you'd like to follow.</p>
              <Link to="/explore-masjids" className="btn btn-gold">Explore Masjids <span className="btn-arrow">→</span></Link>
            </div>
          ) : (
            <>
              <ExploreMasjidsGrid masjids={masjids} userLocation={null} onOpenReviews={openReviews} />
              {masjids.length < total && (
                <button type="button" className="msj-nearby-load-more" onClick={() => load(page + 1)} disabled={loadingMore} style={{ margin: "24px auto 0", display: "block" }}>
                  {loadingMore ? "Loading…" : "Load More"}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {reviewModal && (
        <MasjidReviewModal masjid={reviewModal.masjid} initialTab={reviewModal.initialTab} onClose={() => setReviewModal(null)} />
      )}
    </main>
  );
}

export default LikedMasjids;
