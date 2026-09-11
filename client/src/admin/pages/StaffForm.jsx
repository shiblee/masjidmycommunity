import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import PermissionMatrix from "../components/PermissionMatrix.jsx";
import adminApi from "../services/adminApi.js";

function StaffForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [permissions, setPermissions] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

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

    if (!name.trim()) return setError("Name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (!isEdit) {
      if (!password || password.length < 8) return setError("Password must be at least 8 characters.");
      if (password !== confirmPassword) return setError("Password and confirm password don't match.");
    }
    const hasAnyPermission = Object.values(permissions).some((a) => a.length > 0);
    if (!hasAnyPermission && !window.confirm("No permissions are assigned, so this account won't be able to access anything yet. Create it anyway?")) {
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await adminApi.patch(`/staff/${id}`, { name, email, permissions });
      } else {
        await adminApi.post("/staff", { name, email, password, confirmPassword, permissions });
      }
      navigate(isEdit ? `/admin/staff/${id}` : "/admin/staff");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this staff account.");
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

      <form onSubmit={submit}>
        {error && <div className="amx-alert-banner warn" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
          <div className="amx-panel-head"><h3>Account Details</h3></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="amx-form-group">
              <label htmlFor="staff-name">Name</label>
              <input id="staff-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="amx-form-group">
              <label htmlFor="staff-email">Email Address</label>
              <input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            {!isEdit && (
              <>
                <div className="amx-form-group">
                  <label htmlFor="staff-password">Password</label>
                  <input id="staff-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
                <div className="amx-form-group">
                  <label htmlFor="staff-confirm-password">Confirm Password</label>
                  <input id="staff-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
                </div>
              </>
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
