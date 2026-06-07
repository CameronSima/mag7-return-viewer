/** Quick-set ticker presets for compare mode, shared by the controls bar and
 *  the command palette. */
export const PRESETS: { label: string; tickers: string[] }[] = [
  { label: "MAG7", tickers: ["MSFT", "AAPL", "GOOGL", "AMZN", "NVDA", "META", "TSLA"] },
  {
    label: "MAG7 vs S&P 500",
    tickers: ["MSFT", "AAPL", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "SPY"],
  },
  { label: "Index battle", tickers: ["SPY", "QQQ", "DIA", "IWM"] },
];

/** Quick date-range options (years back from today), used in the palette. */
export const RANGE_PRESETS: { label: string; years: number }[] = [
  { label: "Last 1 year", years: 1 },
  { label: "Last 3 years", years: 3 },
  { label: "Last 5 years", years: 5 },
  { label: "Last 10 years", years: 10 },
];
