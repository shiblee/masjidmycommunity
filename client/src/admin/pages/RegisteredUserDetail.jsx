import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Icon from "../components/Icons.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import adminApi from "../services/adminApi.js";
import { formatDate, formatDateTime } from "../../utils/formatDateTime.js";
import { PersonalDetailsForm } from "../../components/profile/PersonalDetailsCard.jsx";
import ProfilePhotoCard from "../../components/profile/ProfilePhotoCard.jsx";
import EducationCard from "../../components/profile/EducationCard.jsx";
import WorkExperienceCard from "../../components/profile/WorkExperienceCard.jsx";
import SkillsCard from "../../components/profile/SkillsCard.jsx";
import HobbiesCard from "../../components/profile/HobbiesCard.jsx";

const METHOD_LABEL = {
  email: "Email",
  mobile: "Mobile",
  both: "Email + Mobile",
};

const GENDER_LABEL = { male: "Male", female: "Female", other: "Other" };

function calcAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear = today.getMonth() > birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
}

// Small "N Approved · N Under Review · ..." breakdown, in a fixed sensible
// order rather than whatever order statuses happen to appear in the data.
function statusBreakdown(items, order) {
  const counts = {};
  for (const item of items) counts[item.status] = (counts[item.status] || 0) + 1;
  return order.filter((s) => counts[s]).map((s) => ({ status: s, count: counts[s] }));
}

const MASJID_STATUS_ORDER = ["approved", "submitted", "under_review", "changes_requested", "draft", "rejected", "inactive"];
const CAMPAIGN_STATUS_ORDER = ["active", "submitted", "under_review", "changes_requested", "draft", "approved", "paused", "goal_reached", "completed", "rejected", "cancelled"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "profile", label: "Profile Details" },
  { key: "education", label: "Education" },
  { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" },
  { key: "hobbies", label: "Hobbies" },
  { key: "assets", label: "Masjids & Campaigns" },
  { key: "changelog", label: "Change Log" },
];

const SECTION_LABEL = {
  personal: "Personal Details",
  photo: "Photo",
  education: "Education",
  work_experience: "Work Experience",
  skill: "Skill",
  hobby: "Hobby",
};

const FIELD_LABEL = {
  fullName: "Full Name",
  bio: "Bio",
  email: "Email",
  mobile: "Mobile",
  gender: "Gender",
  maritalStatus: "Marital Status",
  dateOfBirth: "Date of Birth",
  locationLabel: "Location",
  profilePhoto: "Profile Photo",
  proficiency: "Proficiency",
  company: "Company / Organization",
  title: "Job Title / Position",
  employmentType: "Employment Type",
  startDate: "Start Date",
  endDate: "End Date",
  isCurrent: "Currently Working Here",
  location: "Location",
  description: "Description",
  achievements: "Key Achievements",
  skillsUsed: "Skills / Technologies Used",
  isActive: "Active",
  level: "Education Level",
  degree: "Degree / Qualification",
  institution: "Institution / University",
  fieldOfStudy: "Field of Study",
  startYear: "Start Year",
  endYear: "End Year",
  isCurrentlyStudying: "Currently Studying",
};

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

