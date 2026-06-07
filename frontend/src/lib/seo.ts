/**
 * Pure SEO helpers — page titles, meta descriptions, and URL slugs derived from
 * the app's state. Intentionally dependency-free (defines its own minimal input
 * shape rather than importing AppState) so it can be used identically by the
 * runtime <head> manager (useDocumentMeta) and the build-time pre-render
 * generator that runs under Node.
 */

/** The slice of app state that affects SEO metadata. */
export interface SeoInput {
  mode: "compare" | "portfolio";
  tickers: string[];
  holdings: { ticker: string }[];
  benchmark: string | null;
}

export interface PageMeta {
  title: string;
  description: string;
}

export const SITE_NAME = "Stock Comparison";
export const SITE_TAGLINE = "Free stock & ETF comparison and portfolio backtester";

/** Public base URL for absolute canonicals/sitemap. Override at build time with
 *  VITE_SITE_URL — a correct absolute canonical matters in production. */
export const DEFAULT_SITE_URL = "https://stock-comparison.example.com";

/** "A, B and C" — a readable inline list for prose meta descriptions. */
function humanList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The default (homepage / no-selection) metadata. */
export function defaultMeta(): PageMeta {
  return {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      "Compare any stocks or ETFs, or backtest a weighted portfolio — growth, " +
      "risk, correlation, and calendar-year returns, side by side. Total return " +
      "with dividends reinvested. Free, no sign-up.",
  };
}

/** Title + description for the current selection. Targets the long-tail: a
 *  compare view reads "AAPL vs MSFT — total return comparison". */
export function metaForState(state: SeoInput): PageMeta {
  if (state.mode === "portfolio") {
    const names = state.holdings.map((h) => h.ticker);
    if (names.length === 0) return defaultMeta();
    const bench = state.benchmark ? ` vs. ${state.benchmark}` : "";
    return {
      title: `${humanList(names)} portfolio backtest${bench} | ${SITE_NAME}`,
      description:
        `Backtest a ${names.join("/")} portfolio${bench}: growth, risk-adjusted ` +
        "return, rebalancing, calendar-year returns, and per-holding risk. " +
        "Free, no sign-up.",
    };
  }

  const names = state.tickers;
  if (names.length === 0) return defaultMeta();
  return {
    title: `${names.join(" vs ")} — total return comparison | ${SITE_NAME}`,
    description:
      `Compare ${humanList(names)}: growth of $1, CAGR, volatility, Sharpe, max ` +
      "drawdown, and return correlation — side by side, total return with " +
      "dividends. Free, no sign-up.",
  };
}

// --- pretty URLs for the pre-rendered landing pages --------------------------

/** "AAPL", "MSFT" -> "aapl-vs-msft". The "-vs-" separator survives tickers that
 *  themselves contain a hyphen (BRK-B). */
export function compareSlug(tickers: string[]): string {
  return tickers.map((t) => t.toLowerCase()).join("-vs-");
}

export function comparePath(tickers: string[]): string {
  return `/compare/${compareSlug(tickers)}/`;
}

/** Visible H1 for a pre-rendered comparison page. */
export function compareHeadline(tickers: string[]): string {
  return `${tickers.join(" vs ")} — total return comparison`;
}

/**
 * Curated high-value comparisons to statically pre-render at build time — the
 * seed of the programmatic-SEO long tail. Expanding this list is the only thing
 * between here and thousands of indexable pages (top-N pairwise, more ETF
 * trios, named portfolios). Each entry must have at least two tickers.
 */
export const SEED_COMPARISONS: string[][] = [
  ["VOO", "VTI"],
  ["VOO", "VTI", "SPY"],
  ["VTI", "VXUS"],
  ["VOO", "QQQ"],
  ["QQQ", "SPY"],
  ["SCHD", "VOO"],
  ["VUG", "VTV"],
  ["SPY", "QQQ", "DIA", "IWM"],
  ["AAPL", "MSFT"],
  ["NVDA", "AMD"],
  ["TSLA", "NVDA"],
  ["AAPL", "MSFT", "GOOGL", "AMZN"],
  ["MSFT", "AAPL", "GOOGL", "AMZN", "NVDA", "META", "TSLA"],
  ["BRK-B", "SPY"],
];

/** Inverse of compareSlug, for the SPA bootstrap on a pre-rendered page. */
export function tickersFromSlug(slug: string): string[] {
  return slug
    .split("-vs-")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}
