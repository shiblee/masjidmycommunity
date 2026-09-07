// 0, 12, 1.2K, 15.8K, 1.2M — used for like counts everywhere so a popular
// masjid's number stays a lightweight inline indicator, not a wide numeral.
export function formatCompactNumber(n) {
  const value = Number(n) || 0;
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${trimTrailingZero(value / 1000)}K`;
  return `${trimTrailingZero(value / 1_000_000)}M`;
}

function trimTrailingZero(n) {
  return n.toFixed(1).replace(/\.0$/, "");
}

export default formatCompactNumber;
