import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GeometricPattern from "../components/GeometricPattern.jsx";
import userApi from "../services/userApi.js";
import { setUserSession } from "../utils/userAuthStorage.js";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

function EyeIcon({ off }) {
  return off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a19.4 19.4 0 015.06-5.94M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 8 11 8a19.5 19.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function Spinner() {
  return <span className="auth-spinner" aria-hidden="true" />;
}

function useCountdown(active, resetKey) {
  const [remaining, setRemaining] = useState(RESEND_SECONDS);
  useEffect(() => {
    if (!active) return;
    setRemaining(RESEND_SECONDS);
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [active, resetKey]);
  return remaining;
}

function OtpInputs({ value, onChange, disabled, autoFocus }) {
  const refs = useRef([]);
  const digits = value.split("").concat(Array(OTP_LENGTH).fill("")).slice(0, OTP_LENGTH);

  const setDigit = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join(""));
  };

  const handleChange = (i, e) => {
    const v = e.target.value.replace(/[^0-9]/g, "").slice(-1);
    setDigit(i, v);
    if (v && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };
  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    if (text) {
      e.preventDefault();
      onChange(text);
      refs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
    }
  };

  return (
    <div className="auth-otp-row" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`auth-otp-digit${d ? " filled" : ""}`}
        />
      ))}
    </div>
  );
}

function getArtCopy(mode, intent) {
  if (intent === "campaign" && (mode === "login" || mode === "register")) {
    return {
      eyebrow: "Start a Campaign",
      title: "One step before you begin.",
      sub: "Sign in or create your account — it only takes a minute — and you'll be ready to launch your campaign.",
    };
  }
  switch (mode) {
    case "register":
      return { eyebrow: "Create Account", title: "Join the movement.", sub: "Register a masjid, launch a campaign, or support one that matters to you." };
    case "otp":
      return { eyebrow: "Verify", title: "Almost there.", sub: "Verify your account to unlock the full Masjid My Community experience." };
    case "forgot":
      return { eyebrow: "Account Recovery", title: "Forgot your password?", sub: "No problem — we'll send you a code to reset it." };
    case "reset":
      return { eyebrow: "Account Recovery", title: "Set a new password.", sub: "Choose a strong password to keep your account secure." };
    default:
      return { eyebrow: "Welcome Back", title: "Sign in to your account.", sub: "Manage your campaigns, track donations, and stay connected with your community." };
  }
}

