/**
 * A categorical color palette for the comparison chart — one stable color per
 * ticker line, reused by the legend dots in the table so the eye can link a row
 * to its curve. Chosen for distinguishability on the dark theme; capped at the
 * backend's MAX_COMPARE_TICKERS (10).
 */
export const SERIES_COLORS = [
  "#5e6ad2", // indigo (Linear accent)
  "#4cb782", // green
  "#e5a663", // amber
  "#eb5757", // red
  "#8b5cf6", // violet
  "#4dd0e1", // cyan
  "#ec6cb9", // pink
  "#a9c46c", // lime
  "#d4b85a", // gold
  "#9b8d7d", // taupe
] as const;

/** Stable color for the i-th series, wrapping if there are somehow more than
 *  the palette length. */
export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}
