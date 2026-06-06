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
 * Whether a return is non-negative. Used for coloring (green/red).
 * Treats exactly zero as "positive" for visual stability — flipping color
 * on a zero return is distracting.
 */
export function isPositive(value: number): boolean {
  return value >= 0;
}

/**
 * Format a fraction as an unsigned percentage with one decimal.
 *   0.284 -> "28.4%"   (used for volatility, which has no meaningful sign)
 */
export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format a plain number (e.g. a Sharpe ratio) with two decimals.
 */
export function formatNumber(value: number): string {
  return value.toFixed(2);
}
