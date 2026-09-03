import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GeometricPattern from "../components/GeometricPattern.jsx";
import userApi from "../services/userApi.js";
import { setUserSession } from "../utils/userAuthStorage.js";
import { useTranslation } from "../i18n/LanguageContext.jsx";

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

function useCountdown(active, resetKey, seconds) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (!active) return;
    setRemaining(seconds);
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [active, resetKey, seconds]);
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

function getArtCopy(mode, intent, t, otpPurpose) {
  if (intent === "campaign" && (mode === "login" || mode === "register")) {
    return {
      eyebrow: t("auth.art.campaign.eyebrow", "Start a Campaign"),
      title: t("auth.art.campaign.title", "One step before you begin."),
      sub: t("auth.art.campaign.sub", "Sign in or create your account — it only takes a minute — and you'll be ready to launch your campaign."),
    };
  }
  switch (mode) {
    case "register":
      return {
        eyebrow: t("auth.art.register.eyebrow", "Create Account"),
        title: t("auth.art.register.title", "Join the movement."),
        sub: t("auth.art.register.sub", "Register a masjid, launch a campaign, or support one that matters to you."),
      };
    case "login-otp":
      return {
        eyebrow: t("auth.art.loginOtp.eyebrow", "Sign In"),
        title: t("auth.art.loginOtp.title", "Sign in without a password."),
        sub: t("auth.art.loginOtp.sub", "We'll send a one-time code to your email or mobile number."),
      };
    case "otp":
      if (otpPurpose === "login") {
        return {
          eyebrow: t("auth.art.loginOtp.eyebrow", "Sign In"),
          title: t("auth.otp.loginArt.title", "Almost signed in."),
          sub: t("auth.otp.loginArt.sub", "Enter the code we sent you to finish signing in."),
        };
      }
      return {
        eyebrow: t("auth.art.verify.eyebrow", "Verify"),
        title: t("auth.art.verify.title", "Almost there."),
        sub: t("auth.art.verify.sub", "Verify your account to unlock the full Masjid My Community experience."),
      };
    case "forgot":
      return {
        eyebrow: t("auth.art.forgot.eyebrow", "Account Recovery"),
        title: t("auth.art.forgot.title", "Forgot your password?"),
        sub: t("auth.art.forgot.sub", "No problem — we'll send you a code to reset it."),
      };
    case "reset":
      return {
        eyebrow: t("auth.art.reset.eyebrow", "Account Recovery"),
        title: t("auth.art.reset.title", "Set a new password."),
        sub: t("auth.art.reset.sub", "Choose a strong password to keep your account secure."),
      };
    default:
      return {
        eyebrow: t("auth.art.welcomeBack.eyebrow", "Welcome Back"),
        title: t("auth.art.welcomeBack.title", "Sign in to your account."),
        sub: t("auth.art.welcomeBack.sub", "Manage your campaigns, track donations, and stay connected with your community."),
      };
  }
}

