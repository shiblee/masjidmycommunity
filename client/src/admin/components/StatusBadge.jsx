import React from "react";

const MAP = {
  verified: { cls: "amx-badge-ok", label: "Verified" },
  active: { cls: "amx-badge-ok", label: "Active" },
  published: { cls: "amx-badge-ok", label: "Published" },
  approved: { cls: "amx-badge-ok", label: "Approved" },
  ok: { cls: "amx-badge-ok", label: "Completed" },
  completed: { cls: "amx-badge-ok", label: "Completed" },
  goal_reached: { cls: "amx-badge-ok", label: "Goal Reached" },

  pending: { cls: "amx-badge-warn", label: "Pending" },
  pending_verification: { cls: "amx-badge-warn", label: "Pending Verification" },
  submitted: { cls: "amx-badge-warn", label: "Submitted" },
  under_review: { cls: "amx-badge-warn", label: "Under Review" },
  changes_requested: { cls: "amx-badge-warn", label: "Changes Requested" },
  warn: { cls: "amx-badge-warn", label: "Pending" },
  ongoing: { cls: "amx-badge-warn", label: "Ongoing" },
  invited: { cls: "amx-badge-warn", label: "Invited" },
  draft: { cls: "amx-badge-warn", label: "Draft" },
  scheduled: { cls: "amx-badge-warn", label: "Scheduled" },
  review: { cls: "amx-badge-warn", label: "In Review" },
  paused: { cls: "amx-badge-warn", label: "Paused" },

  rejected: { cls: "amx-badge-danger", label: "Rejected" },
  failed: { cls: "amx-badge-danger", label: "Failed" },
  suspended: { cls: "amx-badge-danger", label: "Suspended" },
  cancelled: { cls: "amx-badge-danger", label: "Cancelled" },

  inactive: { cls: "amx-badge-neutral", label: "Inactive" },
  neutral: { cls: "amx-badge-neutral", label: "—" },
};

function StatusBadge({ status, label }) {
  const cfg = MAP[status] || MAP.neutral;
  return (
    <span className={`amx-badge ${cfg.cls}`}>
      <span className="amx-badge-dot" />
      {label || cfg.label}
    </span>
  );
}

export default StatusBadge;
