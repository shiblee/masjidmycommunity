import MaritalStatus from "../models/MaritalStatus.js";

export async function isValidMaritalStatusValue(value) {
  if (!value) return true;
  const row = await MaritalStatus.findOne({ where: { name: value, isActive: true } });
  return !!row;
}
