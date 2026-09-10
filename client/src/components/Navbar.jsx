import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getStoredUser, clearUserSession } from "../utils/userAuthStorage.js";
import userApi from "../services/userApi.js";
import { API_ORIGIN } from "../config.js";
import { Icon } from "./Icons.jsx";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import { useLoginGatedNav } from "../hooks/useLoginGatedNav.js";

function useNavLinks(t) {
  return [
    { href: "/explore-masjids", label: t("nav.exploreMasjids", "Masjids"), icon: "mosque" },
    { href: "/my-community", label: t("nav.myCommunity", "My Community"), icon: "people" },
    { href: "/campaigns", label: t("nav.campaign", "Campaign"), icon: "megaphone" },
    { href: "/jobs", label: t("nav.jobs", "Jobs"), icon: "briefcase" },
  ];
}

// Mobile-drawer-only "Your Account" section — desktop reaches these through
// the nav-user-dropdown instead, so this list only ever renders inside
// .mobile-menu.
function useAccountLinks(t, username) {
  return [
    { href: "/account/my-masjids", label: t("nav.myMasjids", "My Masjids"), icon: "building" },
    { href: "/account/liked-masjids", label: t("nav.likedMasjids", "Liked Masjids"), icon: "heart" },
    { href: "/account/my-campaigns", label: t("nav.myCampaigns", "My Campaigns"), icon: "chartUp" },
    { href: "/account/my-jobs", label: t("nav.myJobs", "My Jobs"), icon: "briefcase" },
    { href: "/account/my-applications", label: t("nav.myApplications", "My Applications"), icon: "fileText" },
    { href: `/profile/${username}`, label: t("nav.myProfile", "My Profile"), icon: "user" },
  ];
}

function linkPath(href) {
  return href.startsWith("#") ? `/${href}` : href;
}

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function UserAvatar({ user }) {
  return user.profilePhoto ? (
    <img className="nav-user-avatar nav-user-avatar-photo" src={`${API_ORIGIN}${user.profilePhoto}`} alt={user.fullName} />
  ) : (
    <span className="nav-user-avatar">{initialsOf(user.fullName)}</span>
  );
}

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

