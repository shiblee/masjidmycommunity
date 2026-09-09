import React from "react";
import { Icon } from "../Icons.jsx";

// Small horizontal-scroll rail — Saved Jobs today, Recommended/Best Match/
// Based on Your Skills/Recently Posted/Closing Soon land here in a later
// phase. Renders nothing when there's no real data, per the "don't show
// empty personalized sections" rule.
function JobRail({ icon, title, subtitle, children, count }) {
  if (!count) return null;
  return (
    <div className="job-rail">
      <div className="job-rail-head">
        {icon && <Icon name={icon} size={16} />}
        <div>
          <h3>{title}</h3>
          {subtitle && <span>{subtitle}</span>}
        </div>
      </div>
      <div className="job-rail-track">{children}</div>
    </div>
  );
}

export default JobRail;
