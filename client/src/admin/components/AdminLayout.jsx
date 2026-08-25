import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Icon from "./Icons.jsx";
import adminApi from "../services/adminApi.js";
import { getUser, updateStoredUser, clearSession } from "../authStorage.js";

function initialsOf(name) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/masjids", label: "Masjids", icon: "mosque" },
  { to: "/admin/campaigns", label: "Campaigns", icon: "campaign" },
  { to: "/admin/donations", label: "Donations", icon: "donation" },
  { to: "/admin/donors", label: "Donors", icon: "donors" },
  { to: "/admin/projects", label: "Projects", icon: "projects" },
  { to: "/admin/fund-utilization", label: "Fund Utilization", icon: "fund" },
  { to: "/admin/verification", label: "Verification", icon: "verify" },
  { to: "/admin/reports", label: "Reports & Analytics", icon: "reports" },
  { to: "/admin/users", label: "Users", icon: "users" },
  { to: "/admin/registered-users", label: "Registered Users", icon: "globe" },
  { to: "/admin/community-wall", label: "Community Wall", icon: "megaphone" },
  { to: "/admin/content", label: "Content Management", icon: "content" },
  { to: "/admin/notifications", label: "Notifications", icon: "bell" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

const NOTIFICATIONS = [
  { id: 1, text: "Green Valley Masjid submitted verification documents.", time: "8m ago", read: false },
  { id: 2, text: "Winter Relief Drive crossed 90% of its funding goal.", time: "42m ago", read: false },
  { id: 3, text: "New donor milestone: 12,000 total donors reached.", time: "2h ago", read: false },
  { id: 4, text: "Monthly fund-utilization report is ready for review.", time: "5h ago", read: true },
  { id: 5, text: "Al-Noor Community Center profile was updated.", time: "1d ago", read: true },
];

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button className="amx-icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications">
        <Icon name="bell" />
        {unread > 0 && <span className="amx-icon-dot" />}
      </button>
      {open && (
        <div className="amx-dropdown" style={{ width: 320, minWidth: 320 }}>
          <div className="amx-dropdown-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>Notifications</strong>
              <span>{unread} unread</span>
            </div>
          </div>
          <div className="amx-notif-list">
            {NOTIFICATIONS.map((n) => (
              <div key={n.id} className={`amx-notif-item${n.read ? " read" : ""}`}>
                <span className="amx-notif-dot" />
                <div>
                  <p>{n.text}</p>
                  <span>{n.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="amx-dropdown-sep" />
          <a href="#notifications">View all notifications</a>
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
    clearSession();
    navigate("/admin/login", { replace: true });
  };

  const name = user?.name || "Admin";
  const role = user?.role || "Platform Administrator";
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

function AdminLayout() {
  const [user, setUser] = useState(() => getUser());

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
              <NotificationsMenu />
              <ProfileMenu user={user} />
            </div>
          </div>
          <div className="amx-topbar-row2">
            <nav className="amx-nav">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </NavLink>
              ))}
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
