/**
 * A categorical color palette for the comparison chart — one stable color per
 * ticker line, reused by the legend dots in the table so the eye can link a row
 * to its curve. Chosen for distinguishability on the dark theme; capped at the
 * backend's MAX_COMPARE_TICKERS (10).
 */
export const SERIES_COLORS = [
  "#7c9eff", // blue
  "#ffb74d", // amber
  "#4caf50", // green
  "#ef5350", // red
  "#ba68c8", // purple
  "#4dd0e1", // cyan
  "#f06292", // pink
  "#aed581", // lime
  "#fff176", // yellow
  "#a1887f", // brown
] as const;

/** Stable color for the i-th series, wrapping if there are somehow more than
 *  the palette length. */
export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}
