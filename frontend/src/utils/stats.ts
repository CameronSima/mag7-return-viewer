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
