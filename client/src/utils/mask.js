// Mirrors server/src/utils/mask.js's maskMobile convention — show only the
// last 4 characters of a sensitive document number, mask the rest. This is
// a display-only convenience (the owner already knows the number they
// typed); it never changes what's actually stored or sent to the server.
export function maskDocumentNumber(value) {
  if (!value) return value;
  const clean = String(value);
  return clean.length <= 4 ? clean : `${"*".repeat(clean.length - 4)}${clean.slice(-4)}`;
}
