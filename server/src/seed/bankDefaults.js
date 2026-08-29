import Bank from "../models/Bank.js";

const DEFAULTS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Kotak Mahindra Bank",
  "IDBI Bank",
  "IndusInd Bank",
  "Yes Bank",
  "Federal Bank",
  "Indian Bank",
  "Bank of India",
  "Central Bank of India",
  "UCO Bank",
  "IDFC FIRST Bank",
  "Bandhan Bank",
  "RBL Bank",
  "South Indian Bank",
  "Karnataka Bank",
  "Jammu & Kashmir Bank",
  "Punjab & Sind Bank",
  "Other",
];

export async function ensureBankDefaults() {
  const count = await Bank.count();
  if (count === 0) {
    await Promise.all(DEFAULTS.map((name, i) => Bank.create({ name, sortOrder: i })));
  }
}
