import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icons.jsx";
import adminApi from "../services/adminApi.js";
import { getUser, updateStoredUser, clearSession } from "../authStorage.js";

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function initialsOf(name) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

// moduleKey on each leaf/standalone item matches permissionModules.js's
// registry -- filterNavItems() below uses it to hide anything a staff
// account (role !== "super_admin") wasn't granted at least one action on.
const NAV_ITEMS = [
  {
    label: "Dashboard",
    icon: "dashboard",
    children: [
      { to: "/admin/dashboard", label: "Overview", icon: "dashboard", moduleKey: "dashboard" },
      { to: "/admin/fund-utilization", label: "Fund Utilization", icon: "fund", moduleKey: "reports" },
      { to: "/admin/reports", label: "Reports & Analytics", icon: "reports", moduleKey: "reports" },
    ],
  },
  {
    label: "Users",
    icon: "globe",
    children: [
      { to: "/admin/registered-users", label: "Users", icon: "globe", moduleKey: "users" },
      { to: "/admin/visitors", label: "Visitors", icon: "eye", moduleKey: "visitors" },
      { to: "/admin/synthetic-users", label: "Synthetic Users", icon: "users", moduleKey: "users" },
      { to: "/admin/staff", label: "Staff", icon: "lock", moduleKey: "staff" },
    ],
  },
  {
    label: "Masjids",
    icon: "mosque",
    children: [
      { to: "/admin/masjids", label: "Masjids", icon: "mosque", moduleKey: "masjid" },
      { to: "/admin/masjid-corrections", label: "Correction Requests", icon: "edit", moduleKey: "masjidCorrections" },
      { to: "/admin/pending-reviews", label: "Pending Reviews", icon: "star", moduleKey: "pendingReviews" },
      { to: "/admin/verification", label: "Green Tick", icon: "verify", moduleKey: "greenTick" },
    ],
  },
  {
    label: "Community Wall",
    icon: "megaphone",
    children: [
      { to: "/admin/community-wall", label: "Community Wall", icon: "megaphone", moduleKey: "communityWall" },
      { to: "/admin/deleted-reels", label: "Deleted Reels", icon: "trash", moduleKey: "communityWall" },
      { to: "/admin/moderation", label: "Reported Content", icon: "flag", moduleKey: "moderation" },
    ],
  },
  { to: "/admin/campaigns", label: "Campaigns", icon: "campaign", moduleKey: "campaigns" },
  { to: "/admin/jobs", label: "Jobs", icon: "briefcase", moduleKey: "jobs" },
  {
    label: "Support & Help",
    icon: "shield",
    children: [
      { to: "/admin/concerns", label: "Raise a Concern", icon: "shield", moduleKey: "support" },
      { to: "/admin/contact-inquiries", label: "Contact Us", icon: "mail", moduleKey: "support" },
      { to: "/admin/faq", label: "FAQ & AI Assistant", icon: "info", moduleKey: "support" },
    ],
  },
  {
    label: "Testimonials & Stories",
    icon: "quote",
    children: [
      { to: "/admin/testimonials", label: "Testimonials", icon: "quote", moduleKey: "testimonials" },
      { to: "/admin/success-stories", label: "Success Stories", icon: "book", moduleKey: "testimonials" },
    ],
  },
  { to: "/admin/meta", label: "Meta", icon: "layers", moduleKey: "meta" },
  { to: "/admin/pages", label: "Pages", icon: "fileText", moduleKey: "pages" },
  { to: "/admin/translations", label: "Translations", icon: "content", moduleKey: "translations" },
  { to: "/admin/notifications", label: "Notifications", icon: "bell", moduleKey: "notifications" },
  { to: "/admin/settings", label: "Settings", icon: "settings", moduleKey: "settings" },
  {
    label: "Developer",
    icon: "code",
    children: [
      { to: "/admin/developer", label: "Documentation", icon: "code", moduleKey: "developer" },
      { to: "/admin/testing", label: "Automated Testing", icon: "check", moduleKey: "developer" },
      { to: "/admin/system-health", label: "System Health", icon: "activity", moduleKey: "developer" },
    ],
  },
];

// Flat (path, moduleKey) pairs derived from NAV_ITEMS, longest path first, so
// the page-visit tracker below can reverse-map any admin pathname to the
// module that owns it (a route can be more specific than its nav entry, e.g.
// "/admin/staff/5/activity" under the "/admin/staff" nav link).
const PATH_MODULES = NAV_ITEMS.flatMap((item) => (item.children ? item.children : [item]))
  .filter((item) => item.to && item.moduleKey)
  .map((item) => ({ to: item.to, moduleKey: item.moduleKey }))
  .sort((a, b) => b.to.length - a.to.length);

function moduleForPath(pathname) {
  const match = PATH_MODULES.find((m) => pathname === m.to || pathname.startsWith(`${m.to}/`));
  return match?.moduleKey || null;
}

const ROLE_LABELS = { super_admin: "Platform Administrator", staff: "Staff" };

