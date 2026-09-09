import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../config.js";
import { Icon } from "../components/Icons.jsx";
import { formatDate } from "../utils/formatDateTime.js";

const PAGE_SIZE = 12;

function Jobs() {
  const [q, setQ] = useState("");
  const [jobType, setJobType] = useState("");
  const [jobTypes, setJobTypes] = useState([]);
  const [jobs, setJobs] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/jobs/public/meta/job-types`).then(({ data }) => setJobTypes(data.employmentTypes)).catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      axios
        .get(`${API_BASE}/jobs/public`, { params: { q: q || undefined, jobType: jobType || undefined, page, pageSize: PAGE_SIZE } })
        .then(({ data }) => {
          setJobs((prev) => (page === 1 ? data.jobs : [...(prev || []), ...data.jobs]));
          setTotal(data.total);
        })
        .catch(() => { if (page === 1) setJobs([]); })
        .finally(() => setLoading(false));
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [q, jobType, page]);

  const changeType = (value) => { setJobType(value); setPage(1); };
  const canLoadMore = jobs && jobs.length < total;

  return (
    <main className="msj-page">
      <section className="cw-hero msj-explore-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">Jobs</span>
          <h1>Openings from across the community.</h1>
          <p>Roles posted directly by community members — teaching, administration, and more.</p>
        </div>
      </section>

      <section className="py-md msj-explore-content">
        <div className="wrap">
          <div className="campaign-filters" style={{ margin: "0 0 16px" }}>
            <button className={`filter-chip${jobType === "" ? " active" : ""}`} onClick={() => changeType("")}>All Types</button>
            {jobTypes.map((t) => (
              <button key={t.id} className={`filter-chip${jobType === t.name ? " active" : ""}`} onClick={() => changeType(t.name)}>
                {t.name}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <div className="msj-search" style={{ flex: "0 1 360px" }}>
              <Icon name="search" size={16} />
              <input type="text" placeholder="Search jobs…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
          </div>

          <div className="filter-count">
            {loading && page === 1 ? "Loading jobs…" : `Showing ${jobs?.length || 0} of ${total} jobs`}
          </div>

          {!loading && jobs?.length === 0 ? (
            <div className="campaign-empty">
              <p>{q || jobType ? "No jobs match your search right now." : "No open jobs right now — check back soon."}</p>
            </div>
          ) : (
            <div className="msj-list-grid" style={{ marginTop: 12 }}>
              {jobs?.map((j) => (
                <Link to={`/job/${j.slug}`} className="msj-list-card" key={j.id} style={{ display: "block" }}>
                  <div className="msj-list-body">
                    <div className="msj-list-top">
                      <h3>{j.title}</h3>
                      <span className="acct-status-pill">{j.jobType}</span>
                    </div>
                    <p className="msj-list-meta"><Icon name="mapPin" size={13} /> {j.location}{j.experienceRequired ? ` · ${j.experienceRequired}` : ""}</p>
                    {j.salary && <p className="msj-list-meta">{j.salary}</p>}
                    <p className="msj-list-meta">By {j.postedBy} · Posted {formatDate(j.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {canLoadMore && (
            <div style={{ textAlign: "center", marginTop: "36px" }}>
              <button className="btn btn-outline-ink" disabled={loading} onClick={() => setPage((p) => p + 1)}>
                {loading ? "Loading…" : "Load More Jobs"}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Jobs;
