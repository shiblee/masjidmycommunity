import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import GeometricPattern from "../components/GeometricPattern.jsx";
import adminApi from "../services/adminApi.js";
import { setSession } from "../authStorage.js";

const REMEMBER_KEY = "mmc-admin-remember-email";
const DEMO_EMAIL = "admin@masjidmycommunity.org";
const DEMO_PASSWORD = "MasjidMyCommunity@2026";

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered) {
      setEmail(remembered);
      setRemember(true);
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Password is required.";
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const { data } = await adminApi.post("/auth/login", {
        email: email.trim(),
        password,
        remember,
      });

      setSession({ token: data.token, user: data.user, remember });
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
      else localStorage.removeItem(REMEMBER_KEY);

      navigate("/admin/dashboard");
    } catch (err) {
      setLoading(false);
      const message = err.response?.data?.message || "Couldn't reach the server. Please try again.";
      setFormError(message);
    }
  };

  return (
    <div className="admin-root">
      <div className="amx-login">
        <div className="amx-login-art">
          <GeometricPattern />
          <div className="amx-login-brand">
            <img src="/logo.svg" alt="Masjid My Community logo" />
            Masjid <em>My Community</em>
          </div>
          <div className="amx-login-copy">
            <span className="amx-login-eyebrow">Admin Console</span>
            <h1>Trust, transparency, and impact — managed from one place.</h1>
            <p>
              Verify masjids, track fundraising across every campaign, and keep donors confident that every
              contribution reaches where it's needed.
            </p>
          </div>
          <div className="amx-login-stats">
            <div>
              <strong>1,284</strong>
              <span>Masjids registered</span>
            </div>
            <div>
              <strong>₹2.5M+</strong>
              <span>Funds tracked</span>
            </div>
            <div>
              <strong>46</strong>
              <span>Countries reached</span>
            </div>
          </div>
        </div>

        <div className="amx-login-panel">
          <div className="amx-login-form-wrap">
            <div className="amx-login-mobile-brand">
              <img src="/logo.svg" alt="Masjid My Community logo" />
              Masjid <em>My Community</em>
            </div>
            <div className="amx-login-head">
              <h2>Welcome back</h2>
              <p>Sign in to the admin console to manage masjids, campaigns, and donations.</p>
            </div>

            {formError && (
              <div className="amx-form-error">
                <Icon name="info" size={17} />
                {formError}
              </div>
            )}

            <form onSubmit={submit} noValidate>
              <div className={`amx-field${errors.email ? " has-error" : ""}`}>
                <label htmlFor="admin-email">Email address</label>
                <div className="amx-input-wrap">
                  <Icon name="mail" size={17} className="amx-input-icon" />
                  <input
                    id="admin-email"
                    type="text"
                    placeholder="admin@masjidmycommunity.org"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((er) => ({ ...er, email: null }));
                      setFormError("");
                    }}
                    autoComplete="username"
                  />
                </div>
                {errors.email && (
                  <div className="amx-field-error">
                    <Icon name="info" size={14} />
                    {errors.email}
                  </div>
                )}
              </div>

              <div className={`amx-field${errors.password ? " has-error" : ""}`}>
                <label htmlFor="admin-password">Password</label>
                <div className="amx-input-wrap">
                  <Icon name="lock" size={17} className="amx-input-icon" />
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((er) => ({ ...er, password: null }));
                      setFormError("");
                    }}
                    autoComplete="current-password"
                    style={{ paddingRight: "42px" }}
                  />
                  <button
                    type="button"
                    className="amx-pw-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
                  </button>
                </div>
                {errors.password && (
                  <div className="amx-field-error">
                    <Icon name="info" size={14} />
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="amx-login-row">
                <label className="amx-checkbox">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span className="amx-checkbox-box">
                    <Icon name="check" size={12} strokeWidth={3} />
                  </span>
                  Remember me
                </label>
              </div>

              <button type="submit" className="amx-login-submit" disabled={loading}>
                {loading ? (
                  <>
                    <Icon name="clock" size={17} className="amx-spinner" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <Icon name="arrowRight" size={17} />
                  </>
                )}
              </button>
            </form>

            <div className="amx-login-secure">
              <Icon name="shield" size={14} />
              Secured admin access · Masjid My Community
            </div>
            <div className="amx-login-demo">
              Demo credentials — <strong>{DEMO_EMAIL}</strong> / <strong>{DEMO_PASSWORD}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
