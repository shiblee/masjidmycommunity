import Bank from "../models/Bank.js";

// Must match the format check in masjidController.js's donation-account
// validation — kept as its own copy here rather than a shared import to
// avoid a circular dependency between the controller and this service.
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const IFSC_LOOKUP_BASE = "https://ifsc.razorpay.com";

// Razorpay hosts a free, unauthenticated mirror of the RBI's IFSC database —
// used only to confirm a code is real and pull its branch/address; nothing
// about the masjid or its donors is ever sent to it, just the IFSC itself.
async function lookupIfsc(ifsc) {
  const res = await fetch(`${IFSC_LOOKUP_BASE}/${ifsc}`, { signal: AbortSignal.timeout(6000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`IFSC lookup failed: ${res.status}`);
  return res.json();
}

const STOPWORDS = new Set(["bank", "ltd", "limited", "the", "co", "cooperative", "and", "of"]);

function significantTokens(name) {
  return new Set(
    (name || "")
      .toUpperCase()
      .replace(/[^A-Z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w.toLowerCase()))
  );
}

// The RBI-registered name Razorpay returns for an IFSC ("HDFC Bank Ltd") is
// rarely byte-identical to our own admin-entered master data ("HDFC Bank"),
// so this compares significant word tokens instead of the raw strings.
function bankNameMatches(ourName, lookedUpName) {
  const ours = significantTokens(ourName);
  const theirs = significantTokens(lookedUpName);
  if (!ours.size || !theirs.size) return false;
  for (const token of ours) {
    if (theirs.has(token)) return true;
  }
  return false;
}

// Single source of truth for "is this IFSC valid, real, and actually this
// bank's" — used both by the live-check endpoint the donation-account form
// calls as the owner types, and by upsertDonationAccount itself at save
// time, so a save can never succeed with a value the live check would have
// rejected (or one that skipped the live check entirely).
export async function verifyIfscForBank({ ifsc, bankId }) {
  const trimmedIfsc = ifsc?.trim().toUpperCase();
  if (!IFSC_RE.test(trimmedIfsc || "")) {
    return { ok: false, field: "ifscCode", message: "Enter a valid 11-character IFSC, for example HDFC0001234." };
  }
  if (!bankId) {
    return { ok: false, field: "bankId", message: "Select a bank first." };
  }
  const bank = await Bank.findByPk(bankId);
  if (!bank || !bank.isActive) {
    return { ok: false, field: "bankId", message: "Select a valid bank from the list." };
  }

  let lookup;
  try {
    lookup = await lookupIfsc(trimmedIfsc);
  } catch {
    return { ok: false, field: "ifscCode", message: "Couldn't verify this IFSC right now. Please try again in a moment." };
  }
  if (!lookup) {
    return { ok: false, field: "ifscCode", message: "This IFSC code wasn't found. Double-check it and try again." };
  }
  if (!bankNameMatches(bank.name, lookup.BANK)) {
    return { ok: false, field: "ifscCode", message: `This IFSC belongs to ${lookup.BANK}, not ${bank.name}. Choose the matching bank or correct the code.` };
  }

  return {
    ok: true,
    details: {
      ifscCode: trimmedIfsc,
      bankId: bank.id,
      bankName: bank.name,
      branchName: lookup.BRANCH || null,
      address: lookup.ADDRESS || null,
      city: lookup.CITY || null,
      state: lookup.STATE || null,
    },
  };
}
