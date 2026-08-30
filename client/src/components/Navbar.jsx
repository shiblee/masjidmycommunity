import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getStoredUser, clearUserSession } from "../utils/userAuthStorage.js";
import userApi from "../services/userApi.js";
import { API_ORIGIN } from "../config.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";

function useNavLinks(t) {
  return [
    { href: "/explore-masjids", label: t("nav.exploreMasjids", "Explore Masjids") },
    { href: "/my-community", label: t("nav.myCommunity", "My Community") },
    { href: "/our-impact", label: t("nav.impact", "Impact") },
    { href: "/about", label: t("nav.aboutUs", "About Us") },
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
  const [headerHeight, setHeaderHeight] = useState(74);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const announceRef = useRef(null);
  const navElRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLinkActive = (href) => !href.startsWith("#") && pathname === href;

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
    // Fire-and-forget: the server call records the logout event, but the
    // user's session must clear locally even if the request fails.
    userApi.post("/logout").catch(() => {});
    clearUserSession();
    setMenuOpen(false);
    setOpen(false);
    navigate("/");
  };

  return (
    <>
      <div className="announce" ref={announceRef}>
        🕌 {t("nav.announce", "Empowering masjids. Strengthening communities. Join the global movement.")}
        <Link to="/explore-masjids">{t("nav.exploreCampaigns", "Explore campaigns →")}</Link>
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
                    <Link to="/account/my-campaigns" onClick={() => setMenuOpen(false)}>
                      {t("nav.myCampaigns", "My Campaigns")}
                    </Link>
                    <Link to="/account?edit=profile" onClick={() => setMenuOpen(false)}>
                      {t("nav.editProfile", "Edit Profile")}
                    </Link>
                    <div className="nav-user-dropdown-sep" />
                    <button onClick={logout}>{t("nav.logOut", "Log Out")}</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/auth" className="login-link">{t("nav.logIn", "Log in")}</Link>
                <Link to="/auth?intent=campaign" className="nav-cta">{t("nav.startCampaign", "Start a Campaign")}</Link>
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
        {links.map((l) => (
          <Link
            key={l.href}
            to={linkPath(l.href)}
            className={isLinkActive(l.href) ? "active" : undefined}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </Link>
        ))}
        {user && (
          <Link to="/account/my-masjids" onClick={() => setOpen(false)}>
            {t("nav.myMasjids", "My Masjids")}
          </Link>
        )}
        {user && (
          <Link to="/account/my-campaigns" onClick={() => setOpen(false)}>
            {t("nav.myCampaigns", "My Campaigns")}
          </Link>
        )}
        {user && (
          <Link to="/account?edit=profile" onClick={() => setOpen(false)}>
            {t("nav.editProfile", "Edit Profile")}
          </Link>
        )}
        <Link to="/#register" className="btn btn-gold" onClick={() => setOpen(false)}>
          {t("nav.registerMasjid", "Register Your Masjid")}
        </Link>
        {user && (
          <button type="button" className="mobile-menu-logout" onClick={logout}>
            {t("nav.logOut", "Log Out")}
          </button>
        )}
      </div>
    </>
  );
}

export default Navbar;