function useClickOutside(ref, onOutside) {
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

function Navbar() {
  const { t } = useTranslation();
  const links = useNavLinks(t);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(() => getStoredUser());
  const accountLinks = useAccountLinks(t, user?.username);
  const [headerHeight, setHeaderHeight] = useState(74);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const announceRef = useRef(null);
  const navElRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const goToCampaigns = useLoginGatedNav();
  // A nav item also stays highlighted on that section's own detail pages —
  // /masjid/:slug and /campaign/:slug aren't sub-paths of the plural list
  // pages (/explore-masjids, /campaigns) they belong to, so an exact match
  // alone would leave "Masjids"/"Campaign" unhighlighted on every profile page.
  const ACTIVE_PREFIXES = { "/explore-masjids": "/masjid/", "/campaigns": "/campaign/", "/jobs": "/job/" };
  const isLinkActive = (href) => !href.startsWith("#") && (pathname === href || pathname.startsWith(ACTIVE_PREFIXES[href] || "\0"));

  useClickOutside(menuRef, () => setMenuOpen(false));
  useClickOutside(notifRef, () => setNotifOpen(false));

  // Measured as two elements rather than one wrapping div: a shared wrapper
  // sized to hug its children leaves position:sticky on the header with zero
  // room to stick within, since a sticky element can't stick past its own
  // containing block's edge. The announce bar and header stay siblings so
  // the header's sticky containing block is the full page instead.
  useEffect(() => {
    const update = () => setHeaderHeight((announceRef.current?.offsetHeight || 0) + (navElRef.current?.offsetHeight || 0));
    update();
    const ro = new ResizeObserver(update);
    if (announceRef.current) ro.observe(announceRef.current);
    if (navElRef.current) ro.observe(navElRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    const onSessionUpdated = (e) => setUser(e.detail);
    window.addEventListener("mmc-user-session-updated", onSessionUpdated);
    return () => window.removeEventListener("mmc-user-session-updated", onSessionUpdated);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    const load = () => {
      userApi
        .get("/notifications")
        .then(({ data }) => {
          if (cancelled) return;
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const openNotification = (n) => {
    setNotifOpen(false);
    if (!n.isRead) {
      userApi.patch(`/notifications/${n.id}/read`).then(({ data }) => setUnreadCount(data.unreadCount)).catch(() => {});
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    }
    if (n.link) navigate(n.link);
  };

  const markAllNotificationsRead = () => {
    userApi.patch("/notifications/read-all").then(() => setUnreadCount(0)).catch(() => {});
    setNotifications((list) => list.map((x) => ({ ...x, isRead: true })));
  };

  const logout = () => {
    // Must clear the session only after the request settles, not before —
    // axios interceptors run on the microtask queue, so clearing the token
    // synchronously here would wipe it before the request interceptor ever
    // reads it, sending the logout call with no Authorization header (it
    // was silently 401ing and never actually recording the logout event).
    userApi
      .post("/logout")
      .catch(() => {})
      .finally(() => {
        clearUserSession();
        setMenuOpen(false);
        setOpen(false);
        navigate("/");
      });
  };

  return (
    <>
      <div className="announce" ref={announceRef}>
        🕌 {t("nav.announce", "Empowering masjids. Strengthening communities. Join the global movement.")}
        <Link to="/explore-campaigns" onClick={(e) => { e.preventDefault(); goToCampaigns("/explore-campaigns"); }}>
          {t("nav.exploreCampaigns", "Explore campaigns →")}
        </Link>
      </div>
      <header className="nav" ref={navElRef}>
        <div className="nav-inner">
          <Link to={user ? "/my-community" : "/"} className="logo">
            <img src="/logo.svg" alt="Masjid My Community logo" />
            Masjid <em>My Community</em>
          </Link>
          <nav>
            <ul className="nav-links">
              {links.map((l) => (
                <li key={l.href}>
                  <Link to={linkPath(l.href)} className={isLinkActive(l.href) ? "active" : undefined}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav-actions">
            {user && (
              <div className="nav-notif" ref={notifRef}>
                <button className="nav-notif-btn" onClick={() => setNotifOpen((o) => !o)} aria-label="Notifications">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && <span className="nav-notif-dot" />}
                </button>
                {notifOpen && (
                  <div className="nav-notif-dropdown">
                    <div className="nav-notif-dropdown-head">
                      <strong>{t("nav.notifications", "Notifications")}</strong>
                      {unreadCount > 0 && (
                        <button type="button" onClick={markAllNotificationsRead}>
                          {t("nav.markAllRead", "Mark all as read")}
                        </button>
                      )}
                    </div>
                    <div className="nav-notif-list">
                      {notifications.length === 0 && <p className="nav-notif-empty">{t("nav.noNotifications", "You're all caught up — no notifications yet.")}</p>}
                      {notifications.map((n) => (
                        <button type="button" key={n.id} className={`nav-notif-item${n.isRead ? "" : " unread"}`} onClick={() => openNotification(n)}>
                          <span className="nav-notif-item-dot" />
                          <span className="nav-notif-item-body">
                            <span className="nav-notif-item-title">{n.title}</span>
                            {n.body && <span className="nav-notif-item-text">{n.body}</span>}
                            <span className="nav-notif-item-time">{timeAgo(n.createdAt)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {user ? (
              <div className="nav-user" ref={menuRef}>
                <button className={`nav-user-btn${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen((o) => !o)}>
                  <UserAvatar user={user} />
                  <span className="nav-user-name">{user.fullName.split(" ")[0]}</span>
                  <svg className="nav-user-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {menuOpen && (
                  <div className="nav-user-dropdown">
                    <div className="nav-user-dropdown-head">
                      <strong>{user.fullName}</strong>
                      <span>{user.email || user.mobile}</span>
                    </div>
                    <Link to="/account/my-masjids" onClick={() => setMenuOpen(false)}>
                      {t("nav.myMasjids", "My Masjids")}
                    </Link>
                    <Link to="/account/liked-masjids" onClick={() => setMenuOpen(false)}>
                      {t("nav.likedMasjids", "Liked Masjids")}
                    </Link>
                    <Link to="/account/my-campaigns" onClick={() => setMenuOpen(false)}>
                      {t("nav.myCampaigns", "My Campaigns")}
                    </Link>
                    <Link to="/account/my-jobs" onClick={() => setMenuOpen(false)}>
                      {t("nav.myJobs", "My Jobs")}
                    </Link>
                    <Link to="/account/my-applications" onClick={() => setMenuOpen(false)}>
                      {t("nav.myApplications", "My Applications")}
                    </Link>
                    <Link to={`/profile/${user.username}`} onClick={() => setMenuOpen(false)}>
                      {t("nav.myProfile", "My Profile")}
                    </Link>
                    <div className="nav-user-dropdown-sep" />
                    <button onClick={logout}>{t("nav.logOut", "Log Out")}</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/auth" className="login-link">{t("nav.logIn", "Log in")}</Link>
                <Link to="/auth?intent=campaign" className="nav-cta">{t("nav.startCampaign", "Login & Registration")}</Link>
              </>
            )}
            <button className="burger" aria-label="Menu" onClick={() => setOpen((o) => !o)}>
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
        </header>
      <div className={`mobile-menu${open ? " open" : ""}`} style={{ top: headerHeight }}>
        {user && (
          <div className="mobile-menu-account">
            <UserAvatar user={user} />
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email || user.mobile}</span>
            </div>
          </div>
        )}

        <div className="mobile-menu-section">
          <span className="mobile-menu-section-label">{t("nav.section.explore", "Explore")}</span>
          {links.map((l) => (
            <Link
              key={l.href}
              to={linkPath(l.href)}
              className={`mobile-menu-item${isLinkActive(l.href) ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="mobile-menu-item-icon"><Icon name={l.icon} size={18} /></span>
              <span className="mobile-menu-item-label">{l.label}</span>
              <span className="mobile-menu-item-chev"><Icon name="chevronRight" size={16} /></span>
            </Link>
          ))}
        </div>

        {user && (
          <div className="mobile-menu-section">
            <span className="mobile-menu-section-label">{t("nav.section.account", "Your Account")}</span>
            {accountLinks.map((l) => (
              <Link key={l.href} to={l.href} className="mobile-menu-item" onClick={() => setOpen(false)}>
                <span className="mobile-menu-item-icon"><Icon name={l.icon} size={18} /></span>
                <span className="mobile-menu-item-label">{l.label}</span>
                <span className="mobile-menu-item-chev"><Icon name="chevronRight" size={16} /></span>
              </Link>
            ))}
          </div>
        )}

        <Link to="/#register" className="btn btn-gold" onClick={() => setOpen(false)}>
          {t("nav.registerMasjid", "Register Your Masjid")}
        </Link>

        {user && (
          <button type="button" className="mobile-menu-item mobile-menu-logout" onClick={logout}>
            <span className="mobile-menu-item-icon"><Icon name="logOut" size={18} /></span>
            <span className="mobile-menu-item-label">{t("nav.logOut", "Log Out")}</span>
          </button>
        )}
      </div>
    </>
  );
}

export default Navbar;
