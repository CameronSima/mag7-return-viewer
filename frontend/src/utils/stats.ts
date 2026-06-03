/**
 * Format a numeric return as a signed percentage with two decimals.
 *   0.0042 -> "+0.42%"
 *  -0.013  -> "-1.30%"
 */
export function formatReturnPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

/**
 * Format a non-negative magnitude (e.g. volatility) as an unsigned percentage.
 *   0.1842 -> "18.42%"
 * No leading "+" — unlike returns, a vol is never meaningfully signed.
 */
export function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Format a dimensionless ratio (e.g. Sharpe) to two decimals.
 *   1.234 -> "1.23"
 */
export function formatRatio(value: number): string {
  return value.toFixed(2);
}

/**
 * Whether a return is non-negative. Used for coloring (green/red).
 * Treats exactly zero as "positive" for visual stability — flipping color
 * on a zero return is distracting.
 */
export function isPositive(value: number): boolean {
  return value >= 0;
}
