import React, { useEffect, useRef, useState } from "react";
import Icon from "../components/Icons.jsx";
import adminApi from "../services/adminApi.js";
import { updateStoredUser } from "../authStorage.js";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const SECTIONS = [
  { key: "profile", label: "Profile", icon: "users" },
  { key: "security", label: "Security", icon: "lock" },
  { key: "notifications", label: "Notifications", icon: "bell" },
  { key: "platform", label: "Platform", icon: "settings" },
];

function initialsOf(name) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length - 1]?.[0] || "")).toUpperCase();
}

function Toggle({ on, onClick, disabled }) {
  return <button type="button" className={`amx-toggle${on ? " on" : ""}`} onClick={onClick} disabled={disabled} aria-pressed={on} />;
}

function Settings() {
  const [section, setSection] = useState("profile");
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
            <button key={s.key} className={section === s.key ? "active" : ""} onClick={() => setSection(s.key)}>
              <Icon name={s.icon} />
              {s.label}
            </button>
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
                <textarea rows={3} value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
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
