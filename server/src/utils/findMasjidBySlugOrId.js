import { Op } from "sequelize";
import Masjid from "../models/Masjid.js";

// Public masjid URLs moved from numeric id (/masjid/1) to a name-based slug
// (/masjid/some-masjid-name) — this keeps every already-shared/indexed
// numeric-id link resolving correctly (a slug is never purely numeric, so
// there's no ambiguity), while every new link is slug-based.
export function findPublicMasjidByParam(param, extraWhere = {}) {
  const isNumeric = /^\d+$/.test(param);
  return Masjid.findOne({
    where: {
      ...extraWhere,
      [Op.or]: isNumeric ? [{ slug: param }, { id: Number(param) }] : [{ slug: param }],
    },
  });
}
