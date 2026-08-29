// UPI handles follow NPCI's addressing scheme: an identifier, "@", then the
// payment provider's handle (e.g. name@okhdfcbank, 9876543210@paytm).
const UPI_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9.\-_]{1,63}$/;
// RBI format: 4-letter bank code, a reserved "0", then a 6-character branch code.
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;
// A bank-registered holder name: letters, spaces, and the punctuation banks
// commonly allow (apostrophes, hyphens, periods) — not digits or symbols.
const NAME_RE = /^[A-Za-z][A-Za-z.'\- ]{1,99}$/;

export function validateHolderName(value) {
  const name = value?.trim();
  if (!name) return "";
  if (!NAME_RE.test(name)) return "Enter a valid name — letters, spaces, and basic punctuation only.";
  return "";
}

export function validateUpiId(value) {
  const upi = value?.trim();
  if (!upi) return "";
  if (!upi.includes("@")) return "A UPI ID must include '@' — for example name@okhdfcbank.";
  if (upi.split("@").length > 2) return "A UPI ID can only contain one '@'.";
  if (!UPI_RE.test(upi)) return "Enter a valid UPI ID, for example name@okhdfcbank or 9876543210@paytm.";
  return "";
}

export function validateIfsc(value) {
  const ifsc = value?.trim().toUpperCase();
  if (!ifsc) return "";
  if (!IFSC_RE.test(ifsc)) return "Enter a valid 11-character IFSC, for example HDFC0001234.";
  return "";
}

export function validateAccountNumber(value) {
  const account = value?.trim();
  if (!account) return "";
  if (!ACCOUNT_RE.test(account)) return "Account number must be 9–18 digits.";
  return "";
}

/** Returns a map of field name to error message; empty when the form is valid. */
export function validateDonationAccount(donation) {
  const errors = {};

  const upiError = validateUpiId(donation.upiId);
  if (upiError) errors.upiId = upiError;
  if (donation.upiId?.trim() && !donation.upiAccountHolder?.trim()) {
    errors.upiAccountHolder = "Add the name registered against this UPI ID.";
  } else {
    const upiHolderError = validateHolderName(donation.upiAccountHolder);
    if (upiHolderError) errors.upiAccountHolder = upiHolderError;
  }

  const accountError = validateAccountNumber(donation.accountNumber);
  if (accountError) errors.accountNumber = accountError;

  const ifscError = validateIfsc(donation.ifscCode);
  if (ifscError) errors.ifscCode = ifscError;

  if (donation.accountNumber?.trim()) {
    if (!donation.ifscCode?.trim()) errors.ifscCode = "IFSC is required with a bank account number.";
    if (!donation.accountHolderName?.trim()) {
      errors.accountHolderName = "Add the account holder's name.";
    } else {
      const holderError = validateHolderName(donation.accountHolderName);
      if (holderError) errors.accountHolderName = holderError;
    }
    if (!donation.bankName?.trim()) errors.bankName = "Add the bank's name.";
  }

  return errors;
}