function Auth({ defaultIntent } = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent = params.get("intent") || defaultIntent || null;

  const [mode, setMode] = useState("login");

  // login
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState({});

  // register
  const [reg, setReg] = useState({ fullName: "", contact: "", password: "" });
  const [regErrors, setRegErrors] = useState({});
  const [showRegPw, setShowRegPw] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  // login via otp
  const [loginOtpId, setLoginOtpId] = useState("");
  const [loginOtpLoading, setLoginOtpLoading] = useState(false);
  const [loginOtpError, setLoginOtpError] = useState("");

  // otp (shared between register-verify, reset-password, and login-otp flows)
  const [otpCtx, setOtpCtx] = useState(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpErrorCode, setOtpErrorCode] = useState("");
  const [resendKey, setResendKey] = useState(0);
  const [resending, setResending] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const [otpEmailSent, setOtpEmailSent] = useState(false);
  const [otpSettings, setOtpSettings] = useState({ expiryMinutes: 5, resendCooldownSeconds: RESEND_SECONDS });
  const timer = useCountdown(mode === "otp", resendKey, otpSettings.resendCooldownSeconds);

  useEffect(() => {
    userApi
      .get("/otp-settings")
      .then(({ data }) => {
        setOtpSettings({
          expiryMinutes: data.expiryMinutes ?? 5,
          resendCooldownSeconds: data.resendCooldownSeconds ?? RESEND_SECONDS,
        });
      })
      .catch(() => {});
  }, []);

  // forgot
  const [forgotId, setForgotId] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  // reset
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErrors, setResetErrors] = useState({});
  const [resetDone, setResetDone] = useState(false);

  const [verifySuccess, setVerifySuccess] = useState(false);

  const goToAccount = () => navigate("/my-community");

  const startOtpFlow = (data, purpose) => {
    setOtpCtx({ userId: data.userId, otpTarget: data.otpTarget, maskedTarget: data.maskedTarget, purpose });
    setOtpValue("");
    setOtpError("");
    setOtpErrorCode("");
    setDemoOtp(data.demoOtp || "");
    setOtpEmailSent(!!data.emailSent);
    setResendKey((k) => k + 1);
    setMode("otp");
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!loginId.trim()) errs.identifier = t("auth.login.errEmailOrMobile", "Enter your email address or mobile number.");
    if (!loginPassword) errs.password = t("auth.login.errPassword", "Enter your password.");
    setLoginErrors(errs);
    if (Object.keys(errs).length) return;

    setLoginLoading(true);
    try {
      const { data } = await userApi.post("/login", { identifier: loginId.trim(), password: loginPassword, remember });
      setUserSession({ token: data.token, user: data.user, remember });
      goToAccount();
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === "UNVERIFIED") {
        startOtpFlow(resp, "register");
      } else {
        setLoginErrors({ password: resp?.message || t("auth.errGeneric", "Something went wrong. Please try again.") });
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const submitLoginOtp = async (e) => {
    e.preventDefault();
    setLoginOtpError("");
    if (!loginOtpId.trim()) {
      setLoginOtpError(t("auth.loginOtp.errEmailOrMobile", "Enter your email address or mobile number."));
      return;
    }
    setLoginOtpLoading(true);
    try {
      const { data } = await userApi.post("/login/otp/send", { identifier: loginOtpId.trim() });
      if (!data.userId) {
        setLoginOtpError(t("auth.loginOtp.errNotFound", "We couldn't find an account with those details."));
        return;
      }
      startOtpFlow(data, "login");
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === "UNVERIFIED") {
        startOtpFlow(resp, "register");
      } else {
        setLoginOtpError(resp?.message || t("auth.errGeneric", "Something went wrong. Please try again."));
      }
    } finally {
      setLoginOtpLoading(false);
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

    if (!reg.fullName.trim()) errs.fullName = t("auth.register.errFullName", "Full name is required.");
    if (!contact) {
      errs.contact = t("auth.register.errContactRequired", "Provide an email address or a mobile number.");
    } else if (isEmail && !/^\S+@\S+\.\S+$/.test(contact)) {
      errs.contact = t("auth.register.errEmailInvalid", "Enter a valid email address.");
    } else if (!isEmail && !/^[0-9]{10}$/.test(mobileDigits)) {
      errs.contact = t("auth.register.errMobileInvalid", "Enter a valid 10-digit mobile number.");
    }
    if (reg.password.length < 8 || !/[A-Za-z]/.test(reg.password) || !/[0-9]/.test(reg.password)) {
      errs.password = t("auth.register.errPassword", "At least 8 characters with a letter and a number.");
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
      const message = err.response?.data?.message || t("auth.errGeneric", "Something went wrong. Please try again.");
      if (err.response?.status === 409) {
        setRegErrors((er) => ({ ...er, contact: message }));
      } else {
        setRegError(message);
      }
    } finally {
      setRegLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    setOtpError("");
    setOtpErrorCode("");
    if (otpValue.length !== OTP_LENGTH) {
      setOtpError(t("auth.otp.errIncomplete", "Enter the 6-digit code."));
      return;
    }
    setOtpLoading(true);
    try {
      const { data } = await userApi.post("/verify-otp", { userId: otpCtx.userId, otp: otpValue });
      if (otpCtx.purpose === "register" || otpCtx.purpose === "login") {
        setUserSession({ token: data.token, user: data.user, remember: true });
        setVerifySuccess(true);
        setTimeout(goToAccount, 1700);
      } else {
        setMode("reset");
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.code === "TOO_MANY_ATTEMPTS") {
        setOtpError(resp.message || t("auth.otp.errTooManyAttempts", "Too many incorrect attempts. Please request a new code."));
      } else {
        setOtpError(resp?.message || t("auth.otp.errInvalid", "Invalid code. Please try again."));
      }
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
      setOtpEmailSent(!!data.emailSent);
      setOtpValue("");
      setResendKey((k) => k + 1);
    } catch (err) {
      setOtpError(err.response?.data?.message || t("auth.otp.errResendFailed", "Couldn't resend the code."));
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
    const errs = {};
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      errs.newPassword = "At least 8 characters with a letter and a number.";
    } else if (newPassword !== confirmNewPassword) {
      errs.confirm = "Passwords do not match.";
    }
    setResetErrors(errs);
    if (Object.keys(errs).length) return;

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
        setLoginErrors({});
      }, 1800);
    } catch (err) {
      setResetErrors({ form: err.response?.data?.message || "Something went wrong. Please try again." });
    } finally {
      setResetLoading(false);
    }
  };

  const art = getArtCopy(mode, intent, t, otpCtx?.purpose);

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
              <CheckIcon /> {t("auth.why.launch", "Launch and manage fundraising campaigns")}
            </li>
            <li>
              <CheckIcon /> {t("auth.why.track", "Track donations and progress in real time")}
            </li>
            <li>
              <CheckIcon /> {t("auth.why.join", "Join a trusted, verified global community")}
            </li>
            <li>
              <CheckIcon /> {t("auth.why.secure", "Every donation is tracked with full transparency and security")}
            </li>
          </ul>
        </div>

        <div className="auth-panel">
          <div className="auth-panel-inner">
            {mode === "login" && (
              <div className="auth-form-wrap">
                <div className="auth-tabs">
                  <button className="active" type="button">
                    {t("auth.tabs.login", "Login")}
                  </button>
                  <button type="button" onClick={() => setMode("register")}>
                    {t("auth.tabs.createAccount", "Create Account")}
                  </button>
                </div>

                <form onSubmit={submitLogin} noValidate>
                  <div className="auth-field">
                    <label htmlFor="login-id">{t("auth.login.emailOrMobile", "Email or Mobile Number")}</label>
                    <input
                      id="login-id"
                      type="text"
                      value={loginId}
                      onChange={(e) => {
                        setLoginId(e.target.value);
                        setLoginErrors((er) => ({ ...er, identifier: null }));
                      }}
                      placeholder={t("auth.login.emailOrMobilePlaceholder", "you@example.com or 10-digit mobile number")}
                      autoComplete="username"
                    />
                    {loginErrors.identifier && <span className="auth-field-error">{loginErrors.identifier}</span>}
                  </div>
                  <div className="auth-field">
                    <label htmlFor="login-password">{t("auth.login.password", "Password")}</label>
                    <div className="auth-input-wrap">
                      <input
                        id="login-password"
                        type={showLoginPw ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginErrors((er) => ({ ...er, password: null }));
                        }}
                        placeholder={t("auth.login.passwordPlaceholder", "Enter your password")}
                        autoComplete="current-password"
                      />
                      <button type="button" className="auth-pw-toggle" onClick={() => setShowLoginPw((s) => !s)} aria-label={showLoginPw ? "Hide password" : "Show password"}>
                        <EyeIcon off={showLoginPw} />
                      </button>
                    </div>
                    {loginErrors.password && <span className="auth-field-error">{loginErrors.password}</span>}
                  </div>
                  <div className="auth-row-between">
                    <label className="auth-checkbox">
                      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                      <span className="auth-checkbox-box">
                        <CheckIcon />
                      </span>
                      {t("auth.login.rememberMe", "Remember me")}
                    </label>
                    <button type="button" className="auth-link" onClick={() => setMode("forgot")}>
                      {t("auth.login.forgotPassword", "Forgot password?")}
                    </button>
                  </div>
                  <button type="submit" className="btn btn-gold auth-submit" disabled={loginLoading}>
                    {loginLoading ? (
                      <>
                        <Spinner /> {t("auth.login.signingIn", "Signing in…")}
                      </>
                    ) : (
                      <>
                        {t("auth.login.signIn", "Sign In")} <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>
                <button
                  type="button"
                  className="auth-link auth-otp-toggle"
                  onClick={() => {
                    setLoginOtpId(loginId);
                    setLoginOtpError("");
                    setMode("login-otp");
                  }}
                >
                  {t("auth.login.useOtp", "Login via OTP instead")}
                </button>

                <p className="auth-switch">
                  {t("auth.login.newHere", "New to Masjid My Community?")}{" "}
                  <button type="button" className="auth-link" onClick={() => setMode("register")}>
                    {t("auth.login.createAccount", "Create an account")}
                  </button>
                </p>
              </div>
            )}

            {mode === "login-otp" && (
              <div className="auth-form-wrap">
                <h2 className="auth-step-title">{t("auth.loginOtp.title", "Sign in with a one-time code")}</h2>
                <p className="auth-step-sub">
                  {t("auth.loginOtp.sub", "Enter your email address or mobile number and we'll send you a code to sign in.")}
                </p>
                <form onSubmit={submitLoginOtp} noValidate>
                  <div className="auth-field">
                    <label htmlFor="login-otp-id">{t("auth.login.emailOrMobile", "Email or Mobile Number")}</label>
                    <input
                      id="login-otp-id"
                      type="text"
                      value={loginOtpId}
                      onChange={(e) => {
                        setLoginOtpId(e.target.value);
                        setLoginOtpError("");
                      }}
                      placeholder={t("auth.login.emailOrMobilePlaceholder", "you@example.com or 10-digit mobile number")}
                      autoComplete="username"
                    />
                    {loginOtpError && <span className="auth-field-error">{loginOtpError}</span>}
                  </div>
                  <button type="submit" className="btn btn-gold auth-submit" disabled={loginOtpLoading}>
                    {loginOtpLoading ? (
                      <>
                        <Spinner /> {t("auth.loginOtp.sending", "Sending code…")}
                      </>
                    ) : (
                      <>
                        {t("auth.loginOtp.sendCode", "Send Code")} <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>
                <button type="button" className="auth-link auth-back" onClick={() => setMode("login")}>
                  {t("auth.loginOtp.back", "← Back to password sign in")}
                </button>
              </div>
            )}

            {mode === "register" && (
              <div className="auth-form-wrap">
                <div className="auth-tabs">
                  <button type="button" onClick={() => setMode("login")}>
                    {t("auth.tabs.login", "Login")}
                  </button>
                  <button className="active" type="button">
                    {t("auth.tabs.createAccount", "Create Account")}
                  </button>
                </div>

                <form onSubmit={submitRegister} noValidate>
                  {regError && (
                    <div className="auth-alert">
                      <InfoIcon /> {regError}
                    </div>
                  )}
                  <div className="auth-field">
                    <label htmlFor="reg-name">{t("auth.register.fullName", "Full Name")}</label>
                    <input id="reg-name" type="text" value={reg.fullName} onChange={updateReg("fullName")} placeholder={t("auth.register.fullNamePlaceholder", "Your full name")} autoComplete="name" />
                    {regErrors.fullName && <span className="auth-field-error">{regErrors.fullName}</span>}
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg-contact">{t("auth.register.contact", "Email Address or Mobile Number")}</label>
                    <input
                      id="reg-contact"
                      type="text"
                      value={reg.contact}
                      onChange={updateReg("contact")}
                      placeholder={t("auth.register.contactPlaceholder", "you@example.com or 10-digit mobile number")}
                      autoComplete="email"
                    />
                    {regErrors.contact && <span className="auth-field-error">{regErrors.contact}</span>}
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg-password">{t("auth.register.password", "Password")}</label>
                    <div className="auth-input-wrap">
                      <input
                        id="reg-password"
                        type={showRegPw ? "text" : "password"}
                        value={reg.password}
                        onChange={updateReg("password")}
                        placeholder={t("auth.register.passwordPlaceholder", "At least 8 characters")}
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
                        <Spinner /> {t("auth.register.creatingAccount", "Creating account…")}
                      </>
                    ) : (
                      <>
                        {t("auth.register.createAccount", "Create Account")} <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>
                <p className="auth-switch">
                  {t("auth.register.alreadyHaveAccount", "Already have an account?")}{" "}
                  <button type="button" className="auth-link" onClick={() => setMode("login")}>
                    {t("auth.register.signIn", "Sign in")}
                  </button>
                </p>
              </div>
            )}

            {mode === "otp" && !verifySuccess && (
              <div className="auth-form-wrap">
                <h2 className="auth-step-title">{t("auth.otp.title", "Enter verification code")}</h2>
                <p className="auth-step-sub">
                  {t("auth.otp.sentTo", "We've sent a {length}-digit code to").replace("{length}", OTP_LENGTH)} <strong>{otpCtx?.maskedTarget}</strong>
                  {otpCtx?.otpTarget === "email" ? ` ${t("auth.otp.viaEmail", "via email.")}` : ` ${t("auth.otp.viaSms", "via SMS.")}`}
                  {" "}
                  {t("auth.otp.expiresIn", "It expires in {minutes} minutes.").replace("{minutes}", otpSettings.expiryMinutes)}
                </p>

                {demoOtp && (
                  <div className="auth-demo-otp">
                    <InfoIcon />{" "}
                    {otpEmailSent
                      ? t("auth.otp.shownMode", "For your convenience, your code is also shown here:")
                      : t("auth.otp.demoMode", "Demo mode — no live gateway connected yet. Your code is")}{" "}
                    <strong>{demoOtp}</strong>.
                  </div>
                )}

                <form onSubmit={submitOtp} noValidate>
                  <OtpInputs value={otpValue} onChange={setOtpValue} disabled={otpLoading} autoFocus />
                  {otpError && (
                    <div className={`auth-alert${otpErrorCode === "EXPIRED" || otpErrorCode === "TOO_MANY_ATTEMPTS" ? " warn" : ""}`}>
                      <InfoIcon /> {otpError}
                    </div>
                  )}
                  <button type="submit" className="btn btn-gold auth-submit" disabled={otpLoading}>
                    {otpLoading ? (
                      <>
                        <Spinner /> {t("auth.otp.verifying", "Verifying…")}
                      </>
                    ) : (
                      <>
                        {t("auth.otp.verify", "Verify")} <span className="btn-arrow">→</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="auth-resend">
                  {timer > 0 ? (
                    <span>
                      {t("auth.otp.resendIn", "Resend code in")}{" "}
                      <strong className="mono">{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</strong>
                    </span>
                  ) : (
                    <button type="button" className="auth-link" onClick={resendOtp} disabled={resending}>
                      {resending ? t("auth.otp.sending", "Sending…") : t("auth.otp.resendCode", "Resend code")}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="auth-link auth-back"
                  onClick={() =>
                    setMode(otpCtx?.purpose === "reset_password" ? "forgot" : otpCtx?.purpose === "login" ? "login-otp" : "register")
                  }
                >
                  {t("auth.otp.back", "← Back")}
                </button>
              </div>
            )}

            {mode === "otp" && verifySuccess && (
              <div className="auth-success">
                <span className="auth-success-icon">
                  <CheckIcon />
                </span>
                {otpCtx?.purpose === "login" ? (
                  <>
                    <h2>{t("auth.otp.successLoginTitle", "Signed in!")}</h2>
                    <p>{t("auth.otp.successLoginSub", "Welcome back. Taking you to your account…")}</p>
                  </>
                ) : (
                  <>
                    <h2>{t("auth.otp.successRegisterTitle", "Account verified!")}</h2>
                    <p>{t("auth.otp.successRegisterSub", "Welcome to Masjid My Community. Taking you to your account…")}</p>
                  </>
                )}
              </div>
            )}

            {mode === "forgot" && (
              <div className="auth-form-wrap">
                <h2 className="auth-step-title">Reset your password</h2>
                <p className="auth-step-sub">Enter your email address or mobile number and we'll send you a code.</p>
                <form onSubmit={submitForgot} noValidate>
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
                    {forgotError && <span className="auth-field-error">{forgotError}</span>}
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
                  {resetErrors.form && (
                    <div className="auth-alert">
                      <InfoIcon /> {resetErrors.form}
                    </div>
                  )}
                  <div className="auth-field">
                    <label htmlFor="reset-password">New Password</label>
                    <div className="auth-input-wrap">
                      <input
                        id="reset-password"
                        type={showResetPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setResetErrors((er) => ({ ...er, newPassword: null }));
                        }}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                      />
                      <button type="button" className="auth-pw-toggle" onClick={() => setShowResetPw((s) => !s)} aria-label={showResetPw ? "Hide password" : "Show password"}>
                        <EyeIcon off={showResetPw} />
                      </button>
                    </div>
                    {resetErrors.newPassword && <span className="auth-field-error">{resetErrors.newPassword}</span>}
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reset-confirm">Confirm New Password</label>
                    <input
                      id="reset-confirm"
                      type={showResetPw ? "text" : "password"}
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        setResetErrors((er) => ({ ...er, confirm: null }));
                      }}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                    />
                    {resetErrors.confirm && <span className="auth-field-error">{resetErrors.confirm}</span>}
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
