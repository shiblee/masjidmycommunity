import MasjidCorrectionRequest from "../models/MasjidCorrectionRequest.js";
import MasjidCorrectionField from "../models/MasjidCorrectionField.js";
import Masjid from "../models/Masjid.js";
import User from "../models/User.js";
import { metaActorFrom } from "../utils/metaChangeLog.js";

/** Rolls a request's fields up into one status: any field still pending wins
 * (there's more review to do); once every field is decided, uniformly
 * rejected -> "rejected", uniformly approved/modified_approved -> "approved",
 * a mix of the two -> "partially_approved". */
function computeRequestStatus(fields) {
  if (fields.some((f) => f.status === "pending")) return "pending";
  const approvedCount = fields.filter((f) => f.status === "approved" || f.status === "modified_approved").length;
  const rejectedCount = fields.filter((f) => f.status === "rejected").length;
  if (approvedCount > 0 && rejectedCount > 0) return "partially_approved";
  return rejectedCount === fields.length ? "rejected" : "approved";
}

export const list = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.masjidId) where.masjidId = req.query.masjidId;

    const requests = await MasjidCorrectionRequest.findAll({ where, order: [["createdAt", "DESC"]] });
    const masjidIds = [...new Set(requests.map((r) => r.masjidId))];
    const userIds = [...new Set(requests.map((r) => r.userId))];
    const requestIds = requests.map((r) => r.id);
    const [masjids, users, fields] = await Promise.all([
      Masjid.findAll({ where: { id: masjidIds }, attributes: ["id", "name"] }),
      User.findAll({ where: { id: userIds }, attributes: ["id", "fullName", "username"] }),
      MasjidCorrectionField.findAll({ where: { requestId: requestIds }, attributes: ["id", "requestId", "fieldKey", "status"] }),
    ]);
    const masjidById = new Map(masjids.map((m) => [m.id, m]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const fieldsByRequest = new Map();
    fields.forEach((f) => {
      const list = fieldsByRequest.get(f.requestId) || [];
      list.push(f);
      fieldsByRequest.set(f.requestId, list);
    });

    res.json({
      requests: requests.map((r) => ({
        ...r.toJSON(),
        masjid: masjidById.get(r.masjidId) ? { id: r.masjidId, name: masjidById.get(r.masjidId).name } : null,
        submitter: userById.get(r.userId) ? { fullName: userById.get(r.userId).fullName, username: userById.get(r.userId).username } : null,
        fieldCount: (fieldsByRequest.get(r.id) || []).length,
        fieldKeys: (fieldsByRequest.get(r.id) || []).map((f) => f.fieldKey),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOne = async (req, res) => {
  try {
    const request = await MasjidCorrectionRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ message: "Correction request not found." });

    const [masjid, submitter, fields] = await Promise.all([
      Masjid.findByPk(request.masjidId, { attributes: ["id", "name"] }),
      User.findByPk(request.userId, { attributes: ["id", "fullName", "username"] }),
      MasjidCorrectionField.findAll({ where: { requestId: request.id }, order: [["sortOrder", "ASC"]] }),
    ]);

    res.json({
      request: {
        ...request.toJSON(),
        masjid: masjid ? { id: masjid.id, name: masjid.name } : null,
        submitter: submitter ? { fullName: submitter.fullName, username: submitter.username } : null,
        fields,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const actOnField = async (req, res) => {
  try {
    const { action, finalValue } = req.body;
    if (!["approve", "reject", "edit_approve"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'approve', 'reject', or 'edit_approve'." });
    }
    const field = await MasjidCorrectionField.findOne({ where: { id: req.params.fieldId, requestId: req.params.requestId } });
    if (!field) return res.status(404).json({ message: "Correction field not found." });

    if (action === "edit_approve" && (finalValue === undefined || finalValue === null)) {
      return res.status(400).json({ message: "A final value is required for 'Edit & Approve'." });
    }

    const actor = await metaActorFrom(req);
    field.status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "modified_approved";
    field.finalValue = action === "reject" ? null : action === "edit_approve" ? finalValue : field.suggestedValue;
    field.decidedByAdminName = actor.name || "Admin";
    field.decidedAt = new Date();
    await field.save();

    const siblingFields = await MasjidCorrectionField.findAll({ where: { requestId: field.requestId }, attributes: ["status"] });
    const request = await MasjidCorrectionRequest.findByPk(field.requestId);
    request.status = computeRequestStatus(siblingFields);
    await request.save();

    res.json({ field, requestStatus: request.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