function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent = params.get("intent");

  const [mode, setMode] = useState("login");

  // login
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // register
  const [reg, setReg] = useState({ fullName: "", contact: "", password: "" });
  const [regErrors, setRegErrors] = useState({});
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  // otp (shared between register-verify and reset-password flows)
  const [otpCtx, setOtpCtx] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpErrorCode, setOtpErrorCode] = useState("");
  const [resendKey, setResendKey] = useState(0);
  const [resending, setResending] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const timer = useCountdown(mode === "otp", resendKey);

  // forgot
  const [forgotId, setForgotId] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  // reset
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetDone, setResetDone] = useState(false);

  const [verifySuccess, setVerifySuccess] = useState(false);

  const goToAccount = () => navigate(intent ? `/account?intent=${intent}` : "/account");

  const startOtpFlow = (data, purpose) => {
    setOtpCtx({ userId: data.userId, otpTarget: data.otpTarget, maskedTarget: data.maskedTarget, purpose });
    setOtpValue("");
    setOtpError("");
    setOtpErrorCode("");
    setDemoOtp(data.demoOtp || "");
    setResendKey((k) => k + 1);
    setMode("otp");
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginId.trim() || !loginPassword) {
      setLoginError("Please enter your credentials.");
      return;
    }
    setLoginLoading(true);
    try {
      const { data } = await userApi.post("/login", { identifier: loginId.trim(), password: loginPassword, remember });
      setUserSession({ token: data.token, user: data.user, remember });
      goToAccount();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === "UNVERIFIED") {
        startOtpFlow({ userId: resp.userId, otpTarget: resp.otpTarget, maskedTarget: resp.maskedTarget }, "register");
      } else {
        setLoginError(resp?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const updateReg = (field) => (e) => {
    setReg((r) => ({ ...r, [field]: e.target.value }));
    setRegErrors((er) => ({ ...er, [field]: null }));
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setRegError("");
    const errs = {};
    const contact = reg.contact.trim();
    const isEmail = contact.includes("@");
    const mobileDigits = contact.replace(/[\s-]/g, "");

    if (!reg.fullName.trim()) errs.fullName = "Full name is required.";
    if (!contact) {
      errs.contact = "Provide an email address or a mobile number.";
    } else if (isEmail && !/^\S+@\S+\.\S+$/.test(contact)) {
      errs.contact = "Enter a valid email address.";
    } else if (!isEmail && !/^[0-9]{10}$/.test(mobileDigits)) {
      errs.contact = "Enter a valid 10-digit mobile number.";
    }
    if (reg.password.length < 8 || !/[A-Za-z]/.test(reg.password) || !/[0-9]/.test(reg.password)) {
      errs.password = "At least 8 characters with a letter and a number.";
    }
    setRegErrors(errs);
    if (Object.keys(errs).length) return;

    setRegLoading(true);
    try {
      const { data } = await userApi.post("/register", {
        fullName: reg.fullName.trim(),
        email: isEmail ? contact : undefined,
        mobile: !isEmail ? mobileDigits : undefined,
        password: reg.password,
      });
      startOtpFlow(data, "register");
    } catch (err) {
      setRegError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setRegLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpErrorCode("");
    if (otpValue.length !== OTP_LENGTH) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpLoading(true);
    try {
      const { data } = await userApi.post("/verify-otp", { userId: otpCtx.userId, otp: otpValue });
      if (otpCtx.purpose === "register") {
        setUserSession({ token: data.token, user: data.user, remember: true });
        setVerifySuccess(true);
        setTimeout(goToAccount, 1700);
      } else {
        setMode("reset");
      }
    } catch (err) {
      const resp = err.response?.data;
      setOtpError(resp?.message || "Invalid code. Please try again.");
      setOtpErrorCode(resp?.code || "");
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (timer > 0 || resending) return;
    setOtpError("");
    setOtpErrorCode("");
    setResending(true);
    try {
      const { data } = await userApi.post("/resend-otp", { userId: otpCtx.userId });
      setDemoOtp(data.demoOtp || "");
      setOtpValue("");
      setResendKey((k) => k + 1);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Couldn't resend the code.");
    } finally {
      setResending(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    setForgotError("");
    if (!forgotId.trim()) {
      setForgotError("Enter your email address or mobile number.");
      return;
    }
    setForgotLoading(true);
    try {
      const { data } = await userApi.post("/forgot-password", { identifier: forgotId.trim() });
      if (!data.userId) {
        setForgotError("We couldn't find an account with those details.");
        return;
      }
      startOtpFlow(data, "reset_password");
    } catch (err) {
      setForgotError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setResetError("");
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setResetError("At least 8 characters with a letter and a number.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetLoading(true);
    try {
      await userApi.post("/reset-password", {
        userId: otpCtx.userId,
        otp: otpValue,
        newPassword,
        confirmPassword: confirmNewPassword,
      });
      setResetDone(true);
      setTimeout(() => {
        setMode("login");
        setResetDone(false);
        setNewPassword("");
        setConfirmNewPassword("");
        setLoginError("");
      }, 1800);
    } catch (err) {
      setResetError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const art = getArtCopy(mode, intent);

  return (
    <div className="auth-page">
      <div className="auth-shell wrap">
        <div className="auth-art">
          <GeometricPattern />
          <div className="auth-art-copy">
            <span className="eyebrow">{art.eyebrow}</span>
            <h1>{art.title}</h1>
            <p>{art.sub}</p>
          </div>
          <ul className="auth-why">
            <li>
              <CheckIcon /> Launch and manage fundraising campaigns
            </li>
            <li>
              <CheckIcon /> Track donations and progress in real time
            </li>
            <li>
              <CheckIcon /> Join a trusted, verified global community
            </li>
          </ul>
        </div>

        <div className="auth-panel">
          <div className="auth-panel-inner">
            {mode === "login" && (
              <div className="auth-form-wrap">
                <div className="auth-tabs">
                  <button className="active" type="button">
                    Login
                  </button>
                  <button type="button" onClick={() => setMode("register")}>
                    Create Account
                  </button>
                </div>

                <form onSubmit={submitLogin} noValidate>
                  {loginError && (
                    <div className="auth-alert">
                      <InfoIcon /> {loginError}
                    </div>
                  )}
                  <div className="auth-field">
                    <label htmlFor="login-id">Email or Mobile Number</label>
                    <input
                      id="login-id"
                      type="text"
                      value={loginId}
                      onChange={(e) => {
                        setLoginId(e.target.value);
                        setLoginError("");
                      }}
                      placeholder="you@example.com or 10-digit mobile number"
                      autoComplete="username"
                    />
                  </div>
                  <div className="auth-field">
                    <label htmlFor="login-password">Password</label>
                    <div className="auth-input-wrap">
                      <input
                        id="login-password"
                        type={showLoginPw ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginError("");
                        }}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                      />
                      <button type="button" className="auth-pw-toggle" onClick={() => setShowLoginPw((s) => !s)} aria-label={showLoginPw ? "Hide password" : "Show password"}>
                        <EyeIcon off={showLoginPw} />
                      </button>
                    </div>
                  </div>
                  <div className="auth-row-between">
                    <label className="auth-checkbox">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                      <span className="auth-checkbox-box">
                        <CheckIcon />
                      </span>
                      Remember me
                    </label>
                    <button type="button" className="auth-link" onClick={() => setMode("forgot")}>
                      Forgot password?
                    </button>
                  </div>
                  <button type="submit" className="btn btn-gold auth-submit" disabled={loginLoading}>
                    {loginLoading ? (
                      <>
                        <Spinner /> Signing in…
                      </>
                    ) : (
                      <>
                        Sign In <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>
                <p className="auth-switch">
                  New to Masjid My Community?{" "}
                  <button type="button" className="auth-link" onClick={() => setMode("register")}>
                    Create an account
                  </button>
                </p>
              </div>
            )}

            {mode === "register" && (
              <div className="auth-form-wrap">
                <div className="auth-tabs">
                  <button type="button" onClick={() => setMode("login")}>
                    Login
                  </button>
                  <button className="active" type="button">
                    Create Account
                  </button>
                </div>

                <form onSubmit={submitRegister} noValidate>
                  {regError && (
                    <div className="auth-alert">
                      <InfoIcon /> {regError}
                    </div>
                  )}
                  <div className="auth-field">
                    <label htmlFor="reg-name">Full Name</label>
                    <input id="reg-name" type="text" value={reg.fullName} onChange={updateReg("fullName")} placeholder="Your full name" autoComplete="name" />
                    {regErrors.fullName && <span className="auth-field-error">{regErrors.fullName}</span>}
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg-contact">Email Address or Mobile Number</label>
                    <input
                      id="reg-contact"
                      type="text"
                      value={reg.contact}
                      onChange={updateReg("contact")}
                      placeholder="you@example.com or 10-digit mobile number"
                      autoComplete="email"
                    />
                    {regErrors.contact && <span className="auth-field-error">{regErrors.contact}</span>}
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg-password">Password</label>
                    <div className="auth-input-wrap">
                      <input
                        id="reg-password"
                        type={showRegPw ? "text" : "password"}
                        value={reg.password}
                        onChange={updateReg("password")}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                      />
                      <button type="button" className="auth-pw-toggle" onClick={() => setShowRegPw((s) => !s)} aria-label={showRegPw ? "Hide password" : "Show password"}>
                        <EyeIcon off={showRegPw} />
                      </button>
                    </div>
                    {regErrors.password && <span className="auth-field-error">{regErrors.password}</span>}
                  </div>
                  <button type="submit" className="btn btn-gold auth-submit" disabled={regLoading}>
                    {regLoading ? (
                      <>
                        <Spinner /> Creating account…
                      </>
                    ) : (
                      <>
                        Create Account <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>
                <p className="auth-switch">
                  Already have an account?{" "}
                  <button type="button" className="auth-link" onClick={() => setMode("login")}>
                    Sign in
                  </button>
                </p>
              </div>
            )}

            {mode === "otp" && !verifySuccess && (
              <div className="auth-form-wrap">
                <h2 className="auth-step-title">Enter verification code</h2>
                <p className="auth-step-sub">
                  We've sent a 6-digit code to <strong>{otpCtx?.maskedTarget}</strong>
                  {otpCtx?.otpTarget === "email" ? " via email." : " via SMS."}
                </p>

                {demoOtp && (
                  <div className="auth-demo-otp">
                    <InfoIcon /> Demo mode — no live gateway connected yet. Your code is <strong>{demoOtp}</strong>.
                  </div>
                )}

                <form onSubmit={submitOtp} noValidate>
                  <OtpInputs value={otpValue} onChange={setOtpValue} disabled={otpLoading} autoFocus />
                  {otpError && (
                    <div className={`auth-alert${otpErrorCode === "EXPIRED" ? " warn" : ""}`}>
                      <InfoIcon /> {otpError}
                    </div>
                  )}
                  <button type="submit" className="btn btn-gold auth-submit" disabled={otpLoading}>
                    {otpLoading ? (
                      <>
                        <Spinner /> Verifying…
                      </>
                    ) : (
                      <>
                        Verify <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="auth-resend">
                  {timer > 0 ? (
                    <span>
                      Resend code in <strong className="mono">{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</strong>
                    </span>
                  ) : (
                    <button type="button" className="auth-link" onClick={resendOtp} disabled={resending}>
                      {resending ? "Sending…" : "Resend code"}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="auth-link auth-back"
                  onClick={() => setMode(otpCtx?.purpose === "reset_password" ? "forgot" : "register")}
                >
                  ← Back
                </button>
              </div>
            )}

            {mode === "otp" && verifySuccess && (
              <div className="auth-success">
                <span className="auth-success-icon">
                  <CheckIcon />
                </span>
                <h2>Account verified!</h2>
                <p>Welcome to Masjid My Community. Taking you to your account…</p>
              </div>
            )}

            {mode === "forgot" && (
              <div className="auth-form-wrap">
                <h2 className="auth-step-title">Reset your password</h2>
                <p className="auth-step-sub">Enter your email address or mobile number and we'll send you a code.</p>
                <form onSubmit={submitForgot} noValidate>
                  {forgotError && (
                    <div className="auth-alert">
                      <InfoIcon /> {forgotError}
                    </div>
                  )}
                  <div className="auth-field">
                    <label htmlFor="forgot-id">Email or Mobile Number</label>
                    <input
                      id="forgot-id"
                      type="text"
                      value={forgotId}
                      onChange={(e) => {
                        setForgotId(e.target.value);
                        setForgotError("");
                      }}
                      placeholder="you@example.com or 10-digit mobile number"
                    />
                  </div>
                  <button type="submit" className="btn btn-gold auth-submit" disabled={forgotLoading}>
                    {forgotLoading ? (
                      <>
                        <Spinner /> Sending…
                      </>
                    ) : (
                      <>
                        Send Code <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>
                <button type="button" className="auth-link auth-back" onClick={() => setMode("login")}>
                  ← Back to sign in
                </button>
              </div>
            )}

            {mode === "reset" && !resetDone && (
              <div className="auth-form-wrap">
                <h2 className="auth-step-title">Set a new password</h2>
                <p className="auth-step-sub">Choose a strong password to keep your account secure.</p>
                <form onSubmit={submitReset} noValidate>
                  {resetError && (
                    <div className="auth-alert">
                      <InfoIcon /> {resetError}
                    </div>
                  )}
                  <div className="auth-field">
                    <label htmlFor="reset-password">New Password</label>
                    <div className="auth-input-wrap">
                      <input
                        id="reset-password"
                        type={showResetPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                      />
                      <button type="button" className="auth-pw-toggle" onClick={() => setShowResetPw((s) => !s)} aria-label={showResetPw ? "Hide password" : "Show password"}>
                        <EyeIcon off={showResetPw} />
                      </button>
                    </div>
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reset-confirm">Confirm New Password</label>
                    <input
                      id="reset-confirm"
                      type={showResetPw ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                  </div>
                  <button type="submit" className="btn btn-gold auth-submit" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Spinner /> Saving…
                      </>
                    ) : (
                      <>
                        Reset Password <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {mode === "reset" && resetDone && (
              <div className="auth-success">
                <span className="auth-success-icon">
                  <CheckIcon />
                </span>
                <h2>Password updated!</h2>
                <p>You can now sign in with your new password.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
