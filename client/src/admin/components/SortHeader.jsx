import React from "react";
import Icon from "./Icons.jsx";

// A clickable <th> for sortable admin tables — shared by any table that
// offers per-column sorting, so the interaction and indicator stay
// consistent across the admin panel.
function SortHeader({ label, sortKey, activeKey, direction, onSort }) {
  const active = activeKey === sortKey;
  return (
    <th>
      <button className="amx-th-sort" onClick={() => onSort(sortKey)}>
        {label}
        {active && (
          <span style={{ display: "inline-flex", transform: direction === "asc" ? "rotate(180deg)" : undefined }}>
            <Icon name="chevronDown" size={11} />
          </span>
        )}
      </button>
    </th>
  );
}

export default SortHeader;
