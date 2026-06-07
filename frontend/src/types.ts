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

/** Common benchmark symbols offered as quick suggestions in the ticker input. */
export const BENCHMARK_TICKERS = ["SPY", "QQQ", "DIA", "IWM"] as const;

/** Max tickers comparable at once. Mirrors the backend's MAX_COMPARE_TICKERS. */
export const MAX_COMPARE_TICKERS = 10;

// --- /compare contract (mirrors backend app/models.py) ----------------------

/** One point on a normalized growth curve. `value` is the growth of $1
 *  invested at the common start date (1.0 on day one). */
export interface GrowthPoint {
  date: string; // ISO date
  value: number; // growth multiple, e.g. 1.23 == +23%
}

/** Per-ticker risk/return statistics over the common window. All values are
 *  fractions (0.18 == +18%); annualized figures use the 252-day convention. */
export interface CompareStats {
  total_return: number;
  cagr: number;
  annual_vol: number;
  sharpe: number;
  max_drawdown: number;
  best: number;
  worst: number;
  count: number;
}

/** Daily-return correlation matrix. `matrix[i][j]` is corr(tickers[i], tickers[j]). */
export interface CorrelationMatrix {
  tickers: string[];
  matrix: number[][];
}

/** The effective comparison window — the overlap of the requested tickers'
 *  histories. `start`/`end` are null only when there is no overlap. */
export interface CompareWindow {
  start: string | null;
  end: string | null;
  trading_days: number;
}

/** Complete response from GET /compare. */
export interface CompareResponse {
  growth: Record<string, GrowthPoint[]>;
  stats: Record<string, CompareStats>;
  correlation: CorrelationMatrix;
  window: CompareWindow;
  /** Requested tickers the upstream had no data for (e.g. a typo). */
  missing: string[];
}

// --- /portfolio contract (mirrors backend app/models.py) --------------------

/** How often the portfolio is rebalanced back to its target weights. */
export type RebalanceFreq = "none" | "monthly" | "quarterly" | "annually";

export const REBALANCE_OPTIONS: { value: RebalanceFreq; label: string }[] = [
  { value: "none", label: "Buy & hold" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annually", label: "Annually" },
];

/** A target holding the user defines: a ticker and its (pre-normalized) weight. */
export interface HoldingInput {
  ticker: string;
  weight: number;
}

/** A portfolio constituent in the response: normalized weight, total return,
 *  and share of portfolio risk (percent contribution to volatility, summing to
 *  1 across holdings — can differ from weight). */
export interface Holding {
  ticker: string;
  weight: number;
  total_return: number;
  risk_contribution: number;
}

/** One calendar year's return for each series, keyed by series name. `partial`
 *  flags a first/last year the window doesn't fully span. */
export interface AnnualReturn {
  year: number;
  partial: boolean;
  returns: Record<string, number>;
}

/** Portfolio metrics measured relative to the benchmark. Present only when a
 *  benchmark is set and there's enough overlapping history. */
export interface BenchmarkMetrics {
  benchmark: string;
  beta: number;
  alpha: number; // annualized fraction
  r_squared: number; // 0..1
  tracking_error: number; // annualized fraction
  information_ratio: number;
  correlation: number;
}

/** Complete response from GET /portfolio. `growth`/`stats` are keyed by
 *  "Portfolio" and (if given) the benchmark symbol, so the same chart/table
 *  components render them. */
export interface PortfolioResponse {
  growth: Record<string, GrowthPoint[]>;
  stats: Record<string, CompareStats>;
  correlation: CorrelationMatrix;
  window: CompareWindow;
  holdings: Holding[];
  annual: AnnualReturn[];
  benchmark: string | null;
  benchmark_metrics: BenchmarkMetrics | null;
  missing: string[];
}

/** The series key the backend uses for the simulated portfolio. */
export const PORTFOLIO_KEY = "Portfolio";
