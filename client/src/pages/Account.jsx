import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import userApi from "../services/userApi.js";
import { getStoredUser, setUserSession, updateStoredUser } from "../utils/userAuthStorage.js";
import { API_ORIGIN } from "../config.js";
import ProfileCompletion from "../components/profile/ProfileCompletion.jsx";
import ProfilePhotoCard from "../components/profile/ProfilePhotoCard.jsx";
import PersonalDetailsCard from "../components/profile/PersonalDetailsCard.jsx";
import WorkExperienceCard from "../components/profile/WorkExperienceCard.jsx";
import EducationCard from "../components/profile/EducationCard.jsx";
import HobbiesCard from "../components/profile/HobbiesCard.jsx";
import SkillsCard from "../components/profile/SkillsCard.jsx";

const PROFILE_SECTIONS = [
  { key: "photo", label: "Photo", icon: "camera" },
  { key: "personal", label: "Personal Details", icon: "people" },
  { key: "work-experience", label: "Work Experience", icon: "building" },
  { key: "education", label: "Education", icon: "book" },
  { key: "hobbies", label: "Hobbies & Interests", icon: "star" },
  { key: "skills", label: "Skills", icon: "bulb" },
  { key: "security", label: "Security", icon: "shieldCheck" },
];

function ProfileSection({ user, onUserUpdated }) {
  const [section, setSection] = useState("profile");
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  // --- Security tab ---
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const savePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pw.current) errs.current = "Enter your current password.";
    else if (!pw.next) errs.next = "Enter a new password.";
    else if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/[0-9]/.test(pw.next)) {
      errs.next = "New password must be at least 8 characters and include a letter and a number.";
    } else if (pw.next !== pw.confirm) errs.confirm = "New password and confirmation don't match.";
    setPwErrors(errs);
    if (Object.keys(errs).length) return;

    setSavingPw(true);
    try {
      const { data } = await userApi.put("/me/password", { currentPassword: pw.current, newPassword: pw.next });
      // The server bumps tokenVersion on password change, invalidating the token
      // used to make this very request — swap in the fresh one immediately.
      setUserSession({ token: data.token, user: data.user, remember: !!localStorage.getItem("mmc-user-token") });
      setPw({ current: "", next: "", confirm: "" });
      showToast("Password updated.");
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't update your password.";
      setPwErrors({ current: /current password/i.test(message) ? message : undefined, form: /current password/i.test(message) ? undefined : message });
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="section-head">
      <span className="eyebrow">Profile &amp; Security</span>
      <h2>Manage your account</h2>

      <div className="acct-settings-layout" style={{ marginTop: 24 }}>
        <nav className="acct-settings-nav">
          {PROFILE_SECTIONS.map((s) => (
            <button type="button" key={s.key} className={section === s.key ? "active" : ""} onClick={() => setSection(s.key)}>
              <Icon name={s.icon} size={16} />
              {s.label}
            </button>
          ))}
        </nav>

        {section !== "security" && (
          <div className="profile-stack">
            <ProfileCompletion user={user} />
            {section === "photo" && <ProfilePhotoCard user={user} onUserUpdated={onUserUpdated} />}
            {section === "personal" && <PersonalDetailsCard user={user} onUserUpdated={onUserUpdated} />}
            {section === "work-experience" && <WorkExperienceCard />}
            {section === "education" && <EducationCard />}
            {section === "hobbies" && <HobbiesCard />}
            {section === "skills" && <SkillsCard />}
          </div>
        )}

        {section === "security" && (
          <div className="card acct-settings-card">
            <form onSubmit={savePassword}>
              {pwErrors.form && <div className="auth-alert" style={{ marginBottom: 18 }}><Icon name="info" size={17} />{pwErrors.form}</div>}

              {["current", "next", "confirm"].map((key) => (
                <div className="auth-field" key={key}>
                  <label>{key === "current" ? "Current Password" : key === "next" ? "New Password" : "Confirm New Password"}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw[key] ? "text" : "password"}
                      value={pw[key]}
                      onChange={(e) => { setPw((p) => ({ ...p, [key]: e.target.value })); setPwErrors((er) => ({ ...er, [key]: null })); }}
                      placeholder={key === "current" ? "Enter your current password" : "At least 8 characters"}
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-on-paper-dim)", cursor: "pointer" }}
                      aria-label={showPw[key] ? "Hide password" : "Show password"}
                    >
                      <Icon name={showPw[key] ? "eyeOff" : "eye"} size={18} />
                    </button>
                  </div>
                  {pwErrors[key] && <span className="auth-field-error">{pwErrors[key]}</span>}
                </div>
              ))}

              <button type="submit" className="btn btn-gold" disabled={savingPw}>{savingPw ? "Updating…" : "Update Password"}</button>
            </form>
          </div>
        )}
      </div>

      {toast && <div className="acct-toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}

const NEXT_STEPS = [
  { icon: "mosque", title: "Register Your Masjid", desc: "Add your masjid's profile so it can be verified and featured.", cta: "My Masjids", to: "/account/my-masjids", live: true },
  { icon: "flag", title: "Create a Campaign", desc: "Launch a fundraising campaign for your masjid's next project.", cta: "Start a Campaign", intentKey: "campaign", to: "/account/my-campaigns/new", live: true },
  { icon: "chartUp", title: "Manage Campaigns", desc: "Track fundraising progress and update your active campaigns.", cta: "View Campaigns", to: "/account/my-campaigns", live: true },
  { icon: "heart", title: "View Donations", desc: "See the contributions your campaigns have received.", cta: "View Donations" },
];

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function Account() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent = params.get("intent");
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    userApi
      .get("/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => {});
  }, []);

  const editingProfile = params.get("edit") === "profile";

  const handleUserUpdated = (updatedUser) => {
    setUser(updatedUser);
    updateStoredUser(updatedUser);
  };

  if (!user) return null;

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          {user.profilePhoto ? (
            <img className="acct-avatar acct-avatar-photo" src={`${API_ORIGIN}${user.profilePhoto}`} alt={user.fullName} />
          ) : (
            <div className="acct-avatar">{initialsOf(user.fullName)}</div>
          )}
          <div>
            <span className="eyebrow">Your Account</span>
            <h1>Welcome, {user.fullName.split(" ")[0]}.</h1>
            <p>
              {intent === "campaign"
                ? "You're signed in — you're ready to start your campaign."
                : "Manage your account and take the next step on Masjid My Community."}
            </p>
          </div>
        </div>
      </section>

      <section className="py-sm" style={{ paddingTop: 36 }}>
        <div className="wrap">
          {editingProfile ? (
            <ProfileSection user={user} onUserUpdated={handleUserUpdated} />
          ) : (
            <>
              <div className="section-head">
                <span className="eyebrow">What's next</span>
                <h2>Continue your journey</h2>
              </div>

              <div className="acct-next-grid">
                {NEXT_STEPS.map((s) => (
                  <div
                    className={`acct-next-card${intent === s.intentKey || s.live ? " highlighted" : ""}${s.to ? " clickable" : ""}`}
                    key={s.title}
                    role={s.to ? "button" : undefined}
                    tabIndex={s.to ? 0 : undefined}
                    onClick={s.to ? () => navigate(s.to) : undefined}
                    onKeyDown={s.to ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(s.to); } } : undefined}
                  >
                    {intent === s.intentKey || s.live ? <span className="acct-next-flag">{s.live ? "Available" : "Continue here"}</span> : <span className="acct-next-soon">Coming soon</span>}
                    <div className="acct-next-icon">
                      <Icon name={s.icon} size={24} />
                    </div>
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                    {s.to ? (
                      <span className="acct-next-cta">
                        {s.cta} <span className="btn-arrow">→</span>
                      </span>
                    ) : (
                      <span className="acct-next-cta" title="This workflow is launching in the next phase.">
                        {s.cta} <span className="btn-arrow">→</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default Account;
