import React from "react";

/**
 * Subtle, low-opacity Islamic-inspired geometric lattice — interlocking
 * squares and roundels, tiled. Decorative only (aria-hidden).
 */
function GeometricPattern({ className = "amx-login-pattern" }) {
  return (
    <svg className={className} width="100%" height="100%" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="amxGirih" width="140" height="140" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.1">
            <rect x="35" y="35" width="70" height="70" />
            <rect x="35" y="35" width="70" height="70" transform="rotate(45 70 70)" />
            <circle cx="70" cy="70" r="48" />
            <circle cx="70" cy="70" r="4" fill="rgba(163,214,92,0.35)" stroke="none" />
          </g>
        </pattern>
        <radialGradient id="amxFade" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#amxGirih)" />
      <rect width="100%" height="100%" fill="url(#amxFade)" />
    </svg>
  );
}

export default GeometricPattern;
