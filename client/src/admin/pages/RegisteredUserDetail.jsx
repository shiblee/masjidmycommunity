import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate, formatDateTime } from "../../utils/formatDateTime.js";

const METHOD_LABEL = {
  email: "Email",
  mobile: "Mobile",
  both: "Email + Mobile",
};

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function Section({ title, children }) {
  return (
    <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
      <div className="amx-panel-head"><h3>{title}</h3></div>
      {children}
    </div>
  );
}

function Row({ label, value, badge }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
      <div>
        <span className="amx-panel-sub" style={{ display: "block" }}>{label}</span>
        <strong>{value || "—"}</strong>
      </div>
      {badge}
    </div>
  );
}

const STATUS_ACTION = {
  active: { title: "Activate this account?", message: "The user will regain full access to their account and be notified by email.", iconClass: "amx-modal-success-icon", icon: "check", confirmClass: "amx-btn-accent", confirmLabel: "Activate" },
  inactive: { title: "Deactivate this account?", message: "The user will no longer be able to sign in until an admin reactivates the account. They'll be notified by email.", iconClass: "amx-modal-neutral-icon", icon: "eyeOff", confirmClass: "amx-btn-outline", confirmLabel: "Deactivate" },
  suspended: { title: "Suspend this account?", message: "The user will immediately lose access to their account and be notified by email that they've been suspended.", iconClass: "amx-modal-danger-icon", icon: "lock", confirmClass: "amx-btn-danger", confirmLabel: "Suspend" },
};

function ConfirmStatusModal({ status, onCancel, onConfirm, busy }) {
  const cfg = STATUS_ACTION[status];
  return (
    <div className="amx-modal-overlay" onClick={onCancel}>
      <div className="amx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="amx-modal-close" onClick={onCancel} aria-label="Close"><Icon name="x" size={16} /></button>
        <div className={cfg.iconClass}><Icon name={cfg.icon} size={22} /></div>
        <h3 style={{ textAlign: "center" }}>{cfg.title}</h3>
        <p className="amx-modal-sub" style={{ textAlign: "center" }}>{cfg.message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="amx-btn amx-btn-outline" style={{ flex: 1 }} onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`amx-btn ${cfg.confirmClass}`} style={{ flex: 1 }} onClick={onConfirm} disabled={busy}>{busy ? "Please wait…" : cfg.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function RegisteredUserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get("/users")
      .then(({ data }) => {
        const found = data.users.find((u) => String(u.id) === String(id));
        if (!found) {
          setError("This user account could not be found.");
          return;
        }
        setUser(found);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load this user."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const changeStatus = async (nextStatus, successMsg) => {
    setBusy(true);
    try {
      const { data } = await adminApi.put(`/users/${id}/status`, { status: nextStatus });
      setUser(data.user);
      showToast(successMsg);
    } catch (err) {
      showToast(err.response?.data?.message || "Couldn't update this account.");
    } finally {
      setBusy(false);
      setPendingStatus(null);
    }
  };

  const STATUS_SUCCESS = { active: "Account activated.", inactive: "Account deactivated.", suspended: "Account suspended." };

  if (loading) {
    return <div className="amx-empty"><Icon name="donors" /><strong>Loading user…</strong></div>;
  }

  if (!user) {
    return (
      <>
        <button className="amx-back-link" onClick={() => navigate("/admin/registered-users")}>
          <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Users
        </button>
        <div className="amx-form-error" style={{ marginTop: 16 }}>
          <Icon name="info" size={17} />
          {error}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="amx-page-head">
        <div>
          <button className="amx-back-link" onClick={() => navigate("/admin/registered-users")}>
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} /> Back to Users
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
            <span className="amx-avatar" style={{ width: 56, height: 56, fontSize: 20, flexShrink: 0 }}>
              {initialsOf(user.fullName)}
            </span>
            <div>
              <h1 style={{ margin: 0 }}>{user.fullName}</h1>
              <p style={{ margin: "2px 0 0" }}>@{user.username} · User #{user.id}</p>
            </div>
          </div>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center" }}>
          <StatusBadge status={user.status} />
        </div>
      </div>

      <div className="amx-editor-layout">
        <div>
          <Section title="Contact & Verification">
            <Row
              label="Email Address"
              value={user.email}
              badge={user.email && <StatusBadge status={user.emailVerified ? "verified" : "pending"} />}
            />
            <Row
              label="Mobile Number"
              value={user.mobile}
              badge={user.mobile && <StatusBadge status={user.mobileVerified ? "verified" : "pending"} />}
            />
            <Row label="Registration Method" value={METHOD_LABEL[user.registrationMethod] || user.registrationMethod} />
          </Section>

          <Section title="Account Activity">
            <Row label="Registered On" value={formatDate(user.createdAt)} />
            <Row
              label="Last Login"
              value={<button className="amx-link-btn" onClick={() => navigate(`/admin/registered-users/${id}/activity`)}>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</button>}
            />
            <button className="amx-btn amx-btn-outline amx-btn-sm" style={{ marginTop: 4 }} onClick={() => navigate(`/admin/registered-users/${id}/activity`)}>
              <Icon name="clock" size={15} /> View Full Login &amp; Activity History
            </button>
          </Section>
        </div>

        <div className="amx-card amx-panel">
          <div className="amx-panel-head"><h3>Actions</h3></div>
          {user.status === "pending_verification" ? (
            <p>This account is still awaiting the owner's email or mobile verification — no admin action needed yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {user.status !== "active" && (
                <button className="amx-btn amx-btn-accent" disabled={busy} onClick={() => setPendingStatus("active")}>
                  <Icon name="check" size={16} /> Activate
                </button>
              )}
              {user.status !== "inactive" && (
                <button className="amx-btn amx-btn-outline" disabled={busy} onClick={() => setPendingStatus("inactive")}>
                  Deactivate
                </button>
              )}
              {user.status !== "suspended" && (
                <button className="amx-btn amx-btn-danger" disabled={busy} onClick={() => setPendingStatus("suspended")}>
                  Suspend
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {toast && <div className="amx-toast"><Icon name="check" />{toast}</div>}

      {pendingStatus && (
        <ConfirmStatusModal
          status={pendingStatus}
          busy={busy}
          onCancel={() => setPendingStatus(null)}
          onConfirm={() => changeStatus(pendingStatus, STATUS_SUCCESS[pendingStatus])}
        />
      )}
    </>
  );
}

export default RegisteredUserDetail;
