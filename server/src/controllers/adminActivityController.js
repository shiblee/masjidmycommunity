import { recordAdminActivity } from "../utils/adminActivityLog.js";

// Fire-and-forget from the client on every route change (see
// AdminLayout.jsx) -- always responds 204 immediately; the actual write is
// best-effort via recordAdminActivity, same as everywhere else. No
// permission gate beyond "is this a valid logged-in admin/staff account" --
// recording that someone visited a page they can already see (the nav
// itself is permission-filtered) isn't a privileged action in its own
// right, so this doesn't need requirePermission().
export const recordPageView = async (req, res) => {
  const { module, path } = req.body || {};
  recordAdminActivity({ req, module: module || null, action: "page_view", summary: path || null, activityType: "page_view" });
  res.status(204).end();
};
