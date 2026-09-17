import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "../../components/Icons.jsx";
import { formatDate } from "../../utils/formatDateTime.js";
import requirementApi from "../../services/requirementApi.js";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

const STATUS_PILL_CLASS = { open: "active", fulfilled: "active", closed: "cancelled" };

function MyRequirements() {
  const { t } = useTranslation();
  const location = useLocation();
  const [requirements, setRequirements] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(location.state?.justSubmitted ? t("myRequirements.submitted", "Your requirement has been submitted successfully.") : null);

  const STATUS_LABEL = {
    open: t("myRequirements.status.open", "Open"),
    fulfilled: t("myRequirements.status.fulfilled", "Fulfilled"),
    closed: t("myRequirements.status.closed", "Closed"),
  };

  useEffect(() => {
    requirementApi
      .get("/mine")
      .then(({ data }) => setRequirements(data.requirements))
      .catch(() => setError(t("myRequirements.loadError", "Couldn't load your requirements.")));
  }, [t]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <main className="acct-page">
      <section className="acct-hero on-ink">
        <div className="wrap acct-hero-inner">
          <div>
            <span className="eyebrow">{t("myRequirements.hero.eyebrow", "Your Requirements")}</span>
            <h1>{t("myRequirements.hero.title", "My Requirements")}</h1>
            <p>{t("myRequirements.hero.sub", "Submit a service requirement and track its status here.")}</p>
          </div>
          <Link to="/account/my-requirements/new" className="btn btn-gold" style={{ marginLeft: "auto" }}>
            <Icon name="plus" size={16} /> {t("myRequirements.addRequirement", "Add a Requirement")}
          </Link>
        </div>
      </section>

      <section className="py-sm">
        <div className="wrap">
          {error && <div className="auth-alert"><Icon name="info" size={17} />{error}</div>}

          {requirements && requirements.length === 0 && (
            <div className="msj-empty-state">
              <Icon name="list" size={30} />
              <h3>{t("myRequirements.empty.title", "You haven't submitted a requirement yet")}</h3>
              <p>{t("myRequirements.empty.body", "Tell us what you need help with, and we'll connect you with the right service providers.")}</p>
              <Link to="/account/my-requirements/new" className="btn btn-gold">{t("myRequirements.addRequirement", "Add a Requirement")} <span className="btn-arrow">→</span></Link>
            </div>
          )}

          {requirements && requirements.length > 0 && (
            <div className="msj-list-grid">
              {requirements.map((r) => (
                <div className="job-card" key={r.id}>
                  <div className="job-card-top">
                    <span className="job-card-type">{r.categoryName}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                      <span className="job-card-category">{r.subcategoryName}</span>
                      <span className={`acct-status-pill ${STATUS_PILL_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                  </div>

                  <p className="job-card-meta" style={{ marginTop: 8 }}>{r.remark}</p>
                  <p className="job-card-meta">
                    <Icon name="mapPin" size={13} /> {r.address}
                  </p>

                  <div className="job-card-footer">
                    <span>{t("myRequirements.submittedOn", "Submitted {date}").replace("{date}", formatDate(r.createdAt))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {toast &&
        createPortal(
          <div className="acct-toast"><Icon name="check" size={16} />{toast}</div>,
          document.body
        )}
    </main>
  );
}

export default MyRequirements;
