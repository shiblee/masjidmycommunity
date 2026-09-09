import React from "react";

// Loading placeholder matching JobCard.jsx's own shape, shown while the
// first page of results is in flight — the app has no other reusable
// skeleton primitive, so this is scoped to the job card only for now.
function JobCardSkeleton() {
  return (
    <div className="job-card job-card-skeleton">
      <div className="job-card-top">
        <span className="job-skel-block" style={{ width: 64, height: 18, borderRadius: 100 }} />
      </div>
      <span className="job-skel-block" style={{ width: "78%", height: 17, marginTop: 12 }} />
      <span className="job-skel-block" style={{ width: "40%", height: 12, marginTop: 9 }} />
      <span className="job-skel-block" style={{ width: "55%", height: 12, marginTop: 12 }} />
      <div className="job-card-skills">
        <span className="job-skel-block" style={{ width: 54, height: 22, borderRadius: 100 }} />
        <span className="job-skel-block" style={{ width: 68, height: 22, borderRadius: 100 }} />
        <span className="job-skel-block" style={{ width: 46, height: 22, borderRadius: 100 }} />
      </div>
      <div className="job-card-footer">
        <span className="job-skel-block" style={{ width: 110, height: 11 }} />
      </div>
    </div>
  );
}

export default JobCardSkeleton;
