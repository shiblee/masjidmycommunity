import ProfileChangeLog from "../models/ProfileChangeLog.js";

// Best-effort audit trail for profile edits — never let a logging failure
// break the actual save that triggered it, so every call site should chain
// `.catch(() => {})` the same way recordNewUserActivity(...) does elsewhere.
//
// action:"update"  -> one row per changed field in `fields`, skipping any
//                     pair where oldValue === newValue (a no-op partial
//                     update writes nothing).
// action:"create"/"delete" -> one row with field:null and a full JSON
//                     snapshot of the entity in newValue/oldValue respectively.
export async function recordProfileChange({ userId, section, action, entityId = null, actor, fields = [], snapshot = null }) {
  const base = {
    userId,
    section,
    action,
    entityId,
    actorType: actor.type,
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
    if (rows.length) await ProfileChangeLog.bulkCreate(rows);
    return;
  }

  await ProfileChangeLog.create({
    ...base,
    field: null,
    oldValue: action === "delete" ? JSON.stringify(snapshot) : null,
    newValue: action === "create" ? JSON.stringify(snapshot) : null,
  });
}
