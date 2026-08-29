const IFSC_API = "https://ifsc.razorpay.com";

/**
 * Resolves an 11-character IFSC into its bank/branch details via Razorpay's
 * free, public, no-auth IFSC directory. Returns null on any failure (bad
 * code, network error, service down) so the caller can fall back to letting
 * the user fill Bank/Branch in manually — same "never block on a third
 * party" philosophy as the address autocomplete.
 */
export async function lookupIfsc(code, signal) {
  try {
    const response = await fetch(`${IFSC_API}/${code}`, { signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data?.BANK) return null;
    return {
      bank: data.BANK,
      branch: data.BRANCH || "",
      city: data.CITY || "",
      state: data.STATE || "",
    };
  } catch {
    return null;
  }
}
