import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../config.js";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";

const RAIL_SIZE = 20;
const JOB_TYPE_LABEL = { full_time: "Full-Time", part_time: "Part-Time", contract: "Contract", internship: "Internship", volunteer: "Volunteer" };

// Left column of the job detail page — every other open job, mirroring
// RunningCampaignsRail.jsx's exact pattern (search, sticky, excludes the
// current item, plain client-side route change on click).
function LatestJobsRail({ currentSlug, excludeId }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      axios
        .get(`${API_BASE}/jobs/public`, { params: { q: q || undefined, excludeId, pageSize: RAIL_SIZE } })
        .then(({ data }) => setJobs(data.jobs))
        .catch(() => setJobs([]));
    }, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [q, excludeId]);

  return (
    <aside className="camp-rail">
      <div className="camp-rail-head">
        <span className="eyebrow">Latest Jobs</span>
      </div>
      <div className="msj-search camp-rail-search">
        <Icon name="search" size={14} />
        <input type="text" placeholder="Search jobs…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="camp-rail-list">
        {jobs === null && <p className="msj-note">Loading…</p>}
        {jobs && jobs.length === 0 && <p className="msj-note">No other jobs right now.</p>}
        {jobs?.map((j) => (
          <button key={j.id} type="button" className="camp-rail-card" onClick={() => navigate(`/job/${j.slug}`)}>
            <div className="camp-rail-card-body">
              <div className="camp-rail-card-loc">{j.postedBy} · {j.location}</div>
              <div className="camp-rail-card-title">{j.title}</div>
              <div className="camp-rail-card-meta">
                <span>{JOB_TYPE_LABEL[j.jobType]}</span>
                <span>{formatDate(j.createdAt)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default LatestJobsRail;
