import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import jobApi from "../../services/jobApi.js";

const STATUS_LABEL = { active: "Active", closed: "Closed", expired: "Expired", deleted: "Deleted" };
// Reuses the acct-status-pill classes already styled for other statuses
// elsewhere in the app, rather than adding new CSS for these two.
const STATUS_PILL_CLASS = { active: "active", closed: "inactive", expired: "cancelled", deleted: "cancelled" };

function MyJobs() {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    jobApi
      .get("/mine")
      .then(({ data }) => setJobs(data.jobs))
      .catch(() => setError("Couldn't load your jobs."));
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (job) => {
    setBusyId(job.id);
    try {
      await jobApi.post(`/${job.id}/${job.status === "active" ? "close" : "reopen"}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update this job.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">Your Jobs</span>
            <h1>My Jobs</h1>
            <p>Post openings and track applications for your community.</p>
          </div>
          <Link to="/account/my-jobs/new" className="btn btn-gold" style={{ marginLeft: "auto" }}>
            <Icon name="plus" size={16} /> Add a Job
          </Link>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {jobs && jobs.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="building" size={30} />
              <h3>You haven't posted a job yet</h3>
              <p>Share an opening with the community — it goes live immediately, no waiting on approval.</p>
              <Link to="/account/my-jobs/new" className="btn btn-gold">Add a Job <span className="btn-arrow">→</span></Link>
            </div>
          )}

          <div className="msj-list-grid">
            {jobs?.map((j) => (
              <div className="msj-list-card" key={j.id}>
                <div className="msj-list-body">
                  <div className="msj-list-top">
                    <h3>{j.title}</h3>
                    <span className={`acct-status-pill ${STATUS_PILL_CLASS[j.status]}`}>{STATUS_LABEL[j.status]}</span>
                  </div>
                  <p className="msj-list-meta">
                    <Icon name="mapPin" size={13} /> {j.location} · {j.jobType}
                    {j.experienceRequired && ` · ${j.experienceRequired}`}
                  </p>
                  <p className="msj-list-meta">{j.applicationCount} application{j.applicationCount === 1 ? "" : "s"} · Posted {formatDate(j.createdAt)}</p>
                  <div className="msj-list-actions">
                    {["active", "closed"].includes(j.status) && <Link to={`/account/my-jobs/${j.id}`}>Edit</Link>}
                    <Link to={`/account/my-jobs/${j.id}/applications`}>View Applicants ({j.applicationCount})</Link>
                    <Link to={`/job/${j.slug}`}>View Public Page</Link>
                    {["active", "closed"].includes(j.status) && (
                      <button type="button" className="auth-link" onClick={() => toggleStatus(j)} disabled={busyId === j.id}>
                        {j.status === "active" ? "Close" : "Reopen"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default MyJobs;
