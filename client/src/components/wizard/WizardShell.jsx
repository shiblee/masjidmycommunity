import React from "react";
import { Icon } from "../Icons.jsx";
import { useTranslation } from "../../i18n/LanguageContext.jsx";

// Extracted out of MasjidWizard.jsx (its original, still only, caller) so
// other multi-step flows — e.g. the Green Tick application wizard — can
// reuse the exact same shell/stepper instead of duplicating this JSX.
export function WizardShell({ embedded, children }) {
  if (embedded) return <div className="cw-wizard-embed">{children}</div>;
  return (
    <main className="msj-page">
      <div className="wrap py-lg">{children}</div>
    </main>
  );
}

// Connected-line progress stepper. Labels hide on narrow screens in favour of
// the compact "Step X of N" line rendered alongside it (see msj-stepper-current).
export function WizardStepper({ steps, current }) {
  const { t } = useTranslation();
  return (
    <div className="msj-stepper" role="list" aria-label={t("wizardShell.progress", "Progress")}>
      {steps.map((s, i) => {
        const num = i + 1;
        const state = num < current ? "done" : num === current ? "active" : "upcoming";
        return (
          <div className={`msj-stepper-item ${state}`} role="listitem" key={s.key}>
            <span className="msj-stepper-dot">
              {state === "done" ? <Icon name="check" size={14} /> : <Icon name={s.icon} size={15} />}
            </span>
            <span className="msj-stepper-label">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
