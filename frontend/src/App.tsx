import { useMemo, useState } from "react";
import { format, subYears } from "date-fns";
import { Share2, TriangleAlert } from "lucide-react";
import { DateRangePicker } from "./components/DateRangePicker";
import { TickerInput } from "./components/TickerInput";
import { GrowthChart } from "./components/GrowthChart";
import { ComparisonTable } from "./components/ComparisonTable";
import { CorrelationHeatmap } from "./components/CorrelationHeatmap";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Alert, AlertDescription } from "./components/ui/alert";
import { useComparison } from "./hooks/useComparison";
import { useUrlState } from "./hooks/useUrlState";
import { ApiError } from "./api/client";
import { MAX_COMPARE_TICKERS } from "./types";

// Sensible defaults so a bare visit (no URL params) shows something compelling
// immediately: the leaders against the S&P 500 over the last five years.
const DEFAULT_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "SPY"];
const DEFAULT_START = format(subYears(new Date(), 5), "yyyy-MM-dd");
const DEFAULT_END = format(new Date(), "yyyy-MM-dd");

// Quick-set presets offered above the ticker input.
const PRESETS: { label: string; tickers: string[] }[] = [
  { label: "MAG7", tickers: ["MSFT", "AAPL", "GOOGL", "AMZN", "NVDA", "META", "TSLA"] },
  { label: "MAG7 vs S&P 500", tickers: ["MSFT", "AAPL", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "SPY"] },
  { label: "Index battle", tickers: ["SPY", "QQQ", "DIA", "IWM"] },
];

/**
 * Root view for the comparison engine. Holds the shared state (tickers + date
 * range) in the URL so every view is a shareable link, feeds it to the data
 * hook, and routes to loading / error / results.
 */
export default function App() {
  const [state, setState] = useUrlState({
    tickers: DEFAULT_TICKERS,
    start: DEFAULT_START,
    end: DEFAULT_END,
  });
  const [copied, setCopied] = useState(false);

  const query = useComparison(state.tickers, state.start, state.end);

  // Validation errors are the user's input, not a transient failure — no retry.
  const showRetry =
    query.error instanceof ApiError && query.error.status !== 422;

  // Chart/table series in the user's chosen ticker order (only those with data).
  const series = useMemo(() => {
    if (!query.data) return [];
    return state.tickers
      .filter((t) => query.data.growth[t])
      .map((ticker) => ({ ticker, points: query.data.growth[ticker] }));
  }, [query.data, state.tickers]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); silently ignore.
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <Badge variant="accent" className="mb-3">
          Free · no sign-up
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Stock Comparison
        </h1>
        <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
          Compare the long-run performance of any stocks or ETFs — growth, risk,
          and correlation, side by side. Every view is a shareable link.
        </p>
      </header>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/40 p-4">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant="secondary"
              onClick={() => setState({ ...state, tickers: preset.tickers })}>
              {preset.label}
            </Button>
          ))}
        </div>

        <TickerInput
          value={state.tickers}
          onChange={(tickers) => setState({ ...state, tickers })}
          max={MAX_COMPARE_TICKERS}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <DateRangePicker
            start={state.start}
            end={state.end}
            onChange={(start, end) => setState({ ...state, start, end })}
          />
          <Button variant="outline" onClick={handleShare}>
            <Share2 />
            {copied ? "Copied!" : "Share link"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {state.tickers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add at least one ticker to begin.
          </p>
        ) : !state.start || !state.end ? (
          <p className="text-sm text-muted-foreground">
            Select a start and end date to load the comparison.
          </p>
        ) : query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState
            error={query.error}
            onRetry={showRetry ? () => query.refetch() : undefined}
          />
        ) : query.data ? (
          <div className="flex flex-col gap-5">
            {query.data.missing.length > 0 && (
              <Alert variant="warning">
                <TriangleAlert />
                <AlertDescription>
                  No data for: {query.data.missing.join(", ")}. Check the
                  symbol(s) — they may be misspelled or unavailable.
                </AlertDescription>
              </Alert>
            )}
            {query.data.window.start && (
              <p className="text-sm text-muted-foreground">
                Common window: {query.data.window.start} →{" "}
                {query.data.window.end} · {query.data.window.trading_days}{" "}
                trading days. Tickers are compared over the dates they all share.
              </p>
            )}
            <GrowthChart series={series} />
            <ComparisonTable data={query.data} tickers={state.tickers} />
            {query.data.correlation.tickers.length >= 2 && (
              <CorrelationHeatmap correlation={query.data.correlation} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
