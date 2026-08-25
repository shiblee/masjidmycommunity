import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import userApi from "../services/userApi.js";
import { getStoredUser, setUserSession, clearUserSession } from "../utils/userAuthStorage.js";

const PROFILE_SECTIONS = [
  { key: "profile", label: "Profile", icon: "people" },
  { key: "security", label: "Security", icon: "shieldCheck" },
];

function ProfileSection({ user, onUserUpdated }) {
  const [section, setSection] = useState("profile");
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  // --- Profile tab ---
  const [form, setForm] = useState({ fullName: user.fullName || "", email: user.email || "", mobile: user.mobile || "" });
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);
  const [mobileVerified, setMobileVerified] = useState(user.mobileVerified);
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [otpTarget, setOtpTarget] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    try {
      const { data } = await userApi.patch("/me", form);
      setEmailVerified(data.user.emailVerified);
      setMobileVerified(data.user.mobileVerified);
      onUserUpdated(data.user);
      showToast("Profile updated.");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Couldn't save your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const sendOtp = async (target) => {
    setOtpSending(true);
    setOtpError("");
    setOtpCode("");
    try {
      const { data } = await userApi.post("/me/verify/send-otp", { target });
      setDemoOtp(data.demoOtp || "");
      setOtpTarget(target);
    } catch (err) {
      setProfileError(err.response?.data?.message || "Couldn't send the verification code.");
    } finally {
      setOtpSending(false);
    }
  };

  const confirmOtp = async () => {
    setOtpError("");
    try {
      const { data } = await userApi.post("/verify-otp", { userId: user.id, otp: otpCode });
      if (data.user) {
        setEmailVerified(data.user.emailVerified);
        setMobileVerified(data.user.mobileVerified);
        onUserUpdated(data.user);
      }
      setOtpTarget(null);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Incorrect code.");
    }
  };

  // --- Security tab ---
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const savePassword = async (e) => {
    e.preventDefault();
    setPwError("");
    if (!pw.current || !pw.next) return setPwError("Enter your current password and a new password.");
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/[0-9]/.test(pw.next)) {
      return setPwError("New password must be at least 8 characters and include a letter and a number.");
    }
    if (pw.next !== pw.confirm) return setPwError("New password and confirmation don't match.");

    setSavingPw(true);
    try {
      const { data } = await userApi.put("/me/password", { currentPassword: pw.current, newPassword: pw.next });
      // The server bumps tokenVersion on password change, invalidating the token
      // used to make this very request — swap in the fresh one immediately.
      setUserSession({ token: data.token, user: data.user, remember: !!localStorage.getItem("mmc-user-token") });
      setPw({ current: "", next: "", confirm: "" });
      showToast("Password updated.");
    } catch (err) {
      setPwError(err.response?.data?.message || "Couldn't update your password.");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="section-head" style={{ marginTop: 48 }}>
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

        <div className="card acct-settings-card">
          {section === "profile" && (
            <form onSubmit={saveProfile}>
              {profileError && <div className="auth-alert" style={{ marginBottom: 18 }}><Icon name="info" size={17} />{profileError}</div>}

              <div className="auth-field">
                <label>Full Name</label>
                <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </div>

              <div className="auth-field msj-verifiable-field">
                <label>Email Address</label>
                <div className="msj-verifiable-row">
                  <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
                  {form.email && emailVerified ? (
                    <span className="acct-status-pill active"><Icon name="check" size={13} /> Verified</span>
                  ) : form.email ? (
                    <button className="btn btn-outline-ink" type="button" disabled={otpSending} onClick={() => sendOtp("email")}>{otpSending ? "Sending…" : "Verify"}</button>
                  ) : null}
                </div>
              </div>

              <div className="auth-field msj-verifiable-field">
                <label>Mobile Number</label>
                <div className="msj-verifiable-row">
                  <input
                    value={form.mobile}
                    onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                  />
                  {form.mobile && mobileVerified ? (
                    <span className="acct-status-pill active"><Icon name="check" size={13} /> Verified</span>
                  ) : form.mobile ? (
                    <button className="btn btn-outline-ink" type="button" disabled={otpSending} onClick={() => sendOtp("mobile")}>{otpSending ? "Sending…" : "Verify"}</button>
                  ) : null}
                </div>
              </div>

              <button type="submit" className="btn btn-gold" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save Changes"}</button>
            </form>
          )}

          {section === "security" && (
            <form onSubmit={savePassword}>
              {pwError && <div className="auth-alert" style={{ marginBottom: 18 }}><Icon name="info" size={17} />{pwError}</div>}

              {["current", "next", "confirm"].map((key) => (
                <div className="auth-field" key={key}>
                  <label>{key === "current" ? "Current Password" : key === "next" ? "New Password" : "Confirm New Password"}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw[key] ? "text" : "password"}
                      value={pw[key]}
                      onChange={(e) => setPw((p) => ({ ...p, [key]: e.target.value }))}
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
                </div>
              ))}

              <button type="submit" className="btn btn-gold" disabled={savingPw}>{savingPw ? "Updating…" : "Update Password"}</button>
            </form>
          )}
        </div>
      </div>

      {otpTarget && (
        <div className="msj-modal-overlay" onClick={() => setOtpTarget(null)}>
          <div className="msj-modal" onClick={(e) => e.stopPropagation()}>
            <button className="msj-modal-close" onClick={() => setOtpTarget(null)} aria-label="Close"><Icon name="x" size={16} /></button>
            <h3>Verify {otpTarget === "email" ? "Email Address" : "Mobile Number"}</h3>
            <p className="msj-modal-sub">Enter the 6-digit code sent to {otpTarget === "email" ? form.email : form.mobile}.</p>
            {demoOtp && <p className="msj-note">Demo mode — verification code: <strong>{demoOtp}</strong></p>}
            <div className="auth-field">
              <input value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" maxLength={6} style={{ letterSpacing: "6px", textAlign: "center", fontSize: 20 }} />
            </div>
            {otpError && <span className="auth-field-error">{otpError}</span>}
            <button className="btn btn-gold" style={{ width: "100%", marginTop: 12 }} onClick={confirmOtp} type="button">Verify</button>
            <button className="msj-resend-link" type="button" onClick={() => sendOtp(otpTarget)}>Resend code</button>
          </div>
        </div>
      )}

      {toast && <div className="acct-toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}

const NEXT_STEPS = [
  { icon: "mosque", title: "Register Your Masjid", desc: "Add your masjid's profile so it can be verified and featured.", cta: "My Masjids", to: "/account/masjids", live: true },
  { icon: "flag", title: "Create a Campaign", desc: "Launch a fundraising campaign for your masjid's next project.", cta: "Start a Campaign", intentKey: "campaign" },
  { icon: "chartUp", title: "Manage Campaigns", desc: "Track fundraising progress and update your active campaigns.", cta: "View Campaigns" },
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

  const logout = () => {
    clearUserSession();
    navigate("/");
  };

  if (!user) return null;

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div className="acct-avatar">{initialsOf(user.fullName)}</div>
          <div>
            <span className="eyebrow">Your Account</span>
            <h1>Welcome, {user.fullName.split(" ")[0]}.</h1>
            <p>
              {intent === "campaign"
                ? "You're signed in — you're ready to start your campaign."
                : "Manage your account and take the next step on Masjid My Community."}
            </p>
          </div>
          <button className="btn btn-outline-paper acct-logout" onClick={logout}>
            Log Out
          </button>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          <div className="acct-status-card">
            <div>
              <span className="acct-status-label">Account Status</span>
              <span className={`acct-status-pill ${user.status}`}>
                {user.status === "active" ? "Active" : user.status.replace("_", " ")}
              </span>
            </div>
            <div>
              <span className="acct-status-label">Username</span>
              <span className="acct-status-value">{user.username}</span>
            </div>
            <div>
              <span className="acct-status-label">Email</span>
              <span className="acct-status-value">{user.email || "—"}</span>
            </div>
            <div>
              <span className="acct-status-label">Mobile</span>
              <span className="acct-status-value">{user.mobile || "—"}</span>
            </div>
          </div>

          <ProfileSection user={user} onUserUpdated={setUser} />

          <div className="section-head" style={{ marginTop: 48 }}>
            <span className="eyebrow">What's next</span>
            <h2>Continue your journey</h2>
          </div>

          <div className="acct-next-grid">
            {NEXT_STEPS.map((s) => (
              <div className={`acct-next-card${intent === s.intentKey || s.live ? " highlighted" : ""}`} key={s.title}>
                {intent === s.intentKey || s.live ? <span className="acct-next-flag">{s.live ? "Available" : "Continue here"}</span> : <span className="acct-next-soon">Coming soon</span>}
                <div className="acct-next-icon">
                  <Icon name={s.icon} size={24} />
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {s.to ? (
                  <button className="acct-next-cta" type="button" onClick={() => navigate(s.to)}>
                    {s.cta} <span className="btn-arrow">→</span>
                  </button>
                ) : (
                  <button className="acct-next-cta" type="button" title="This workflow is launching in the next phase.">
                    {s.cta} <span className="btn-arrow">→</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Account;