function hasModulePermission(user, moduleKey) {
  if (!moduleKey) return true;
  if (!user || user.role === "super_admin") return true;
  const granted = user.permissions?.[moduleKey];
  return Array.isArray(granted) && granted.length > 0;
}

// Shows everything while `user` is still loading (avoids an empty-nav
// flash on first paint) -- for a staff account this means one brief
// full-nav render before narrowing once /auth/me resolves, which is a
// minor, one-time cosmetic tradeoff rather than a security issue (routes
// are enforced server-side regardless of what the nav shows).
function filterNavItems(items, user) {
  if (!user || user.role === "super_admin") return items;
  return items
    .map((item) => {
      if (item.children) {
        const children = item.children.filter((c) => hasModulePermission(user, c.moduleKey));
        return children.length ? { ...item, children } : null;
      }
      return hasModulePermission(user, item.moduleKey) ? item : null;
    })
    .filter(Boolean);
}

// Nav items whose badge count is polled alongside the bell notifications —
// each endpoint is expected to return { unresolved: <number>, ... }.
const BADGE_SOURCES = {
  "/admin/concerns": "/concerns/counts",
  "/admin/contact-inquiries": "/contact-inquiries/counts",
};

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

function NotificationsMenu({ alerts, unreadCount, onOpenAlert, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className="amx-icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Icon name="bell" />
        {unreadCount > 0 && <span className="amx-icon-dot" />}
      </button>
      {open && (
        <div className="amx-dropdown" style={{ width: 340, minWidth: 340 }}>
          <div className="amx-dropdown-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Notifications</strong>
              <span>{unreadCount} unread</span>
            </div>
            {unreadCount > 0 && (
              <button type="button" className="amx-mark-read-link" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="amx-notif-list">
            {alerts.length === 0 && (
              <div className="amx-notif-empty">
                <Icon name="bell" size={20} />
                <span>You're all caught up — no notifications yet.</span>
              </div>
            )}
            {alerts.map((n) => (
              <button
                type="button"
                key={n.id}
                className={`amx-notif-item${n.isRead ? " read" : ""}`}
                onClick={() => {
                  setOpen(false);
                  onOpenAlert(n);
                }}
              >
                <span className="amx-notif-dot" />
                <span className="amx-notif-item-body">
                  <span className="amx-notif-item-title">{n.title}</span>
                  {n.body && <span className="amx-notif-item-text">{n.body}</span>}
                  <span className="amx-notif-item-time">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LogoutConfirmModal({ onCancel, onConfirm }) {
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close">
          <Icon name="x" size={16} />
        </button>
        <div className="amx-modal-danger-icon">
          <Icon name="logout" size={22} />
        </div>
        <h3 style={{ textAlign: "center" }}>Log out of Masjid My Community?</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>
          You'll need to sign in again to access the admin console.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
          <button className="amx-btn amx-btn-danger" style={{ flex: 1 }} onClick={onConfirm}>
            <Icon name="logout" size={16} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfileMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useClickOutside(ref, () => setOpen(false));

  const logout = () => {
    adminApi.post("/auth/logout").catch(() => {});
    clearSession();
    navigate("/admin/login", { replace: true });
  };

  const name = user?.name || "Admin";
  const role = ROLE_LABELS[user?.role] || user?.role || "Platform Administrator";
  const email = user?.email || "";
  const avatarUrl = user?.avatarUrl;

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className={`amx-profile-btn${open ? " open" : ""}`} onClick={() => setOpen((o) => !o)}>
        <span className="amx-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : initialsOf(name)}</span>
        <span>
          <span className="amx-profile-name">{name}</span>
          <span className="amx-profile-role">{role}</span>
        </span>
        <Icon name="chevronDown" className="amx-chev" />
      </button>
      {open && (
        <div className="amx-dropdown">
          <div className="amx-dropdown-head">
            <strong>{name}</strong>
            <span>{email}</span>
          </div>
          <NavLink to="/admin/settings" onClick={() => setOpen(false)}>
            <Icon name="settings" size={16} />
            Account Settings
          </NavLink>
          <a href="#help">
            <Icon name="info" size={16} />
            Help &amp; Support
          </a>
          <div className="amx-dropdown-sep" />
          <button
            className="danger"
            onClick={() => {
              setOpen(false);
              setConfirmingLogout(true);
            }}
          >
            <Icon name="logout" size={16} />
            Log Out
          </button>
        </div>
      )}
      {confirmingLogout && <LogoutConfirmModal onCancel={() => setConfirmingLogout(false)} onConfirm={logout} />}
    </div>
  );
}

// A top-nav item with children (currently only "Support & Help") — renders as
// a toggle button that pops open a small menu of its child links, mirroring
// the existing .amx-dropdown pattern used for notifications/profile so it
// feels native to the rest of the top bar rather than a bolted-on widget.
//
// The submenu is portaled to .admin-root rather than nested in
// .amx-nav-dropdown: .amx-nav scrolls horizontally on narrow screens
// (overflow-x:auto), which forces overflow-y to clip too, so an
// absolutely-positioned child would be invisible — a fixed-position portal
// sidesteps that clipping. Portaling to .admin-root (rather than all the way
// to <body>) keeps the --a-* CSS variables in scope, since they're defined
// on .admin-root, not :root.
function NavDropdown({ item, badgeCounts, pathname }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);

  const updateCoords = () => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 10, left: r.left });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener("resize", updateCoords);
    window.addEventListener("scroll", updateCoords, true);
    return () => {
      window.removeEventListener("resize", updateCoords);
      window.removeEventListener("scroll", updateCoords, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (wrapRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const isChildActive = item.children.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
  const totalBadge = item.children.reduce((sum, c) => sum + (badgeCounts[c.to] || 0), 0);

  return (
    <div className="amx-nav-dropdown" ref={wrapRef}>
      <button
        type="button"
        className={`amx-nav-dropdown-trigger${isChildActive ? " active" : ""}${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Icon name={item.icon} size={16} />
        {item.label}
        {totalBadge > 0 && <span className="amx-nav-count-badge">{totalBadge > 99 ? "99+" : totalBadge}</span>}
        <Icon name="chevronDown" size={13} className="amx-nav-dropdown-chev" />
      </button>
      {open &&
        coords &&
        createPortal(
          <div className="amx-nav-submenu" ref={menuRef} style={{ top: coords.top, left: coords.left }}>
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) => (isActive ? "active" : "")}
                onClick={() => setOpen(false)}
              >
                <Icon name={child.icon} size={16} />
                {child.label}
                {badgeCounts[child.to] > 0 && (
                  <span className="amx-nav-count-badge">{badgeCounts[child.to] > 99 ? "99+" : badgeCounts[child.to]}</span>
                )}
              </NavLink>
            ))}
          </div>,
          document.querySelector(".admin-root") || document.body
        )}
    </div>
  );
}

function AdminLayout() {
  const [user, setUser] = useState(() => getUser());
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeCounts, setBadgeCounts] = useState({});
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    adminApi
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        updateStoredUser(data.user);
      })
      .catch(() => {});

    const onUserUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-admin-user-updated", onUserUpdated);
    return () => window.removeEventListener("mmc-admin-user-updated", onUserUpdated);
  }, []);

  useEffect(() => {
    const load = () => {
      adminApi
        .get("/alerts")
        .then(({ data }) => {
          setAlerts(data.alerts);
          setUnreadCount(data.unreadCount);
        })
        .catch(() => {});
      Object.entries(BADGE_SOURCES).forEach(([to, endpoint]) => {
        adminApi
          .get(endpoint)
          .then(({ data }) => setBadgeCounts((c) => ({ ...c, [to]: data.unresolved })))
          .catch(() => {});
      });
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    adminApi.post("/activity/page-view", { module: moduleForPath(pathname), path: pathname }).catch(() => {});
  }, [pathname]);

  const openAlert = (n) => {
    if (!n.isRead) {
      adminApi.patch(`/alerts/${n.id}/read`).then(({ data }) => setUnreadCount(data.unreadCount)).catch(() => {});
      setAlerts((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
    if (n.link) navigate(n.link);
  };

  const markAllAlertsRead = () => {
    adminApi.patch("/alerts/read-all").then(() => setUnreadCount(0)).catch(() => {});
    setAlerts((list) => list.map((x) => ({ ...x, isRead: true })));
  };

  return (
    <div className="admin-root">
      <div className="amx-shell">
        <header className="amx-topbar">
          <div className="amx-topbar-row1">
            <NavLink to="/admin/dashboard" className="amx-topbar-brand">
              <img src="/logo.svg" alt="Masjid My Community logo" />
              Masjid <em>My Community</em>
              <span className="amx-tag">Admin</span>
            </NavLink>

            <div className="amx-topbar-search">
              <Icon name="search" />
              <input type="text" placeholder="Search masjids, campaigns, donors…" />
            </div>

            <div className="amx-topbar-actions">
              <NotificationsMenu alerts={alerts} unreadCount={unreadCount} onOpenAlert={openAlert} onMarkAllRead={markAllAlertsRead} />
              <ProfileMenu user={user} />
            </div>
          </div>
          <div className="amx-topbar-row2">
            <nav className="amx-nav">
              {filterNavItems(NAV_ITEMS, user).map((item) =>
                item.children ? (
                  <NavDropdown key={item.label} item={item} badgeCounts={badgeCounts} pathname={pathname} />
                ) : (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                    <Icon name={item.icon} size={16} />
                    {item.label}
                    {badgeCounts[item.to] > 0 && (
                      <span className="amx-nav-count-badge">{badgeCounts[item.to] > 99 ? "99+" : badgeCounts[item.to]}</span>
                    )}
                  </NavLink>
                )
              )}
            </nav>
          </div>
        </header>

        <main className="amx-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
