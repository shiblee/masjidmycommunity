import React from "react";

// Small pill switch used anywhere in the admin for an instant on/off
// setting — styled via the global .amx-toggle rules in admin.css.
// size="sm" is for tight spots like an inline pill/chip next to a label.
function Toggle({ on, onClick, disabled, size }) {
  return (
    <button
      type="button"
      className={`amx-toggle${on ? " on" : ""}${size === "sm" ? " amx-toggle-sm" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
    />
  );
}

export default Toggle;
