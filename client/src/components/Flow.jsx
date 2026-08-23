import React from "react";
import { Icon } from "./Icons.jsx";

function Flow({ nodes, onInk = false }) {
  return (
    <div className={`flow${onInk ? " flow-on-ink" : ""}`}>
      {nodes.map((n, i) => (
        <React.Fragment key={n.label}>
          <div className="flow-node" style={{ transitionDelay: `${i * 0.1}s` }}>
            <div className="flow-icon">
              <Icon name={n.icon} size={28} />
            </div>
            <div className="flow-label">{n.label}</div>
            {n.desc && <div className="flow-desc">{n.desc}</div>}
          </div>
          {i < nodes.length - 1 && (
            <div className="flow-connector" aria-hidden="true" style={{ transitionDelay: `${i * 0.1 + 0.15}s` }}>
              <span className="flow-line" />
              <span className="flow-arrow-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default Flow;
