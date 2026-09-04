import MetaChangeLog from "../models/MetaChangeLog.js";
import AdminUser from "../models/AdminUser.js";

// Best-effort audit trail for Meta module edits — never let a logging
// failure break the actual save that triggered it, so every call site
// should chain `.catch(() => {})` the same way recordProfileChange(...)
// does for user-profile edits.
//
// action:"update"  -> one row per changed field in `fields`, skipping any
//                     pair where oldValue === newValue (a no-op partial
//                     update writes nothing).
// action:"create"/"delete" -> one row with field:null and a full JSON
//                     snapshot of the entity in newValue/oldValue respectively.
export async function recordMetaChange({ entityType, entityId, entityName, action, actor, fields = [], snapshot = null }) {
  const base = {
    entityType,
    entityId,
    entityName,
    action,
    actorId: actor.id,
    actorName: actor.name || null,
  };

  if (action === "update") {
    const rows = fields
      .filter(({ oldValue, newValue }) => String(oldValue ?? "") !== String(newValue ?? ""))
      .map(({ field, oldValue, newValue }) => ({
        ...base,
        field,
        oldValue: oldValue === null || oldValue === undefined ? null : String(oldValue),
        newValue: newValue === null || newValue === undefined ? null : String(newValue),
      }));
    if (rows.length) await MetaChangeLog.bulkCreate(rows);
    return;
  }

  await MetaChangeLog.create({
    ...base,
    field: null,
    oldValue: action === "delete" ? JSON.stringify(snapshot) : null,
    newValue: action === "create" ? JSON.stringify(snapshot) : null,
  });
}

// Shared admin-identity lookup — every Meta controller needs the same
// {id, name} shape for the `actor` passed into recordMetaChange above.
export async function metaActorFrom(req) {
  const admin = await AdminUser.findByPk(req.user.id, { attributes: ["name"] });
  return { id: req.user.id, name: admin?.name || null };
}
