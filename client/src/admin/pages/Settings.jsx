import React, { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Link, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import Toggle from "../components/Toggle.jsx";
import adminApi from "../services/adminApi.js";
import { updateStoredUser } from "../authStorage.js";
import MicButton from "../../components/MicButton.jsx";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const SECTIONS = [
  { key: "profile", label: "Profile", icon: "users" },
  { key: "security", label: "Security", icon: "lock" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "platform", label: "Platform", icon: "settings" },
  { key: "reportPost", label: "Report Post", icon: "flag" },
  { key: "content", label: "Community / Content", icon: "content" },
  { key: "reviews", label: "Reviews", icon: "star" },
  { key: "authentication", label: "Authentication", icon: "lock" },
  { key: "maps", label: "Google Maps", icon: "globe" },
  { key: "visitorBot", label: "Visitor Bot", icon: "activity" },
  { key: "userBot", label: "User Bot", icon: "users" },
  { key: "masjidBot", label: "Masjid Bot", icon: "mosque" },
];

const BOT_DEVICE_KEYS = ["desktop", "mobile", "tablet"];
const BOT_BROWSER_KEYS = ["Chrome", "Safari", "Firefox", "Edge"];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

function initialsOf(name) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

function Settings() {
  const { sectionKey } = useParams();
  const section = sectionKey;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState(null);

  const [profile, setProfile] = useState({ name: "", email: "", phone: "", bio: "", role: "", avatarUrl: null });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef(null);

  const [security, setSecurity] = useState({ twoFactorEnabled: true, loginAlerts: true });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [notifs, setNotifs] = useState(null);
  const [platform, setPlatform] = useState(null);

  const [reportThreshold, setReportThreshold] = useState(10);
  const [reportThresholdInput, setReportThresholdInput] = useState("10");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [thresholdError, setThresholdError] = useState("");

  const [contentLimits, setContentLimits] = useState({ maxPostLength: 2000, maxCommentLength: 1000, maxReplyLength: 1000 });
  const [contentLimitsInput, setContentLimitsInput] = useState({ maxPostLength: "2000", maxCommentLength: "1000", maxReplyLength: "1000" });
  const [savingContentLimits, setSavingContentLimits] = useState(false);
  const [contentLimitsError, setContentLimitsError] = useState("");

  const [mapSettings, setMapSettings] = useState({ googleMapsApiKey: "", addressCountry: "" });
  const [mapSettingsInput, setMapSettingsInput] = useState({ googleMapsApiKey: "", addressCountry: "" });
  const [savingMapSettings, setSavingMapSettings] = useState(false);
  const [mapSettingsError, setMapSettingsError] = useState("");

  const REVIEW_DEFAULTS = { maxLength: 1000, maxImages: 5, maxVideoSizeMB: 50, maxVideoDurationSeconds: 60, allowedImageFormats: "jpg,png,webp", allowedVideoFormats: "mp4,webm,mov", mediaEnabled: true, speechToTextEnabled: true };
  const [reviewSettings, setReviewSettings] = useState(REVIEW_DEFAULTS);
  const [reviewSettingsInput, setReviewSettingsInput] = useState({
    maxLength: "1000", maxImages: "5", maxVideoSizeMB: "50", maxVideoDurationSeconds: "60",
    allowedImageFormats: "jpg,png,webp", allowedVideoFormats: "mp4,webm,mov",
  });
  const [savingReviewSettings, setSavingReviewSettings] = useState(false);
  const [reviewSettingsError, setReviewSettingsError] = useState("");
  const [togglingReviewFlag, setTogglingReviewFlag] = useState("");

  const [authSettings, setAuthSettings] = useState({ otpExpiryMinutes: 5, otpResendCooldownSeconds: 60, otpMaxAttempts: 5 });
  const [authSettingsInput, setAuthSettingsInput] = useState({ otpExpiryMinutes: "5", otpResendCooldownSeconds: "60", otpMaxAttempts: "5" });
  const [savingAuthSettings, setSavingAuthSettings] = useState(false);
  const [authSettingsError, setAuthSettingsError] = useState("");

  const [botSettings, setBotSettings] = useState(null);
  const [botInput, setBotInput] = useState(null);
  const [savingBot, setSavingBot] = useState(false);
  const [botError, setBotError] = useState("");
  const [testRunResult, setTestRunResult] = useState(null);
  const [testRunning, setTestRunning] = useState(false);
  const [resettingBotData, setResettingBotData] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const [userBotSettings, setUserBotSettings] = useState(null);
  const [userBotInput, setUserBotInput] = useState(null);
  const [savingUserBot, setSavingUserBot] = useState(false);
  const [userBotError, setUserBotError] = useState("");
  const [userTestRunResult, setUserTestRunResult] = useState(null);
  const [userTestRunning, setUserTestRunning] = useState(false);
  const [resettingUserBotData, setResettingUserBotData] = useState(false);
  const [userResetResult, setUserResetResult] = useState(null);

  const [masjidBotSettings, setMasjidBotSettings] = useState(null);
  const [masjidBotInput, setMasjidBotInput] = useState(null);
  const [savingMasjidBot, setSavingMasjidBot] = useState(false);
  const [masjidBotError, setMasjidBotError] = useState("");

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    adminApi
      .get("/auth/me")
      .then(({ data }) => {
        const u = data.user;
        setProfile({ name: u.name || "", email: u.email || "", phone: u.phone || "", bio: u.bio || "", role: u.role || "", avatarUrl: u.avatarUrl || null });
        setSecurity({ twoFactorEnabled: !!u.twoFactorEnabled, loginAlerts: !!u.loginAlerts });
        setNotifs(u.preferences?.notifications || {});
        setPlatform(u.preferences?.platform || {});
        updateStoredUser(u);
      })
      .catch((err) => {
        setLoadError(err.response?.data?.message || "Couldn't load your settings. Please refresh the page.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    adminApi
      .get("/moderation/settings")
      .then(({ data }) => {
        setReportThreshold(data.reportThreshold);
        setReportThresholdInput(String(data.reportThreshold));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    adminApi
      .get("/content-settings")
      .then(({ data }) => {
        setContentLimits(data);
        setContentLimitsInput({
          maxPostLength: String(data.maxPostLength),
          maxCommentLength: String(data.maxCommentLength),
          maxReplyLength: String(data.maxReplyLength),
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    adminApi
      .get("/map-settings")
      .then(({ data }) => {
        setMapSettings(data);
        setMapSettingsInput(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    adminApi
      .get("/review-settings")
      .then(({ data }) => {
        setReviewSettings(data);
        setReviewSettingsInput({
          maxLength: String(data.maxLength),
          maxImages: String(data.maxImages),
          maxVideoSizeMB: String(data.maxVideoSizeMB),
          maxVideoDurationSeconds: String(data.maxVideoDurationSeconds),
          allowedImageFormats: data.allowedImageFormats,
          allowedVideoFormats: data.allowedVideoFormats,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    adminApi
      .get("/auth-settings")
      .then(({ data }) => {
        setAuthSettings(data);
        setAuthSettingsInput({
          otpExpiryMinutes: String(data.otpExpiryMinutes),
          otpResendCooldownSeconds: String(data.otpResendCooldownSeconds),
          otpMaxAttempts: String(data.otpMaxAttempts),
        });
      })
      .catch(() => {});
  }, []);

  const botInputFrom = (data) => ({
    ...data,
    visitorsPerHour: String(data.visitorsPerHour),
    sessionDurationMinSeconds: String(data.sessionDurationMinSeconds),
    sessionDurationMaxSeconds: String(data.sessionDurationMaxSeconds),
    pagesPerSessionMin: String(data.pagesPerSessionMin),
    pagesPerSessionMax: String(data.pagesPerSessionMax),
    allowedPathsText: Array.isArray(data.allowedPaths) ? data.allowedPaths.join("\n") : "",
  });

  const userBotInputFrom = (data) => ({
    ...data,
    usersPerHour: String(data.usersPerHour),
    maxBotUsersPerDay: data.maxBotUsersPerDay == null ? "" : String(data.maxBotUsersPerDay),
    maxTotalBotUsers: data.maxTotalBotUsers == null ? "" : String(data.maxTotalBotUsers),
  });

  useEffect(() => {
    adminApi
      .get("/user-bot/settings")
      .then(({ data }) => {
        setUserBotSettings(data);
        setUserBotInput(userBotInputFrom(data));
      })
      .catch(() => setUserBotError("Couldn't load the user bot's settings."));
  }, []);

  const masjidBotInputFrom = (data) => ({
    ...data,
    masjidsPerHour: String(data.masjidsPerHour),
    maxMasjidsPerDay: data.maxMasjidsPerDay == null ? "" : String(data.maxMasjidsPerDay),
    maxTotalImportedMasjids: data.maxTotalImportedMasjids == null ? "" : String(data.maxTotalImportedMasjids),
    maxApiCallsPerHour: String(data.maxApiCallsPerHour),
  });

  useEffect(() => {
    adminApi
      .get("/masjid-bot/settings")
      .then(({ data }) => {
        setMasjidBotSettings(data);
        setMasjidBotInput(masjidBotInputFrom(data));
      })
      .catch(() => setMasjidBotError("Couldn't load the Masjid bot's settings."));
  }, []);

  useEffect(() => {
    adminApi
      .get("/visitors/bot/settings")
      .then(({ data }) => {
        setBotSettings(data);
        setBotInput(botInputFrom(data));
      })
      .catch(() => setBotError("Couldn't load the visitor bot's settings."));
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!profile.name.trim()) nextErrors.name = "Full name is required.";
    if (!/^\S+@\S+\.\S+$/.test(profile.email)) nextErrors.email = "Enter a valid email address.";
    setProfileErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSavingProfile(true);
    try {
      const { data } = await adminApi.put("/auth/profile", profile);
      setProfile((p) => ({ ...p, name: data.user.name, email: data.user.email, phone: data.user.phone || "", bio: data.user.bio || "" }));
      updateStoredUser(data.user);
      showToast("Profile updated.");
    } catch (err) {
      setProfileErrors({ form: err.response?.data?.message || "Couldn't save your profile. Please try again." });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarError("");
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError("Please choose a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Image is too large. Please choose a file under 2MB.");
      return;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    setAvatarUploading(true);
    try {
      const { data } = await adminApi.put("/auth/avatar", { avatarUrl: dataUrl });
      setProfile((p) => ({ ...p, avatarUrl: data.user.avatarUrl }));
      updateStoredUser(data.user);
      showToast("Profile photo updated.");
    } catch (err) {
      setAvatarError(err.response?.data?.message || "Couldn't upload that photo. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarUploading(true);
    setAvatarError("");
    try {
      const { data } = await adminApi.put("/auth/avatar", { avatarUrl: null });
      setProfile((p) => ({ ...p, avatarUrl: null }));
      updateStoredUser(data.user);
      showToast("Profile photo removed.");
    } catch (err) {
      setAvatarError(err.response?.data?.message || "Couldn't remove your photo. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    if (!passwords.current || !passwords.next) {
      setPasswordError("Enter your current password and a new password.");
      return;
    }
    if (passwords.next.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }

    setSavingPassword(true);
    try {
      await adminApi.put("/auth/password", { currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: "", next: "", confirm: "" });
      showToast("Password updated.");
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Couldn't update your password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleSecurity = async (key) => {
    const nextVal = !security[key];
    setSecurity((s) => ({ ...s, [key]: nextVal }));
    try {
      const { data } = await adminApi.put("/auth/preferences", { [key]: nextVal });
      updateStoredUser(data.user);
      showToast("Preference saved.");
    } catch {
      setSecurity((s) => ({ ...s, [key]: !nextVal }));
      showToast("Couldn't save that change. Please try again.");
    }
  };

  const toggleNotif = async (key) => {
    const nextVal = !notifs[key];
    setNotifs((n) => ({ ...n, [key]: nextVal }));
    try {
      const { data } = await adminApi.put("/auth/preferences", { notifications: { [key]: nextVal } });
      updateStoredUser(data.user);
      showToast("Notification preference saved.");
    } catch {
      setNotifs((n) => ({ ...n, [key]: !nextVal }));
      showToast("Couldn't save that change. Please try again.");
    }
  };

  const saveThreshold = async (e) => {
    e.preventDefault();
    const n = Number(reportThresholdInput);
    if (!Number.isInteger(n) || n < 1) {
      setThresholdError("Threshold must be a whole number of at least 1.");
      return;
    }
    setThresholdError("");
    setSavingThreshold(true);
    try {
      const { data } = await adminApi.patch("/moderation/settings", { reportThreshold: n });
      setReportThreshold(data.reportThreshold);
      setReportThresholdInput(String(data.reportThreshold));
      showToast("Automatic moderation threshold saved.");
    } catch (err) {
      setThresholdError(err.response?.data?.message || "Couldn't save the threshold. Please try again.");
    } finally {
      setSavingThreshold(false);
    }
  };

  const saveContentLimits = async (e) => {
    e.preventDefault();
    const parsed = {};
    for (const field of ["maxPostLength", "maxCommentLength", "maxReplyLength"]) {
      const n = Number(contentLimitsInput[field]);
      if (!Number.isInteger(n) || n < 1) {
        setContentLimitsError("Each limit must be a whole number of at least 1 character.");
        return;
      }
      parsed[field] = n;
    }
    setContentLimitsError("");
    setSavingContentLimits(true);
    try {
      const { data } = await adminApi.patch("/content-settings", parsed);
      setContentLimits(data);
      setContentLimitsInput({
        maxPostLength: String(data.maxPostLength),
        maxCommentLength: String(data.maxCommentLength),
        maxReplyLength: String(data.maxReplyLength),
      });
      showToast("Character limits saved.");
    } catch (err) {
      setContentLimitsError(err.response?.data?.message || "Couldn't save these limits. Please try again.");
    } finally {
      setSavingContentLimits(false);
    }
  };

  const saveMapSettings = async (e) => {
    e.preventDefault();
    const country = mapSettingsInput.addressCountry.trim();
    if (country && !/^[a-zA-Z]{2}$/.test(country)) {
      setMapSettingsError("Country must be a 2-letter code, e.g. \"in\".");
      return;
    }
    setMapSettingsError("");
    setSavingMapSettings(true);
    try {
      const { data } = await adminApi.patch("/map-settings", {
        googleMapsApiKey: mapSettingsInput.googleMapsApiKey.trim(),
        addressCountry: country,
      });
      setMapSettings(data);
      setMapSettingsInput(data);
      showToast("Google Maps settings saved.");
    } catch (err) {
      setMapSettingsError(err.response?.data?.message || "Couldn't save these settings. Please try again.");
    } finally {
      setSavingMapSettings(false);
    }
  };

  const saveReviewSettings = async (e) => {
    e.preventDefault();
    const parsed = {};
    for (const field of ["maxLength", "maxImages", "maxVideoSizeMB", "maxVideoDurationSeconds"]) {
      const n = Number(reviewSettingsInput[field]);
      if (!Number.isInteger(n) || n < 1) {
        setReviewSettingsError("Each limit must be a whole number of at least 1.");
        return;
      }
      parsed[field] = n;
    }
    for (const field of ["allowedImageFormats", "allowedVideoFormats"]) {
      if (!reviewSettingsInput[field]?.trim()) {
        setReviewSettingsError("Allowed formats can't be empty.");
        return;
      }
      parsed[field] = reviewSettingsInput[field].trim();
    }
    setReviewSettingsError("");
    setSavingReviewSettings(true);
    try {
      const { data } = await adminApi.patch("/review-settings", parsed);
      setReviewSettings(data);
      setReviewSettingsInput({
        maxLength: String(data.maxLength),
        maxImages: String(data.maxImages),
        maxVideoSizeMB: String(data.maxVideoSizeMB),
        maxVideoDurationSeconds: String(data.maxVideoDurationSeconds),
        allowedImageFormats: data.allowedImageFormats,
        allowedVideoFormats: data.allowedVideoFormats,
      });
      showToast("Review settings saved.");
    } catch (err) {
      setReviewSettingsError(err.response?.data?.message || "Couldn't save these settings. Please try again.");
    } finally {
      setSavingReviewSettings(false);
    }
  };

  const toggleReviewFlag = async (field) => {
    setTogglingReviewFlag(field);
    try {
      const { data } = await adminApi.patch("/review-settings", { [field]: !reviewSettings[field] });
      setReviewSettings(data);
    } catch {
      showToast("Couldn't update that setting. Please try again.");
    } finally {
      setTogglingReviewFlag("");
    }
  };

  const saveAuthSettings = async (e) => {
    e.preventDefault();
    const parsed = {};
    for (const field of ["otpExpiryMinutes", "otpResendCooldownSeconds", "otpMaxAttempts"]) {
      const n = Number(authSettingsInput[field]);
      if (!Number.isInteger(n) || n < 1) {
        setAuthSettingsError("Each value must be a whole number of at least 1.");
        return;
      }
      parsed[field] = n;
    }
    setAuthSettingsError("");
    setSavingAuthSettings(true);
    try {
      const { data } = await adminApi.patch("/auth-settings", parsed);
      setAuthSettings(data);
      setAuthSettingsInput({
        otpExpiryMinutes: String(data.otpExpiryMinutes),
        otpResendCooldownSeconds: String(data.otpResendCooldownSeconds),
        otpMaxAttempts: String(data.otpMaxAttempts),
      });
      showToast("Authentication settings saved.");
    } catch (err) {
      setAuthSettingsError(err.response?.data?.message || "Couldn't save these settings. Please try again.");
    } finally {
      setSavingAuthSettings(false);
    }
  };

  const changePlatform = async (key, value) => {
    const prev = platform[key];
    setPlatform((p) => ({ ...p, [key]: value }));
    try {
      const { data } = await adminApi.put("/auth/preferences", { platform: { [key]: value } });
      updateStoredUser(data.user);
      showToast("Platform preference saved.");
    } catch {
      setPlatform((p) => ({ ...p, [key]: prev }));
      showToast("Couldn't save that change. Please try again.");
    }
  };

  const saveBotSettings = async (patch) => {
    setSavingBot(true);
    setBotError("");
    try {
      const { data } = await adminApi.patch("/visitors/bot/settings", patch);
      setBotSettings(data);
      setBotInput(botInputFrom(data));
      showToast("Visitor bot settings saved.");
    } catch (err) {
      setBotError(err.response?.data?.message || "Couldn't save the visitor bot's settings.");
    } finally {
      setSavingBot(false);
    }
  };

  const toggleBotEnabled = () => saveBotSettings({ enabled: !botSettings.enabled });
  const toggleCombinedViewDefault = () => saveBotSettings({ combinedViewDefault: !botSettings.combinedViewDefault });

  const submitBotForm = (e) => {
    e.preventDefault();
    const intFields = ["visitorsPerHour", "sessionDurationMinSeconds", "sessionDurationMaxSeconds", "pagesPerSessionMin", "pagesPerSessionMax"];
    const parsed = {};
    for (const field of intFields) {
      const n = Number(botInput[field]);
      if (!Number.isInteger(n) || n < 1) {
        setBotError("Every number field must be a whole number of at least 1.");
        return;
      }
      parsed[field] = n;
    }
    if (parsed.sessionDurationMinSeconds > parsed.sessionDurationMaxSeconds) {
      setBotError("Minimum session duration can't exceed the maximum.");
      return;
    }
    if (parsed.pagesPerSessionMin > parsed.pagesPerSessionMax) {
      setBotError("Minimum pages per session can't exceed the maximum.");
      return;
    }
    parsed.indiaPercent = Math.min(100, Math.max(0, Number(botInput.indiaPercent) || 0));
    parsed.activeHourStart = botInput.activeHourStart === "" || botInput.activeHourStart == null ? null : Number(botInput.activeHourStart);
    parsed.activeHourEnd = botInput.activeHourEnd === "" || botInput.activeHourEnd == null ? null : Number(botInput.activeHourEnd);
    parsed.deviceWeights = botInput.deviceWeights;
    parsed.browserWeights = botInput.browserWeights;
    const paths = botInput.allowedPathsText.split("\n").map((p) => p.trim()).filter(Boolean);
    parsed.allowedPaths = paths.length ? paths : null;
    saveBotSettings(parsed);
  };

  const runBotTestRun = async () => {
    setTestRunning(true);
    setTestRunResult(null);
    setBotError("");
    try {
      const { data } = await adminApi.post("/visitors/bot/test-run");
      setTestRunResult(data);
    } catch (err) {
      setBotError(err.response?.data?.message || "Couldn't generate a test visit — check the configuration above.");
    } finally {
      setTestRunning(false);
    }
  };

  const clearSyntheticData = async () => {
    if (!window.confirm("Permanently delete every synthetic visitor and session? Genuine visitor data is never touched.")) return;
    setResettingBotData(true);
    setResetResult(null);
    try {
      const { data } = await adminApi.delete("/visitors/bot/data");
      setResetResult(data);
      showToast("Synthetic visitor data cleared.");
    } catch {
      showToast("Couldn't clear synthetic data. Please try again.");
    } finally {
      setResettingBotData(false);
    }
  };

  const saveUserBotSettings = async (patch) => {
    setSavingUserBot(true);
    setUserBotError("");
    try {
      const { data } = await adminApi.patch("/user-bot/settings", patch);
      setUserBotSettings(data);
      setUserBotInput(userBotInputFrom(data));
      showToast("User bot settings saved.");
    } catch (err) {
      setUserBotError(err.response?.data?.message || "Couldn't save the user bot's settings.");
    } finally {
      setSavingUserBot(false);
    }
  };

  const toggleUserBotEnabled = () => saveUserBotSettings({ enabled: !userBotSettings.enabled });

  const submitUserBotForm = (e) => {
    e.preventDefault();
    const n = Number(userBotInput.usersPerHour);
    if (!Number.isInteger(n) || n < 1) {
      setUserBotError("Users per hour must be a whole number of at least 1.");
      return;
    }
    const parsed = { usersPerHour: n };
    parsed.indiaPercent = Math.min(100, Math.max(0, Number(userBotInput.indiaPercent) || 0));
    parsed.muslimPersonaPercent = Math.min(100, Math.max(0, Number(userBotInput.muslimPersonaPercent) || 0));
    parsed.activeHourStart = userBotInput.activeHourStart === "" || userBotInput.activeHourStart == null ? null : Number(userBotInput.activeHourStart);
    parsed.activeHourEnd = userBotInput.activeHourEnd === "" || userBotInput.activeHourEnd == null ? null : Number(userBotInput.activeHourEnd);
    parsed.maxBotUsersPerDay = userBotInput.maxBotUsersPerDay === "" ? null : Number(userBotInput.maxBotUsersPerDay);
    parsed.maxTotalBotUsers = userBotInput.maxTotalBotUsers === "" ? null : Number(userBotInput.maxTotalBotUsers);
    saveUserBotSettings(parsed);
  };

  const runUserBotTestRun = async () => {
    setUserTestRunning(true);
    setUserTestRunResult(null);
    setUserBotError("");
    try {
      const { data } = await adminApi.post("/user-bot/test-run");
      setUserTestRunResult(data);
    } catch (err) {
      setUserBotError(err.response?.data?.message || "Couldn't generate a test user — check the configuration above.");
    } finally {
      setUserTestRunning(false);
    }
  };

  const clearUserBotData = async () => {
    if (!window.confirm("Permanently delete every bot user account and profile? Real user accounts are never touched.")) return;
    setResettingUserBotData(true);
    setUserResetResult(null);
    try {
      const { data } = await adminApi.delete("/user-bot/data");
      setUserResetResult(data);
      showToast("Bot user data cleared.");
    } catch {
      showToast("Couldn't clear bot user data. Please try again.");
    } finally {
      setResettingUserBotData(false);
    }
  };

  const saveMasjidBotSettings = async (patch) => {
    setSavingMasjidBot(true);
    setMasjidBotError("");
    try {
      const { data } = await adminApi.patch("/masjid-bot/settings", patch);
      setMasjidBotSettings(data);
      setMasjidBotInput(masjidBotInputFrom(data));
      showToast("Masjid bot settings saved.");
    } catch (err) {
      setMasjidBotError(err.response?.data?.message || "Couldn't save the Masjid bot's settings.");
    } finally {
      setSavingMasjidBot(false);
    }
  };

  const toggleMasjidBotEnabled = () => saveMasjidBotSettings({ enabled: !masjidBotSettings.enabled });
  const toggleMasjidBotAutoPublish = () => saveMasjidBotSettings({ autoPublish: !masjidBotSettings.autoPublish });

  const submitMasjidBotForm = (e) => {
    e.preventDefault();
    const intFields = ["masjidsPerHour", "maxApiCallsPerHour"];
    const parsed = {};
    for (const field of intFields) {
      const n = Number(masjidBotInput[field]);
      if (!Number.isInteger(n) || n < 1) {
        setMasjidBotError("Every number field must be a whole number of at least 1.");
        return;
      }
      parsed[field] = n;
    }
    parsed.indiaPercent = Math.min(100, Math.max(0, Number(masjidBotInput.indiaPercent) || 0));
    parsed.activeHourStart = masjidBotInput.activeHourStart === "" || masjidBotInput.activeHourStart == null ? null : Number(masjidBotInput.activeHourStart);
    parsed.activeHourEnd = masjidBotInput.activeHourEnd === "" || masjidBotInput.activeHourEnd == null ? null : Number(masjidBotInput.activeHourEnd);
    parsed.maxMasjidsPerDay = masjidBotInput.maxMasjidsPerDay === "" ? null : Number(masjidBotInput.maxMasjidsPerDay);
    parsed.maxTotalImportedMasjids = masjidBotInput.maxTotalImportedMasjids === "" ? null : Number(masjidBotInput.maxTotalImportedMasjids);
    saveMasjidBotSettings(parsed);
  };

  if (!SECTIONS.some((s) => s.key === sectionKey)) {
    return <Navigate to={`/admin/settings/${SECTIONS[0].key}`} replace />;
  }

  if (loading) {
    return (
      <>
        <div className="amx-page-head">
          <div>
            <span className="amx-crumb">Administration</span>
            <h1>Settings</h1>
          </div>
        </div>
        <div className="amx-card amx-panel">
          <div className="amx-empty">
            <Icon name="settings" />
            <strong>Loading your settings…</strong>
          </div>
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <div className="amx-page-head">
          <div>
            <span className="amx-crumb">Administration</span>
            <h1>Settings</h1>
          </div>
        </div>
        <div className="amx-card amx-panel">
          <div className="amx-empty">
            <Icon name="info" />
            <strong>{loadError}</strong>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Administration</span>
          <h1>Settings</h1>
          <p>Manage your account, security, and platform preferences</p>
        </div>
      </div>

      <div className="amx-settings-layout">
        <nav className="amx-settings-nav">
          {SECTIONS.map((s) => (
            <NavLink key={s.key} to={`/admin/settings/${s.key}`} className={({ isActive }) => (isActive ? "active" : "")}>
              <Icon name={s.icon} />
              {s.label}
            </NavLink>
          ))}
        </nav>

        <div className="amx-card amx-panel">
          {section === "profile" && (
            <form onSubmit={saveProfile}>
              <div className="amx-panel-head">
                <div>
                  <h3>Profile Information</h3>
                  <div className="amx-panel-sub">Update your personal admin account details</div>
                </div>
              </div>

              {profileErrors.form && (
                <div className="amx-form-error" style={{ marginBottom: 18 }}>
                  <Icon name="info" size={17} />
                  {profileErrors.form}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <span className="amx-avatar" style={{ width: 64, height: 64, fontSize: 20 }}>
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : initialsOf(profile.name)}
                </span>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button type="button" className="amx-btn amx-btn-outline amx-btn-sm" onClick={handleAvatarPick} disabled={avatarUploading}>
                      {avatarUploading ? "Uploading…" : "Change Photo"}
                    </button>
                    {profile.avatarUrl && (
                      <button type="button" className="amx-btn amx-btn-ghost amx-btn-sm" onClick={removeAvatar} disabled={avatarUploading}>
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={handleAvatarFile}
                  />
                  {avatarError ? (
                    <div className="amx-form-hint" style={{ color: "var(--a-danger)" }}>{avatarError}</div>
                  ) : (
                    <div className="amx-form-hint">JPG, PNG, WEBP, or GIF — up to 2MB</div>
                  )}
                </div>
              </div>
              <div className="amx-form-grid">
                <div className="amx-form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  />
                  {profileErrors.name && <div className="amx-form-hint" style={{ color: "var(--a-danger)" }}>{profileErrors.name}</div>}
                </div>
                <div className="amx-form-group">
                  <label>Email Address</label>
                  <input
                    type="text"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  />
                  {profileErrors.email && <div className="amx-form-hint" style={{ color: "var(--a-danger)" }}>{profileErrors.email}</div>}
                </div>
                <div className="amx-form-group">
                  <label>Role</label>
                  <input type="text" value={profile.role} disabled />
                </div>
                <div className="amx-form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="amx-form-group">
                <label>Bio</label>
                <div className="amx-textarea-mic-wrap">
                  <textarea rows={3} value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
                  <MicButton onTranscript={(t) => setProfile((p) => ({ ...p, bio: t }))} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 26, paddingTop: 20, borderTop: "1px solid var(--a-border)" }}>
                <button type="submit" className="amx-btn amx-btn-primary" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {section === "security" && (
            <form onSubmit={savePassword}>
              <div className="amx-panel-head">
                <div>
                  <h3>Password &amp; Security</h3>
                  <div className="amx-panel-sub">Manage your login credentials and account protection</div>
                </div>
              </div>

              {passwordError && (
                <div className="amx-form-error" style={{ marginBottom: 18 }}>
                  <Icon name="info" size={17} />
                  {passwordError}
                </div>
              )}

              <div className="amx-form-grid">
                <div className="amx-form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••"
                    value={passwords.current}
                    onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  />
                </div>
                <div></div>
                <div className="amx-form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••"
                    value={passwords.next}
                    onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
                  />
                </div>
                <div className="amx-form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
                <button type="submit" className="amx-btn amx-btn-primary" disabled={savingPassword}>
                  {savingPassword ? "Updating…" : "Update Password"}
                </button>
              </div>

              <div className="amx-settings-row" style={{ marginTop: 14 }}>
                <div>
                  <strong>Two-Factor Authentication</strong>
                  <span>Add an extra layer of security to your admin account.</span>
                </div>
                <Toggle on={security.twoFactorEnabled} onClick={() => toggleSecurity("twoFactorEnabled")} />
              </div>
              <div className="amx-settings-row">
                <div>
                  <strong>Login Alerts</strong>
                  <span>Get notified by email when a new device signs in.</span>
                </div>
                <Toggle on={security.loginAlerts} onClick={() => toggleSecurity("loginAlerts")} />
              </div>
            </form>
          )}

          {section === "notifications" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Notification Preferences</h3>
                  <div className="amx-panel-sub">Choose what you'd like to be notified about — changes save instantly</div>
                </div>
              </div>
              <div className="amx-settings-row">
                <div>
                  <strong>New Donations</strong>
                  <span>Get notified whenever a new donation is received.</span>
                </div>
                <Toggle on={!!notifs.newDonations} onClick={() => toggleNotif("newDonations")} />
              </div>
              <div className="amx-settings-row">
                <div>
                  <strong>Verification Requests</strong>
                  <span>Alerts when a masjid submits documents for review.</span>
                </div>
                <Toggle on={!!notifs.verificationRequests} onClick={() => toggleNotif("verificationRequests")} />
              </div>
              <div className="amx-settings-row">
                <div>
                  <strong>Campaign Milestones</strong>
                  <span>Notify when a campaign hits 50%, 75%, or 100% of its goal.</span>
                </div>
                <Toggle on={!!notifs.campaignMilestones} onClick={() => toggleNotif("campaignMilestones")} />
              </div>
              <div className="amx-settings-row">
                <div>
                  <strong>Weekly Digest</strong>
                  <span>A weekly summary of platform activity, sent every Monday.</span>
                </div>
                <Toggle on={!!notifs.weeklyDigest} onClick={() => toggleNotif("weeklyDigest")} />
              </div>
              <div className="amx-settings-row">
                <div>
                  <strong>Product Updates</strong>
                  <span>News about new admin panel features and improvements.</span>
                </div>
                <Toggle on={!!notifs.productUpdates} onClick={() => toggleNotif("productUpdates")} />
              </div>
            </>
          )}

          {section === "platform" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Platform Preferences</h3>
                  <div className="amx-panel-sub">Default settings applied across the admin panel — changes save instantly</div>
                </div>
              </div>
              <div className="amx-form-grid">
                <div className="amx-form-group">
                  <label>Default Currency</label>
                  <select value={platform.currency || "INR"} onChange={(e) => changePlatform("currency", e.target.value)}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div className="amx-form-group">
                  <label>Timezone</label>
                  <select value={platform.timezone || "ist"} onChange={(e) => changePlatform("timezone", e.target.value)}>
                    <option value="ist">India Standard Time (UTC+5:30)</option>
                    <option value="gmt">Greenwich Mean Time (UTC+0)</option>
                    <option value="est">Eastern Time (UTC-5)</option>
                  </select>
                </div>
                <div className="amx-form-group">
                  <label>Date Format</label>
                  <select value={platform.dateFormat || "mdy"} onChange={(e) => changePlatform("dateFormat", e.target.value)}>
                    <option value="mdy">MMM DD, YYYY</option>
                    <option value="dmy">DD MMM YYYY</option>
                  </select>
                </div>
                <div className="amx-form-group">
                  <label>Default Verification SLA</label>
                  <select value={platform.verificationSla || "5"} onChange={(e) => changePlatform("verificationSla", e.target.value)}>
                    <option value="3">3 business days</option>
                    <option value="5">5 business days</option>
                    <option value="7">7 business days</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {section === "reportPost" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Report Post Settings</h3>
                  <div className="amx-panel-sub">Configure when reported content is automatically hidden pending your review</div>
                </div>
              </div>
              <form onSubmit={saveThreshold} className="amx-form-grid" noValidate>
                <div className="amx-form-group">
                  <label htmlFor="report-threshold">Automatic Moderation Threshold</label>
                  <input
                    id="report-threshold"
                    type="number"
                    min={1}
                    step={1}
                    value={reportThresholdInput}
                    onChange={(e) => setReportThresholdInput(e.target.value)}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    When a masjid, campaign, or Wall post receives this many reports, it is automatically hidden from the public Wall and flagged for admin review under{" "}
                    <strong>Reported Content</strong>. It is never permanently deleted — only temporarily hidden pending your decision. Current value: <strong>{reportThreshold}</strong> reports.
                  </div>
                  {thresholdError && (
                    <div className="amx-field-error">
                      <Icon name="info" size={14} />
                      {thresholdError}
                    </div>
                  )}
                </div>
                <button type="submit" className="amx-btn amx-btn-primary" disabled={savingThreshold} style={{ alignSelf: "end" }}>
                  {savingThreshold ? "Saving…" : "Save Threshold"}
                </button>
              </form>
            </>
          )}

          {section === "content" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Community / Content Settings</h3>
                  <div className="amx-panel-sub">Configure the maximum character length allowed for Wall posts, comments, and replies</div>
                </div>
              </div>
              <form onSubmit={saveContentLimits} className="amx-form-grid" noValidate>
                <div className="amx-form-group">
                  <label htmlFor="max-post-length">Maximum Post Length</label>
                  <input
                    id="max-post-length"
                    type="number"
                    min={1}
                    step={1}
                    value={contentLimitsInput.maxPostLength}
                    onChange={(e) => setContentLimitsInput((s) => ({ ...s, maxPostLength: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    Applies to Community Wall post text. Current: <strong>{contentLimits.maxPostLength}</strong> characters.
                  </div>
                </div>
                <div className="amx-form-group">
                  <label htmlFor="max-comment-length">Maximum Comment Length</label>
                  <input
                    id="max-comment-length"
                    type="number"
                    min={1}
                    step={1}
                    value={contentLimitsInput.maxCommentLength}
                    onChange={(e) => setContentLimitsInput((s) => ({ ...s, maxCommentLength: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    Applies to top-level comments. Current: <strong>{contentLimits.maxCommentLength}</strong> characters.
                  </div>
                </div>
                <div className="amx-form-group">
                  <label htmlFor="max-reply-length">Maximum Reply Length</label>
                  <input
                    id="max-reply-length"
                    type="number"
                    min={1}
                    step={1}
                    value={contentLimitsInput.maxReplyLength}
                    onChange={(e) => setContentLimitsInput((s) => ({ ...s, maxReplyLength: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    Applies to replies at every nesting level. Current: <strong>{contentLimits.maxReplyLength}</strong> characters.
                  </div>
                </div>
                {contentLimitsError && (
                  <div className="amx-field-error">
                    <Icon name="info" size={14} />
                    {contentLimitsError}
                  </div>
                )}
                <button type="submit" className="amx-btn amx-btn-primary" disabled={savingContentLimits} style={{ alignSelf: "end" }}>
                  {savingContentLimits ? "Saving…" : "Save Limits"}
                </button>
              </form>
            </>
          )}

          {section === "reviews" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Review Settings</h3>
                  <div className="amx-panel-sub">Configure the text limit, media rules, and speech-to-text availability for masjid reviews</div>
                </div>
              </div>
              <form onSubmit={saveReviewSettings} className="amx-form-grid" noValidate>
                <div className="amx-form-group">
                  <label htmlFor="review-max-length">Review Character Limit</label>
                  <input
                    id="review-max-length"
                    type="number"
                    min={1}
                    step={1}
                    value={reviewSettingsInput.maxLength}
                    onChange={(e) => setReviewSettingsInput((s) => ({ ...s, maxLength: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    Shown to users as a live counter. Current: <strong>{reviewSettings.maxLength}</strong> characters.
                  </div>
                </div>
                <div className="amx-form-group">
                  <label htmlFor="review-max-images">Maximum Images per Review</label>
                  <input
                    id="review-max-images"
                    type="number"
                    min={1}
                    step={1}
                    value={reviewSettingsInput.maxImages}
                    onChange={(e) => setReviewSettingsInput((s) => ({ ...s, maxImages: e.target.value }))}
                  />
                </div>
                <div className="amx-form-group">
                  <label htmlFor="review-max-video-size">Maximum Video Size (MB)</label>
                  <input
                    id="review-max-video-size"
                    type="number"
                    min={1}
                    step={1}
                    value={reviewSettingsInput.maxVideoSizeMB}
                    onChange={(e) => setReviewSettingsInput((s) => ({ ...s, maxVideoSizeMB: e.target.value }))}
                  />
                </div>
                <div className="amx-form-group">
                  <label htmlFor="review-max-video-duration">Maximum Video Duration (seconds)</label>
                  <input
                    id="review-max-video-duration"
                    type="number"
                    min={1}
                    step={1}
                    value={reviewSettingsInput.maxVideoDurationSeconds}
                    onChange={(e) => setReviewSettingsInput((s) => ({ ...s, maxVideoDurationSeconds: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    Checked in the visitor's browser before upload — this app doesn't run server-side video processing.
                  </div>
                </div>
                <div className="amx-form-group">
                  <label htmlFor="review-image-formats">Allowed Image Formats</label>
                  <input
                    id="review-image-formats"
                    type="text"
                    placeholder="jpg,png,webp"
                    value={reviewSettingsInput.allowedImageFormats}
                    onChange={(e) => setReviewSettingsInput((s) => ({ ...s, allowedImageFormats: e.target.value }))}
                  />
                </div>
                <div className="amx-form-group">
                  <label htmlFor="review-video-formats">Allowed Video Formats</label>
                  <input
                    id="review-video-formats"
                    type="text"
                    placeholder="mp4,webm,mov"
                    value={reviewSettingsInput.allowedVideoFormats}
                    onChange={(e) => setReviewSettingsInput((s) => ({ ...s, allowedVideoFormats: e.target.value }))}
                  />
                </div>
                {reviewSettingsError && (
                  <div className="amx-field-error">
                    <Icon name="info" size={14} />
                    {reviewSettingsError}
                  </div>
                )}
                <button type="submit" className="amx-btn amx-btn-primary" disabled={savingReviewSettings} style={{ alignSelf: "end" }}>
                  {savingReviewSettings ? "Saving…" : "Save Review Settings"}
                </button>
              </form>

              <div className="amx-settings-row" style={{ marginTop: 14 }}>
                <div>
                  <strong>Review Media</strong>
                  <span>Allow reviewers to attach images and video to their reviews.</span>
                </div>
                <Toggle on={reviewSettings.mediaEnabled} onClick={() => toggleReviewFlag("mediaEnabled")} disabled={togglingReviewFlag === "mediaEnabled"} />
              </div>
              <div className="amx-settings-row">
                <div>
                  <strong>Speech-to-Text</strong>
                  <span>Show the microphone button so reviewers can dictate their review.</span>
                </div>
                <Toggle on={reviewSettings.speechToTextEnabled} onClick={() => toggleReviewFlag("speechToTextEnabled")} disabled={togglingReviewFlag === "speechToTextEnabled"} />
              </div>
            </>
          )}

          {section === "authentication" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Authentication Settings</h3>
                  <div className="amx-panel-sub">Configure how one-time codes behave for Login via OTP, registration, password reset, and updating contact details</div>
                </div>
              </div>
              <form onSubmit={saveAuthSettings} className="amx-form-grid" noValidate>
                <div className="amx-form-group">
                  <label htmlFor="otp-expiry">OTP Expiry (minutes)</label>
                  <input
                    id="otp-expiry"
                    type="number"
                    min={1}
                    step={1}
                    value={authSettingsInput.otpExpiryMinutes}
                    onChange={(e) => setAuthSettingsInput((s) => ({ ...s, otpExpiryMinutes: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    How long a code stays valid after it's sent. Current: <strong>{authSettings.otpExpiryMinutes}</strong> minutes.
                  </div>
                </div>
                <div className="amx-form-group">
                  <label htmlFor="otp-resend-cooldown">Resend Cooldown (seconds)</label>
                  <input
                    id="otp-resend-cooldown"
                    type="number"
                    min={1}
                    step={1}
                    value={authSettingsInput.otpResendCooldownSeconds}
                    onChange={(e) => setAuthSettingsInput((s) => ({ ...s, otpResendCooldownSeconds: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    How long a user must wait before requesting another code. Current: <strong>{authSettings.otpResendCooldownSeconds}</strong> seconds.
                  </div>
                </div>
                <div className="amx-form-group">
                  <label htmlFor="otp-max-attempts">Max Incorrect Attempts</label>
                  <input
                    id="otp-max-attempts"
                    type="number"
                    min={1}
                    step={1}
                    value={authSettingsInput.otpMaxAttempts}
                    onChange={(e) => setAuthSettingsInput((s) => ({ ...s, otpMaxAttempts: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    How many wrong codes are allowed before a user must request a new one. Current: <strong>{authSettings.otpMaxAttempts}</strong>.
                  </div>
                </div>
                {authSettingsError && (
                  <div className="amx-field-error">
                    <Icon name="info" size={14} />
                    {authSettingsError}
                  </div>
                )}
                <button type="submit" className="amx-btn amx-btn-primary" disabled={savingAuthSettings} style={{ alignSelf: "end" }}>
                  {savingAuthSettings ? "Saving…" : "Save Settings"}
                </button>
              </form>
            </>
          )}

          {section === "maps" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Google Maps Settings</h3>
                  <div className="amx-panel-sub">
                    Configure the Google Maps API key and country bias used by the masjid Address autocomplete and location map — changes
                    take effect immediately for anyone loading the page, with no rebuild or redeploy needed.
                  </div>
                </div>
              </div>
              <form onSubmit={saveMapSettings} className="amx-form-grid" noValidate>
                <div className="amx-form-group">
                  <label htmlFor="maps-api-key">Google Maps API Key</label>
                  <input
                    id="maps-api-key"
                    type="text"
                    autoComplete="off"
                    placeholder="AIza..."
                    value={mapSettingsInput.googleMapsApiKey}
                    onChange={(e) => setMapSettingsInput((s) => ({ ...s, googleMapsApiKey: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    Used for address autocomplete (Places API (New)) and the location map's reverse-geocoding (Geocoding API). Leave blank
                    to fall back to the server's default configuration. This value is sent to every visitor's browser by design — a
                    Google Maps browser key is not a secret; restrict it by domain/API in Google Cloud Console instead.
                    {mapSettings.googleMapsApiKey && (
                      <> Current: <strong>{mapSettings.googleMapsApiKey.slice(0, 8)}…{mapSettings.googleMapsApiKey.slice(-4)}</strong>.</>
                    )}
                  </div>
                </div>
                <div className="amx-form-group">
                  <label htmlFor="maps-country">Address Search Country</label>
                  <input
                    id="maps-country"
                    type="text"
                    maxLength={2}
                    placeholder="in"
                    value={mapSettingsInput.addressCountry}
                    onChange={(e) => setMapSettingsInput((s) => ({ ...s, addressCountry: e.target.value }))}
                  />
                  <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                    2-letter country code to bias/restrict address search results (e.g. "in" for India). Leave blank to search worldwide.
                    Current: <strong>{mapSettings.addressCountry || "worldwide"}</strong>.
                  </div>
                </div>
                {mapSettingsError && (
                  <div className="amx-field-error">
                    <Icon name="info" size={14} />
                    {mapSettingsError}
                  </div>
                )}
                <button type="submit" className="amx-btn amx-btn-primary" disabled={savingMapSettings} style={{ alignSelf: "end" }}>
                  {savingMapSettings ? "Saving…" : "Save Settings"}
                </button>
              </form>
            </>
          )}

          {section === "visitorBot" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Visitor Bot Settings</h3>
                  <div className="amx-panel-sub">
                    Generates clearly-labeled synthetic demo traffic through the same tracking pipeline real visitors use — for
                    demoing the Visitors dashboard or load-testing it. Synthetic visits are excluded from the public counter and
                    real analytics by default and never trigger emails, notifications, or any business action.
                  </div>
                </div>
              </div>

              {!botSettings ? (
                <p className="amx-panel-sub">Loading…</p>
              ) : (
                <>
                  <div className="amx-settings-row" style={{ marginBottom: 18 }}>
                    <div>
                      <strong>Enable Visitor Bot</strong>
                      <span>Starts generating synthetic visits on the hourly schedule below. Switching this off stops new synthetic visits within a minute.</span>
                    </div>
                    <Toggle on={botSettings.enabled} onClick={toggleBotEnabled} disabled={savingBot} />
                  </div>

                  <form onSubmit={submitBotForm} className="amx-form-grid" noValidate>
                    <div className="amx-form-group">
                      <label htmlFor="bot-visitors-per-hour">Visitors per Hour</label>
                      <input
                        id="bot-visitors-per-hour"
                        type="number"
                        min={1}
                        step={1}
                        value={botInput.visitorsPerHour}
                        onChange={(e) => setBotInput((s) => ({ ...s, visitorsPerHour: e.target.value }))}
                      />
                      <div className="amx-panel-sub" style={{ marginTop: 6 }}>Spread randomly across each hour, not generated all at once.</div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="bot-india-percent">India %</label>
                      <input
                        id="bot-india-percent"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={botInput.indiaPercent}
                        onChange={(e) => setBotInput((s) => ({ ...s, indiaPercent: e.target.value }))}
                      />
                      <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                        International: <strong>{100 - (Number(botInput.indiaPercent) || 0)}%</strong>
                      </div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="bot-active-start">Active Hours (UTC)</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                          id="bot-active-start"
                          value={botInput.activeHourStart ?? ""}
                          onChange={(e) => setBotInput((s) => ({ ...s, activeHourStart: e.target.value }))}
                        >
                          <option value="">All day</option>
                          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                        </select>
                        <span>to</span>
                        <select
                          value={botInput.activeHourEnd ?? ""}
                          onChange={(e) => setBotInput((s) => ({ ...s, activeHourEnd: e.target.value }))}
                        >
                          <option value="">All day</option>
                          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="amx-form-group">
                      <label>Session Duration (seconds)</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="number"
                          min={1}
                          value={botInput.sessionDurationMinSeconds}
                          onChange={(e) => setBotInput((s) => ({ ...s, sessionDurationMinSeconds: e.target.value }))}
                        />
                        <span>to</span>
                        <input
                          type="number"
                          min={1}
                          value={botInput.sessionDurationMaxSeconds}
                          onChange={(e) => setBotInput((s) => ({ ...s, sessionDurationMaxSeconds: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="amx-form-group">
                      <label>Pages per Session</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="number"
                          min={1}
                          value={botInput.pagesPerSessionMin}
                          onChange={(e) => setBotInput((s) => ({ ...s, pagesPerSessionMin: e.target.value }))}
                        />
                        <span>to</span>
                        <input
                          type="number"
                          min={1}
                          value={botInput.pagesPerSessionMax}
                          onChange={(e) => setBotInput((s) => ({ ...s, pagesPerSessionMax: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="amx-form-group">
                      <label>Device Mix (weights)</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {BOT_DEVICE_KEYS.map((key) => (
                          <input
                            key={key}
                            type="number"
                            min={0}
                            title={key}
                            placeholder={key}
                            value={botInput.deviceWeights[key] ?? 0}
                            onChange={(e) => setBotInput((s) => ({ ...s, deviceWeights: { ...s.deviceWeights, [key]: Number(e.target.value) } }))}
                          />
                        ))}
                      </div>
                      <div className="amx-panel-sub" style={{ marginTop: 6 }}>Desktop / Mobile / Tablet, in that order — relative weights, not required to sum to 100.</div>
                    </div>
                    <div className="amx-form-group">
                      <label>Browser Mix (weights)</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {BOT_BROWSER_KEYS.map((key) => (
                          <input
                            key={key}
                            type="number"
                            min={0}
                            title={key}
                            placeholder={key}
                            value={botInput.browserWeights[key] ?? 0}
                            onChange={(e) => setBotInput((s) => ({ ...s, browserWeights: { ...s.browserWeights, [key]: Number(e.target.value) } }))}
                          />
                        ))}
                      </div>
                      <div className="amx-panel-sub" style={{ marginTop: 6 }}>Chrome / Safari / Firefox / Edge, in that order.</div>
                    </div>
                    <div className="amx-form-group" style={{ gridColumn: "1 / -1" }}>
                      <label htmlFor="bot-allowed-paths">Allowed Pages / Routes</label>
                      <textarea
                        id="bot-allowed-paths"
                        rows={4}
                        placeholder={"One path per line, e.g.\n/\n/explore-masjids\n/about"}
                        value={botInput.allowedPathsText}
                        onChange={(e) => setBotInput((s) => ({ ...s, allowedPathsText: e.target.value }))}
                      />
                      <div className="amx-panel-sub" style={{ marginTop: 6 }}>
                        Leave blank to use the default safe pool of public marketing pages, mixed with a few real masjid profile pages.
                      </div>
                    </div>

                    {botError && (
                      <div className="amx-field-error" style={{ gridColumn: "1 / -1" }}>
                        <Icon name="info" size={14} />
                        {botError}
                      </div>
                    )}
                    <button type="submit" className="amx-btn amx-btn-primary" disabled={savingBot} style={{ alignSelf: "end" }}>
                      {savingBot ? "Saving…" : "Save Visitor Bot Settings"}
                    </button>
                  </form>

                  <div className="amx-settings-row" style={{ marginTop: 18 }}>
                    <div>
                      <strong>Combine Synthetic Traffic by Default</strong>
                      <span>
                        Starting view for the Visitors dashboard's KPIs and insights (switchable per-visit on that page). Also switches the{" "}
                        <strong>public "Total Visitors" counter</strong> on the live website to include synthetic bot visits — real site
                        visitors will see a number that includes bot-generated traffic while this is on.
                      </span>
                    </div>
                    <Toggle on={botSettings.combinedViewDefault} onClick={toggleCombinedViewDefault} disabled={savingBot} />
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--a-border)", flexWrap: "wrap" }}>
                    <button type="button" className="amx-btn amx-btn-outline" onClick={runBotTestRun} disabled={testRunning}>
                      {testRunning ? "Generating…" : "Test Run"}
                    </button>
                    <button type="button" className="amx-btn amx-btn-outline" onClick={clearSyntheticData} disabled={resettingBotData}>
                      {resettingBotData ? "Clearing…" : "Clear Synthetic Visitor Data"}
                    </button>
                  </div>

                  {testRunResult && (
                    <div className="amx-panel-sub" style={{ marginTop: 12 }}>
                      Generated one synthetic visit: <strong>{testRunResult.city}, {testRunResult.country}</strong> — {testRunResult.deviceType} / {testRunResult.browser},{" "}
                      {testRunResult.pageCount} page{testRunResult.pageCount === 1 ? "" : "s"}, {testRunResult.durationSeconds}s. Visible in the Visitors list as{" "}
                      <strong>Synthetic</strong>.
                    </div>
                  )}
                  {resetResult && (
                    <div className="amx-panel-sub" style={{ marginTop: 12 }}>
                      Cleared {resetResult.deletedVisitors} synthetic visitor{resetResult.deletedVisitors === 1 ? "" : "s"} and {resetResult.deletedSessions} session{resetResult.deletedSessions === 1 ? "" : "s"}.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {section === "userBot" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>User Bot Settings</h3>
                  <div className="amx-panel-sub">
                    Generates fully-populated, 100%-complete synthetic User accounts for demo/testing — real education, work
                    experience, skills, and hobbies, drawn from the same lists real members choose from. Every bot account is
                    permanently flagged at the database level and never counted as a real user in engagement analytics. Bot
                    accounts stay active and publicly visible like any other profile, but the synthetic flag itself is
                    admin-only — never shown on the public profile page.
                  </div>
                </div>
              </div>

              {!userBotSettings ? (
                <p className="amx-panel-sub">Loading…</p>
              ) : (
                <>
                  <div className="amx-settings-row" style={{ marginBottom: 18 }}>
                    <div>
                      <strong>Enable User Bot</strong>
                      <span>Starts generating synthetic user accounts on the hourly schedule below. Switching this off stops new bot accounts within a minute.</span>
                    </div>
                    <Toggle on={userBotSettings.enabled} onClick={toggleUserBotEnabled} disabled={savingUserBot} />
                  </div>

                  <form onSubmit={submitUserBotForm} className="amx-form-grid" noValidate>
                    <div className="amx-form-group">
                      <label htmlFor="userbot-per-hour">Bot Users per Hour</label>
                      <input
                        id="userbot-per-hour"
                        type="number"
                        min={1}
                        step={1}
                        value={userBotInput.usersPerHour}
                        onChange={(e) => setUserBotInput((s) => ({ ...s, usersPerHour: e.target.value }))}
                      />
                      <div className="amx-field-hint">Spread randomly across each hour, not generated all at once.</div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="userbot-india-percent">India %</label>
                      <input
                        id="userbot-india-percent"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={userBotInput.indiaPercent}
                        onChange={(e) => setUserBotInput((s) => ({ ...s, indiaPercent: e.target.value }))}
                      />
                      <div className="amx-field-hint">International: <strong>{100 - (Number(userBotInput.indiaPercent) || 0)}%</strong></div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="userbot-muslim-percent">Muslim Persona %</label>
                      <input
                        id="userbot-muslim-percent"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={userBotInput.muslimPersonaPercent}
                        onChange={(e) => setUserBotInput((s) => ({ ...s, muslimPersonaPercent: e.target.value }))}
                      />
                      <div className="amx-field-hint">Which name pool the generator draws from — never stored as a claim about the account's actual religion.</div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="userbot-active-start">Active Hours (UTC)</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                          id="userbot-active-start"
                          value={userBotInput.activeHourStart ?? ""}
                          onChange={(e) => setUserBotInput((s) => ({ ...s, activeHourStart: e.target.value }))}
                        >
                          <option value="">All day</option>
                          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                        </select>
                        <span>to</span>
                        <select
                          value={userBotInput.activeHourEnd ?? ""}
                          onChange={(e) => setUserBotInput((s) => ({ ...s, activeHourEnd: e.target.value }))}
                        >
                          <option value="">All day</option>
                          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="userbot-max-per-day">Max Bot Users per Day</label>
                      <input
                        id="userbot-max-per-day"
                        type="number"
                        min={0}
                        placeholder="No limit"
                        value={userBotInput.maxBotUsersPerDay}
                        onChange={(e) => setUserBotInput((s) => ({ ...s, maxBotUsersPerDay: e.target.value }))}
                      />
                      <div className="amx-field-hint">Leave blank for no daily cap.</div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="userbot-max-total">Max Total Bot Users</label>
                      <input
                        id="userbot-max-total"
                        type="number"
                        min={0}
                        placeholder="No limit"
                        value={userBotInput.maxTotalBotUsers}
                        onChange={(e) => setUserBotInput((s) => ({ ...s, maxTotalBotUsers: e.target.value }))}
                      />
                      <div className="amx-field-hint">Generation stops for good once this many bot accounts exist, regardless of the hourly/daily quota.</div>
                    </div>

                    {userBotError && (
                      <div className="amx-field-error" style={{ gridColumn: "1 / -1" }}>
                        <Icon name="info" size={14} />
                        {userBotError}
                      </div>
                    )}
                    <button type="submit" className="amx-btn amx-btn-primary" disabled={savingUserBot} style={{ alignSelf: "end" }}>
                      {savingUserBot ? "Saving…" : "Save User Bot Settings"}
                    </button>
                  </form>

                  <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--a-border)", flexWrap: "wrap" }}>
                    <button type="button" className="amx-btn amx-btn-outline" onClick={runUserBotTestRun} disabled={userTestRunning}>
                      {userTestRunning ? "Generating…" : "Generate Test User"}
                    </button>
                    <button type="button" className="amx-btn amx-btn-outline" onClick={clearUserBotData} disabled={resettingUserBotData}>
                      {resettingUserBotData ? "Clearing…" : "Clear Bot User Data"}
                    </button>
                  </div>

                  {userTestRunResult && (
                    <div className="amx-panel-sub" style={{ marginTop: 12 }}>
                      Generated one bot user: <strong>{userTestRunResult.fullName}</strong> (@{userTestRunResult.username}) —{" "}
                      {userTestRunResult.city}, {userTestRunResult.country}, age {userTestRunResult.age}, profile{" "}
                      {userTestRunResult.profileCompletion}% complete. Visible in Users → Synthetic Users.
                    </div>
                  )}
                  {userResetResult && (
                    <div className="amx-panel-sub" style={{ marginTop: 12 }}>
                      Cleared {userResetResult.deletedUsers} bot user account{userResetResult.deletedUsers === 1 ? "" : "s"}.
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {section === "masjidBot" && (
            <>
              <div className="amx-panel-head">
                <div>
                  <h3>Masjid Bot Settings</h3>
                  <div className="amx-panel-sub">
                    Discovers and imports <strong>real, existing mosques</strong> via the Google Places API — never
                    invented names, addresses, or photos. Imports land in Masjids → Under Review for a human Approve
                    before going publicly live (unless Auto-Publish is on), are always attributed to "Masjid My
                    Community — Automated Import" rather than a real person, and never receive Green Tick
                    certification automatically — that still requires the real verification process.
                  </div>
                </div>
              </div>

              {!masjidBotSettings ? (
                <p className="amx-panel-sub">Loading…</p>
              ) : (
                <>
                  <div className="amx-settings-row" style={{ marginBottom: 18 }}>
                    <div>
                      <strong>Enable Masjid Bot</strong>
                      <span>Starts importing masjids on the hourly schedule below. Switching this off stops new imports within a minute.</span>
                    </div>
                    <Toggle on={masjidBotSettings.enabled} onClick={toggleMasjidBotEnabled} disabled={savingMasjidBot} />
                  </div>

                  <div className="amx-panel-sub" style={{ marginBottom: 18 }}>
                    Uses the same Google Maps API key already configured under{" "}
                    <Link to="/admin/settings/maps">Settings → Google Maps</Link> — no separate key needed.
                  </div>

                  <form onSubmit={submitMasjidBotForm} className="amx-form-grid" noValidate>
                    <div className="amx-form-group">
                      <label htmlFor="masjidbot-per-hour">Masjids per Hour</label>
                      <input
                        id="masjidbot-per-hour"
                        type="number"
                        min={1}
                        step={1}
                        value={masjidBotInput.masjidsPerHour}
                        onChange={(e) => setMasjidBotInput((s) => ({ ...s, masjidsPerHour: e.target.value }))}
                      />
                      <div className="amx-field-hint">Spread randomly across each hour, not imported all at once.</div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="masjidbot-india-percent">India %</label>
                      <input
                        id="masjidbot-india-percent"
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={masjidBotInput.indiaPercent}
                        onChange={(e) => setMasjidBotInput((s) => ({ ...s, indiaPercent: e.target.value }))}
                      />
                      <div className="amx-field-hint">International: <strong>{100 - (Number(masjidBotInput.indiaPercent) || 0)}%</strong></div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="masjidbot-max-api-calls">Max API Calls per Hour</label>
                      <input
                        id="masjidbot-max-api-calls"
                        type="number"
                        min={1}
                        step={1}
                        value={masjidBotInput.maxApiCallsPerHour}
                        onChange={(e) => setMasjidBotInput((s) => ({ ...s, maxApiCallsPerHour: e.target.value }))}
                      />
                      <div className="amx-field-hint">Independent safety cap — most calls are spent checking candidates that turn out to be duplicates, and this is what drives real Google billing.</div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="masjidbot-active-start">Active Hours (UTC)</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select
                          id="masjidbot-active-start"
                          value={masjidBotInput.activeHourStart ?? ""}
                          onChange={(e) => setMasjidBotInput((s) => ({ ...s, activeHourStart: e.target.value }))}
                        >
                          <option value="">All day</option>
                          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                        </select>
                        <span>to</span>
                        <select
                          value={masjidBotInput.activeHourEnd ?? ""}
                          onChange={(e) => setMasjidBotInput((s) => ({ ...s, activeHourEnd: e.target.value }))}
                        >
                          <option value="">All day</option>
                          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="masjidbot-max-per-day">Max Masjids per Day</label>
                      <input
                        id="masjidbot-max-per-day"
                        type="number"
                        min={0}
                        placeholder="No limit"
                        value={masjidBotInput.maxMasjidsPerDay}
                        onChange={(e) => setMasjidBotInput((s) => ({ ...s, maxMasjidsPerDay: e.target.value }))}
                      />
                      <div className="amx-field-hint">Leave blank for no daily cap.</div>
                    </div>
                    <div className="amx-form-group">
                      <label htmlFor="masjidbot-max-total">Max Total Imported Masjids</label>
                      <input
                        id="masjidbot-max-total"
                        type="number"
                        min={0}
                        placeholder="No limit"
                        value={masjidBotInput.maxTotalImportedMasjids}
                        onChange={(e) => setMasjidBotInput((s) => ({ ...s, maxTotalImportedMasjids: e.target.value }))}
                      />
                    </div>

                    {masjidBotError && (
                      <div className="amx-field-error" style={{ gridColumn: "1 / -1" }}>
                        <Icon name="info" size={14} />
                        {masjidBotError}
                      </div>
                    )}
                    <button type="submit" className="amx-btn amx-btn-primary" disabled={savingMasjidBot} style={{ alignSelf: "end" }}>
                      {savingMasjidBot ? "Saving…" : "Save Masjid Bot Settings"}
                    </button>
                  </form>

                  <div className="amx-settings-row" style={{ marginTop: 18 }}>
                    <div>
                      <strong>Auto-Publish Imports</strong>
                      <span>When on, imported masjids skip the Under Review queue and go straight to publicly Approved. Off by default — a human still clicks Approve first.</span>
                    </div>
                    <Toggle on={masjidBotSettings.autoPublish} onClick={toggleMasjidBotAutoPublish} disabled={savingMasjidBot} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="amx-toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </>
  );
}

export default Settings;