function AssetList({ title, items, emptyLabel, onOpen, nameKey }) {
  return (
    <Section title={title}>
      {items.length === 0 ? (
        <p className="amx-panel-sub">{emptyLabel}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="amx-link-row"
              onClick={() => onOpen(item.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "var(--a-bg)", border: "none", borderRadius: 10, padding: "12px 14px", cursor: "pointer", textAlign: "left" }}
            >
              <strong>{item[nameKey]}</strong>
              <StatusBadge status={item.status} />
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

function ChangeLogTab({ userId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    adminApi
      .get(`/users/${userId}/profile-change-log`, { params: { page } })
      .then(({ data }) => {
        setEntries(data.entries);
        setTotalPages(data.totalPages);
      })
      .finally(() => setLoading(false));
  }, [userId, page]);

  const describe = (entry) => {
    if (entry.action === "create") return "Added";
    if (entry.action === "delete") return "Removed";
    return FIELD_LABEL[entry.field] || entry.field;
  };

  const valueText = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === "object") return parsed.title || parsed.company || parsed.degree || parsed.name || "Entry";
    } catch {
      // plain scalar value, not JSON
    }
    return String(v).length > 60 ? `${String(v).slice(0, 60)}…` : String(v);
  };

  return (
    <Section title="Profile Change Log">
      {loading ? (
        <p className="amx-panel-sub">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="amx-panel-sub">No profile changes have been recorded yet.</p>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Section</th>
                <th>Field</th>
                <th>Previous Value</th>
                <th>New Value</th>
                <th>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{formatDateTime(e.createdAt)}</td>
                  <td>{SECTION_LABEL[e.section] || e.section}</td>
                  <td>{describe(e)}</td>
                  <td>{valueText(e.oldValue)}</td>
                  <td>{valueText(e.newValue)}</td>
                  <td>{e.actorType === "admin" ? `Admin${e.actorName ? ` · ${e.actorName}` : ""}` : "Account holder"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="amx-panel-sub" style={{ alignSelf: "center" }}>Page {page} of {totalPages}</span>
          <button className="amx-btn amx-btn-outline amx-btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </Section>
  );
}

function RegisteredUserDetail() {
  const { id, tab: tabParam } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [masjids, setMasjids] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  // Driven by the URL (not local state) so each tab has its own address and
  // a refresh — or a shared link — lands back on the same tab instead of
  // bouncing to Overview.
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : "overview";
  const goToTab = (key) => {
    navigate(key === "overview" ? `/admin/registered-users/${id}` : `/admin/registered-users/${id}/${key}`, { replace: true });
  };

  const load = () => {
    setLoading(true);
    setError("");
    adminApi
      .get(`/users/${id}`)
      .then(({ data }) => {
        setUser(data.user);
        setMasjids(data.masjids || []);
        setCampaigns(data.campaigns || []);
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
      setUser((u) => ({ ...u, ...data.user }));
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
            <ProfilePhotoCard user={user} mode="admin" targetUserId={id} onUserUpdated={(u) => setUser((prev) => ({ ...prev, ...u }))} />
            <div>
              <h1 style={{ margin: 0 }}>{user.fullName}</h1>
              <p style={{ margin: "2px 0 0" }}>@{user.username} · User #{user.id}</p>
            </div>
          </div>
        </div>
        <div className="amx-page-actions" style={{ alignItems: "center", gap: 10 }}>
          {user.profileCompletion != null && (
            <span className="amx-badge amx-badge-neutral" title="Profile completion">
              <span className="amx-badge-dot" /> {user.profileCompletion}% Complete
            </span>
          )}
          <span className={`amx-badge ${user.isOnline ? "amx-badge-ok" : "amx-badge-neutral"}`}>
            <span className="amx-badge-dot" /> {user.isOnline ? "Online" : "Offline"}
          </span>
          <StatusBadge status={user.status} />
        </div>
      </div>

      <div className="amx-tabs" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => goToTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="amx-editor-layout">
          <div>
            <Section title="Profile Summary">
              {user.profileCompletion != null && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span className="amx-panel-sub">Profile Completion</span>
                    <strong>{user.profileCompletion}%</strong>
                  </div>
                  <div className="amx-completion-bar" style={{ width: "100%" }}>
                    <div className="amx-completion-fill" style={{ width: `${user.profileCompletion}%` }} />
                  </div>
                </div>
              )}
              {user.bio ? (
                <p style={{ marginTop: 0, marginBottom: 18 }}>{user.bio}</p>
              ) : (
                <p className="amx-panel-sub" style={{ marginTop: 0, marginBottom: 18 }}>No bio added yet.</p>
              )}
              <Row label="Gender" value={user.gender ? GENDER_LABEL[user.gender] || user.gender : null} />
              <Row label="Marital Status" value={user.maritalStatus} />
              <Row
                label="Date of Birth"
                value={user.dateOfBirth ? `${formatDate(user.dateOfBirth)}${calcAge(user.dateOfBirth) !== null ? ` (${calcAge(user.dateOfBirth)} yrs)` : ""}` : null}
              />
              <Row label="Location" value={user.locationLabel || [user.locationCity, user.locationState, user.locationCountry].filter(Boolean).join(", ")} />
            </Section>

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

            <Section title="Masjids & Campaigns">
              <div style={{ display: "flex", gap: 24, marginBottom: masjids.length || campaigns.length ? 18 : 0 }}>
                <div>
                  <span className="amx-panel-sub" style={{ display: "block" }}>Masjids Registered</span>
                  <strong style={{ fontSize: 22 }}>{masjids.length}</strong>
                </div>
                <div>
                  <span className="amx-panel-sub" style={{ display: "block" }}>Campaigns Created</span>
                  <strong style={{ fontSize: 22 }}>{campaigns.length}</strong>
                </div>
              </div>
              {statusBreakdown(masjids, MASJID_STATUS_ORDER).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {statusBreakdown(masjids, MASJID_STATUS_ORDER).map(({ status, count }) => (
                    <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {count} <StatusBadge status={status} />
                    </span>
                  ))}
                </div>
              )}
              {statusBreakdown(campaigns, CAMPAIGN_STATUS_ORDER).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {statusBreakdown(campaigns, CAMPAIGN_STATUS_ORDER).map(({ status, count }) => (
                    <span key={status} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {count} <StatusBadge status={status} />
                    </span>
                  ))}
                </div>
              )}
              {(masjids.length > 0 || campaigns.length > 0) && (
                <button className="amx-btn amx-btn-outline amx-btn-sm" style={{ marginTop: 14 }} onClick={() => goToTab("assets")}>
                  View Masjids &amp; Campaigns
                </button>
              )}
            </Section>
          </div>

          <div>
            <div className="amx-card amx-panel" style={{ marginBottom: 20 }}>
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
        </div>
      )}

      {tab === "profile" && (
        <div style={{ maxWidth: 640 }}>
          <div className="card profile-card">
            <div className="profile-card-head">
              <h3>Profile Details</h3>
            </div>
            <PersonalDetailsForm user={user} mode="admin" targetUserId={id} onSaved={(u) => setUser((prev) => ({ ...prev, ...u }))} />
          </div>
        </div>
      )}

      {tab === "education" && (
        <div style={{ maxWidth: 640 }}><EducationCard mode="admin" targetUserId={id} /></div>
      )}

      {tab === "experience" && (
        <div style={{ maxWidth: 640 }}><WorkExperienceCard mode="admin" targetUserId={id} /></div>
      )}

      {tab === "skills" && (
        <div style={{ maxWidth: 640 }}><SkillsCard mode="admin" targetUserId={id} /></div>
      )}

      {tab === "hobbies" && (
        <div style={{ maxWidth: 640 }}><HobbiesCard mode="admin" targetUserId={id} /></div>
      )}

      {tab === "assets" && (
        <div style={{ maxWidth: 640 }}>
          <AssetList title="Masjids" items={masjids} emptyLabel="This user hasn't registered any masjids." onOpen={(mid) => navigate(`/admin/masjids/${mid}`)} nameKey="name" />
          <AssetList title="Campaigns" items={campaigns} emptyLabel="This user hasn't created any campaigns." onOpen={(cid) => navigate(`/admin/campaigns/${cid}`)} nameKey="title" />
        </div>
      )}

      {tab === "changelog" && <ChangeLogTab userId={id} />}

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
