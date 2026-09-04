import React, { useEffect, useState } from "react";
import Icon from "../../components/Icons.jsx";
import Pagination from "../../components/Pagination.jsx";
import adminApi from "../../services/adminApi.js";
import { formatDateTime } from "../../../utils/formatDateTime.js";
import { META_ENTITY_LABELS } from "./entityLabels.js";

const PAGE_SIZE = 50;

const FIELD_LABEL = {
  name: "Name",
  isActive: "Status",
  isDefault: "Default Language",
  sortOrder: "Sort Order",
  icon: "Icon",
  nativeName: "Native Name",
  direction: "Text Direction",
};

function describe(entry) {
  if (entry.action === "create") return "Added";
  if (entry.action === "delete") return "Removed";
  return FIELD_LABEL[entry.field] || entry.field;
}

function valueText(entry, v) {
  if (v === null || v === undefined || v === "") return "—";
  if (entry.field === "isActive") return v === "true" ? "Active" : "Inactive";
  try {
    const parsed = JSON.parse(v);
    if (parsed && typeof parsed === "object") return parsed.name || "Entry";
  } catch {
    // plain scalar value, not JSON
  }
  return String(v).length > 60 ? `${String(v).slice(0, 60)}…` : String(v);
}

function MetaChangeLogPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    adminApi
      .get("/meta-change-log", { params: { page, ...(entityType !== "all" ? { entityType } : {}) } })
      .then(({ data }) => {
        setEntries(data.entries);
        setTotalPages(data.totalPages);
        setTotalItems(data.total);
      })
      .catch((err) => setError(err.response?.data?.message || "Couldn't load the change log."))
      .finally(() => setLoading(false));
  }, [page, entityType]);

  useEffect(() => setPage(1), [entityType]);

  return (
    <>
      <div className="amx-panel-head">
        <div>
          <h3>Meta Change Log</h3>
          <div className="amx-panel-sub">Every add, edit, activate/deactivate, and delete made across the Meta module, newest first</div>
        </div>
      </div>

      <div className="amx-filters">
        <select className="amx-select" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="all">All Meta sections</option>
          {Object.entries(META_ENTITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="amx-form-error" style={{ margin: "0 0 16px" }}>
          <Icon name="info" size={17} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="amx-empty">
          <Icon name="activity" />
          <strong>Loading change log…</strong>
        </div>
      ) : entries.length === 0 ? (
        <div className="amx-empty">
          <Icon name="activity" />
          <strong>No changes recorded yet</strong>
          <span>Edits made across the Meta module will show up here.</span>
        </div>
      ) : (
        <div className="amx-table-wrap">
          <table className="amx-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Section</th>
                <th>Entry</th>
                <th>Change</th>
                <th>Previous Value</th>
                <th>New Value</th>
                <th>Changed By</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{formatDateTime(e.createdAt)}</td>
                  <td>{META_ENTITY_LABELS[e.entityType] || e.entityType}</td>
                  <td><strong>{e.entityName || "—"}</strong></td>
                  <td>{describe(e)}</td>
                  <td>{valueText(e, e.oldValue)}</td>
                  <td>{valueText(e, e.newValue)}</td>
                  <td>{e.actorName || "Admin"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} onChange={setPage} />
    </>
  );
}

export default MetaChangeLogPanel;
