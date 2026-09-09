import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "../components/Icons.jsx";
import { API_BASE } from "../config.js";
import { formatDate } from "../utils/formatDateTime.js";
import LatestJobsRail from "../components/job/LatestJobsRail.jsx";
import JobApplyPanel from "../components/job/JobApplyPanel.jsx";

const API = `${API_BASE}/jobs/public`;

function JobProfile() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    axios
      .get(`${API}/${slug}`)
      .then(({ data }) => setData(data))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <main className="msj-page">
        <div className="wrap py-lg msj-empty-state">
          <Icon name="building" size={30} />
          <h3>This job isn't available</h3>
          <p>It may have closed, or the link may be incorrect.</p>
          <Link to="/jobs" className="btn btn-gold">Browse Jobs</Link>
        </div>
      </main>
    );
  }

  if (!data) return <main className="msj-page"><div className="wrap py-lg"><p>Loading…</p></div></main>;

  const { job, poster } = data;

  return (
    <main className="msj-page">
      <section className="cw-hero msj-explore-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">{job.jobType}</span>
          <h1>{job.title}</h1>
          <p>
            <Icon name="mapPin" size={14} /> {job.location} · Posted by {poster?.fullName || "a community member"} · {formatDate(job.createdAt)}
          </p>
        </div>
      </section>

      <section className="py-md camp-hub-content">
        <div className="wrap camp-hub-grid">
          <LatestJobsRail currentSlug={slug} excludeId={job.id} />

          <div>
            <div className="section-head" style={{ marginTop: 0 }}>
              <span className="eyebrow">Job Description</span>
              <h2>{job.title}</h2>
            </div>
            <p className="msj-profile-about" style={{ whiteSpace: "pre-line" }}>{job.description}</p>

            {job.skills?.length > 0 && (
              <>
                <div className="section-head" style={{ marginTop: 32, marginBottom: 8 }}>
                  <span className="eyebrow">Skills & Qualifications</span>
                </div>
                <div className="profile-chip-row">
                  {job.skills.map((skill) => <span className="filter-chip active profile-chip" key={skill}>{skill}</span>)}
                </div>
              </>
            )}

            {job.experienceRequired && (
              <p className="msj-note" style={{ marginTop: 12 }}><strong>Experience required:</strong> {job.experienceRequired}</p>
            )}
            {job.applicationDeadline && (
              <p className="msj-note" style={{ marginTop: 6 }}><strong>Application deadline:</strong> {formatDate(job.applicationDeadline)}</p>
            )}
          </div>

          <aside className="msj-profile-side camp-profile-side">
            <JobApplyPanel job={job} />
          </aside>
        </div>
      </section>
    </main>
  );
}

export default JobProfile;
