import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";
import userApi from "../services/userApi.js";
import { getStoredUser, clearUserSession } from "../utils/userAuthStorage.js";

const NEXT_STEPS = [
  { icon: "flag", title: "Create a Campaign", desc: "Launch a fundraising campaign for your masjid's next project.", cta: "Start a Campaign", intentKey: "campaign" },
  { icon: "mosque", title: "Register Your Masjid", desc: "Add your masjid's profile so it can be verified and featured.", cta: "Register Masjid" },
  { icon: "chartUp", title: "Manage Campaigns", desc: "Track fundraising progress and update your active campaigns.", cta: "View Campaigns" },
  { icon: "heart", title: "View Donations", desc: "See the contributions your campaigns have received.", cta: "View Donations" },
];

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")).toUpperCase();
}

function Account() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent = params.get("intent");
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    userApi
      .get("/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => {});
  }, []);

  const logout = () => {
    clearUserSession();
    navigate("/");
  };

  if (!user) return null;

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div className="acct-avatar">{initialsOf(user.fullName)}</div>
          <div>
            <span className="eyebrow">Your Account</span>
            <h1>Welcome, {user.fullName.split(" ")[0]}.</h1>
            <p>
              {intent === "campaign"
                ? "You're signed in — you're ready to start your campaign."
                : "Manage your account and take the next step on Masjid My Community."}
            </p>
          </div>
          <button className="btn btn-outline-paper acct-logout" onClick={logout}>
            Log Out
          </button>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          <div className="acct-status-card">
            <div>
              <span className="acct-status-label">Account Status</span>
              <span className={`acct-status-pill ${user.status}`}>
                {user.status === "active" ? "Active" : user.status.replace("_", " ")}
              </span>
            </div>
            <div>
              <span className="acct-status-label">Username</span>
              <span className="acct-status-value">{user.username}</span>
            </div>
            <div>
              <span className="acct-status-label">Email</span>
              <span className="acct-status-value">{user.email || "—"}</span>
            </div>
            <div>
              <span className="acct-status-label">Mobile</span>
              <span className="acct-status-value">{user.mobile || "—"}</span>
            </div>
          </div>

          <div className="section-head" style={{ marginTop: 48 }}>
            <span className="eyebrow">What's next</span>
            <h2>Continue your journey</h2>
          </div>

          <div className="acct-next-grid">
            {NEXT_STEPS.map((s) => (
              <div className={`acct-next-card${intent === s.intentKey ? " highlighted" : ""}`} key={s.title}>
                {intent === s.intentKey ? <span className="acct-next-flag">Continue here</span> : <span className="acct-next-soon">Coming soon</span>}
                <div className="acct-next-icon">
                  <Icon name={s.icon} size={24} />
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <button className="acct-next-cta" type="button" title="This workflow is launching in the next phase.">
                  {s.cta} <span className="btn-arrow">→</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Account;
