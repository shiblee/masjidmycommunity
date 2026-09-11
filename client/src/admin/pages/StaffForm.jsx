import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import PermissionMatrix from "../components/PermissionMatrix.jsx";
import adminApi from "../services/adminApi.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function StaffForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const clearFieldError = (field) => setFieldErrors((fe) => (fe[field] ? { ...fe, [field]: null } : fe));

  useEffect(() => {
    adminApi.get("/staff/permission-modules").then(({ data }) => setModules(data.modules)).catch(() => setModules([]));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    adminApi
      .get(`/staff/${id}`)
      .then(({ data }) => {
        setName(data.staff.name);
        setEmail(data.staff.email);
        setPermissions(data.staff.permissions || {});
      })
      .catch(() => setError("Couldn't load this staff account."))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const newFieldErrors = {};
    if (!name.trim()) newFieldErrors.name = "Name is required.";
    if (!email.trim()) newFieldErrors.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) newFieldErrors.email = "Enter a valid email address.";
    if (!isEdit && (!password || password.length < 8)) newFieldErrors.password = "Password must be at least 8 characters.";

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError(Object.values(newFieldErrors)[0]);
      return;
    }
    setFieldErrors({});

    const hasAnyPermission = Object.values(permissions).some((a) => a.length > 0);
    if (!hasAnyPermission && !window.confirm("No permissions are assigned, so this account won't be able to access anything yet. Create it anyway?")) {
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.patch(`/staff/${id}`, { name, email, permissions });
      } else {
        await adminApi.post("/staff", { name, email, password, permissions });
      }
      navigate(isEdit ? `/admin/staff/${id}` : "/admin/staff");
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't save this staff account.";
      setError(message);
      if (/email/i.test(message)) setFieldErrors({ email: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="amx-empty"><Icon name="dots" /><strong>Loading…</strong></div>;

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate(isEdit ? `/admin/staff/${id}` : "/admin/staff")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back
          </button>
          <h1 style={{ marginTop: 10 }}>{isEdit ? "Edit Staff" : "Add Staff"}</h1>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        {error && <div className="amx-alert-banner warn" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
          <div className="amx-panel-head"><h3>Account Details</h3></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="amx-form-group">
              <label htmlFor="staff-name">Name</label>
              <input
                id="staff-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                style={fieldErrors.name ? { borderColor: "var(--a-danger)" } : undefined}
              />
              {fieldErrors.name && (
                <div className="amx-field-error">
                  <Icon name="info" size={14} />
                  {fieldErrors.name}
                </div>
              )}
            </div>
            <div className="amx-form-group">
              <label htmlFor="staff-email">Email Address</label>
              <input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                style={fieldErrors.email ? { borderColor: "var(--a-danger)" } : undefined}
              />
              {fieldErrors.email && (
                <div className="amx-field-error">
                  <Icon name="info" size={14} />
                  {fieldErrors.email}
                </div>
              )}
            </div>
            {!isEdit && (
              <div className="amx-form-group">
                <label htmlFor="staff-password">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                    style={{ paddingRight: 40, width: "100%", ...(fieldErrors.password ? { borderColor: "var(--a-danger)" } : {}) }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 4, cursor: "pointer", color: "var(--a-text-dim)", display: "flex" }}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={16} />
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="amx-field-error">
                    <Icon name="info" size={14} />
                    {fieldErrors.password}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
          <div className="amx-panel-head">
            <h3>Module Permissions</h3>
            <div className="amx-panel-sub">Grant only the modules and actions this staff member needs.</div>
          </div>
          <PermissionMatrix modules={modules} permissions={permissions} onChange={setPermissions} />
        </div>

        <div className="amx-page-actions">
          <button type="submit" className="amx-btn amx-btn-accent" disabled={saving}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Staff Account"}
          </button>
        </div>
      </form>
    </>
  );
}

export default StaffForm;
