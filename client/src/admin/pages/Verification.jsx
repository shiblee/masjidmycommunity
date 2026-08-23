import React, { useState } from "react";
import Icon from "../components/Icons.jsx";
import { VERIFICATIONS } from "../mockData.js";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function Verification() {
  const [statuses, setStatuses] = useState(() => Object.fromEntries(VERIFICATIONS.map((v) => [v.id, "pending"])));
  const [tab, setTab] = useState("pending");
  const [toast, setToast] = useState(null);

  const decide = (item, decision) => {
    setStatuses((s) => ({ ...s, [item.id]: decision }));
    setToast(`${item.masjid} was ${decision === "verified" ? "approved" : "rejected"}.`);
    setTimeout(() => setToast(null), 2600);
  };

  const items = VERIFICATIONS.filter((v) => statuses[v.id] === tab);
  const counts = {
    pending: VERIFICATIONS.filter((v) => statuses[v.id] === "pending").length,
    verified: VERIFICATIONS.filter((v) => statuses[v.id] === "verified").length,
    rejected: VERIFICATIONS.filter((v) => statuses[v.id] === "rejected").length,
  };

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Trust &amp; Safety</span>
          <h1>Verification</h1>
          <p>Review submitted documents and approve or reject masjid registrations</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        <div className="amx-tabs" style={{ marginBottom: 20, width: "fit-content" }}>
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="amx-empty">
            <Icon name="inbox" />
            <strong>Nothing here right now</strong>
            <span>{tab === "pending" ? "All caught up — no pending verification requests." : `No ${tab} requests yet.`}</span>
          </div>
        ) : (
          <div>
            {items.map((v) => (
              <div key={v.id} style={{ display: "flex", gap: 16, padding: "18px 0", borderBottom: "1px solid var(--a-border)", alignItems: "flex-start" }}>
                <div className="amx-verify-thumb" style={{ width: 48, height: 48 }}>
                  <Icon name="mosque" size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 14.5, color: "var(--a-text)" }}>{v.masjid}</strong>
                  <div style={{ fontSize: 12.5, color: "var(--a-text-faint)", marginTop: 2 }}>
                    {v.loc} · {v.submitted} · {v.id}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {v.docs.map((d) => (
                      <span key={d} className="amx-badge amx-badge-neutral">
                        <Icon name="fileText" size={12} />
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                {tab === "pending" ? (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button className="amx-btn amx-btn-outline amx-btn-sm" onClick={() => decide(v, "rejected")}>
                      <Icon name="x" size={14} />
                      Reject
                    </button>
                    <button className="amx-btn amx-btn-accent amx-btn-sm" onClick={() => decide(v, "verified")}>
                      <Icon name="check" size={14} />
                      Approve
                    </button>
                  </div>
                ) : (
                  <span className={`amx-badge ${tab === "verified" ? "amx-badge-ok" : "amx-badge-danger"}`} style={{ flexShrink: 0 }}>
                    <span className="amx-badge-dot" />
                    {tab === "verified" ? "Approved" : "Rejected"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
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

export default Verification;
