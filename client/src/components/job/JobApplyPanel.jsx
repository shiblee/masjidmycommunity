import React from "react";
import { Icon } from "../Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";

// Right column of the job detail page, mirroring CampaignDonationPanel.jsx's
// structure (eyebrow, hero stats, primary CTA). The real Apply flow —
// resume upload, profile auto-fill, duplicate prevention — is a later
// phase with its own data model; for now the button is present but
// disabled so the page's structure is already final.
function JobApplyPanel({ job }) {
  return (
    <div className="card msj-profile-card camp-donate-panel">
      <div className="camp-donate-panel-head">
        <span className="camp-donate-eyebrow">This Opening</span>
      </div>
      <h3>{job.title}</h3>

      <div className="camp-donate-substats" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div><strong>{job.jobType}</strong><span>Job Type</span></div>
        <div><strong>{job.location}</strong><span>Location</span></div>
        {job.experienceRequired && <div><strong>{job.experienceRequired}</strong><span>Experience</span></div>}
        {job.salary && <div><strong>{job.salary}</strong><span>Compensation</span></div>}
        {job.applicationDeadline && <div><strong>{formatDate(job.applicationDeadline)}</strong><span>Apply By</span></div>}
      </div>

      <button type="button" className="btn btn-gold camp-donate-cta" disabled title="Applications open soon">
        <Icon name="mail" size={16} /> Apply for Job
      </button>
      <p className="msj-note" style={{ marginTop: 10, textAlign: "center" }}>
        Applications open soon.{job.contactMethod ? ` In the meantime, reach out directly: ${job.contactMethod}` : ""}
      </p>
    </div>
  );
}

export default JobApplyPanel;
