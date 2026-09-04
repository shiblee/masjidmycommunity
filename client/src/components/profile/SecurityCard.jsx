import React, { useState } from "react";
import { Icon } from "../Icons.jsx";
import userApi from "../../services/userApi.js";
import { setUserSession, isRemembered } from "../../utils/userAuthStorage.js";

function SecurityCard() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

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
      // The server bumps tokenVersion and revokes every other session on
      // password change, invalidating the token used to make this very
      // request — swap in the fresh token + refresh token immediately.
      setUserSession({ token: data.token, refreshToken: data.refreshToken, user: data.user, remember: isRemembered() });
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
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>Security</h3>
      </div>
      <form onSubmit={savePassword}>
        {pwErrors.form && <div className="auth-alert" style={{ marginBottom: 18 }}><Icon name="bulb" size={17} />{pwErrors.form}</div>}

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

      {toast && <div className="acct-toast"><Icon name="check" size={16} />{toast}</div>}
    </div>
  );
}

export default SecurityCard;
