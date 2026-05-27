/**
 * Wire types matching the backend's API contract.
 *
 * Kept in a single file so the contract is easy to find and audit.
 * If the backend response shape changes, this is the single point of update.
 */

/** A single daily return observation for one ticker. */
export interface ReturnPoint {
  date: string; // ISO date, e.g. "2024-01-02"
  return: number; // simple daily return, e.g. 0.004 for +0.4%
}

/** Per-ticker summary statistics over the requested date range. */
export interface TickerStats {
  min: number;
  max: number;
  mean: number;
  /** Number of return observations (trading days) in the full series.
   *  Independent of chart downsampling, so it reflects true days. */
  count: number;
}

/** Complete response from GET /returns. */
export interface ReturnsResponse {
  returns: Record<string, ReturnPoint[]>;
  stats: Record<string, TickerStats>;
}

/** The MAG7 ticker symbols, in display order. */
export const MAG7_TICKERS = [
  "MSFT",
  "AAPL",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
] as const;

export type Ticker = (typeof MAG7_TICKERS)[number];
