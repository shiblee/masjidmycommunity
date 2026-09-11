import React from "react";

// One row per module with a checkbox per available action -- shared by
// StaffForm.jsx (create/edit) and StaffDetail.jsx's Permissions tab (edit
// modal), so the matrix only exists in one place.
function PermissionMatrixRow({ module, granted, onChange }) {
  const toggle = (action) => {
    const has = granted.includes(action);
    onChange(has ? granted.filter((a) => a !== action) : [...granted, action]);
  };

  return (
    <div className="amx-permission-row">
      <span className="amx-permission-row-label">{module.label}</span>
      <div className="amx-permission-row-actions">
        {module.actions.map((action) => (
          <label key={action} className="amx-permission-checkbox">
            <input type="checkbox" checked={granted.includes(action)} onChange={() => toggle(action)} />
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </label>
        ))}
      </div>
    </div>
  );
}

function PermissionMatrix({ modules, permissions, onChange }) {
  const setModuleActions = (moduleKey, actions) => {
    onChange({ ...permissions, [moduleKey]: actions });
  };

  return (
    <div className="amx-permission-list">
      {modules.map((m) => (
        <PermissionMatrixRow key={m.key} module={m} granted={permissions[m.key] || []} onChange={(actions) => setModuleActions(m.key, actions)} />
      ))}
    </div>
  );
}

export default PermissionMatrix;
