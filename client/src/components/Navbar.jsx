import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getStoredUser, clearUserSession } from "../utils/userAuthStorage.js";

const links = [
  { href: "/explore-masjids", label: "Explore Masjids" },
  { href: "/community", label: "My Community" },
  { href: "/our-impact", label: "Impact" },
  { href: "/about", label: "About Us" },
];

function linkPath(href) {
  return href.startsWith("#") ? `/${href}` : href;
}

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
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
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [headerHeight, setHeaderHeight] = useState(74);
  const menuRef = useRef(null);
  const announceRef = useRef(null);
  const navElRef = useRef(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLinkActive = (href) => !href.startsWith("#") && pathname === href;

  useClickOutside(menuRef, () => setMenuOpen(false));

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

  const logout = () => {
    clearUserSession();
    setMenuOpen(false);
    setOpen(false);
    navigate("/");
  };

  return (
    <>
      <div className="announce" ref={announceRef}>
        🕌 Empowering masjids. Strengthening communities. Join the global movement.
        <Link to="/#campaigns">Explore campaigns →</Link>
      </div>
      <header className="nav" ref={navElRef}>
        <div className="nav-inner">
          <Link to="/" className="logo">
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
            {user ? (
              <div className="nav-user" ref={menuRef}>
                <button className={`nav-user-btn${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen((o) => !o)}>
                  <span className="nav-user-avatar">{initialsOf(user.fullName)}</span>
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
                    <Link to="/account" onClick={() => setMenuOpen(false)}>
                      My Account
                    </Link>
                    <div className="nav-user-dropdown-sep" />
                    <button onClick={logout}>Log Out</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/auth" className="login-link">Log in</Link>
                <Link to="/auth?intent=campaign" className="nav-cta">Start a Campaign</Link>
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
            <span className="nav-user-avatar">{initialsOf(user.fullName)}</span>
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
          <Link to="/account" onClick={() => setOpen(false)}>
            My Account
          </Link>
        )}
        <Link to="/#register" className="btn btn-gold" onClick={() => setOpen(false)}>
          Register Your Masjid
        </Link>
        {user && (
          <button type="button" className="mobile-menu-logout" onClick={logout}>
            Log Out
          </button>
        )}
      </div>
    </>
  );
}

export default Navbar;
