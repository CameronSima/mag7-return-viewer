import { useEffect, useState } from "react";
import { format, subYears } from "date-fns";
import { Command, Share2 } from "lucide-react";
import { DateRangePicker } from "./components/DateRangePicker";
import { TickerInput } from "./components/TickerInput";
import { PortfolioBuilder } from "./components/PortfolioBuilder";
import { CompareResults } from "./components/CompareResults";
import { PortfolioResults } from "./components/PortfolioResults";
import { CommandPalette } from "./components/CommandPalette";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import { useComparison } from "./hooks/useComparison";
import { usePortfolio } from "./hooks/usePortfolio";
import { useUrlState, type AppMode } from "./hooks/useUrlState";
import { ApiError } from "./api/client";
import { PRESETS } from "./lib/presets";
import { MAX_COMPARE_TICKERS } from "./types";

// Defaults so a bare visit shows something compelling immediately.
const DEFAULT_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "SPY"];
const DEFAULT_HOLDINGS = [
  { ticker: "AAPL", weight: 0.4 },
  { ticker: "MSFT", weight: 0.3 },
  { ticker: "NVDA", weight: 0.3 },
];
const DEFAULT_START = format(subYears(new Date(), 5), "yyyy-MM-dd");
const DEFAULT_END = format(new Date(), "yyyy-MM-dd");

/**
 * Root view. Holds the shared state (mode, tickers/holdings, date range) in the
 * URL so every view is a shareable link, feeds the active mode's data hook, and
 * routes to loading / error / results.
 */
export default function App() {
  const [state, setState] = useUrlState({
    mode: "compare",
    tickers: DEFAULT_TICKERS,
    holdings: DEFAULT_HOLDINGS,
    rebalance: "none",
    benchmark: "SPY",
    start: DEFAULT_START,
    end: DEFAULT_END,
  });
  const [copied, setCopied] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K toggles the command palette from anywhere.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isCompare = state.mode === "compare";

  // Both hooks run (rules of hooks); the inactive one is disabled by an empty
  // tickers/holdings list, so only the active mode fetches.
  const compareQuery = useComparison(
    isCompare ? state.tickers : [],
    state.start,
    state.end,
  );
  const portfolioQuery = usePortfolio(
    isCompare ? [] : state.holdings,
    state.start,
    state.end,
    state.rebalance,
    state.benchmark,
  );
  const query = isCompare ? compareQuery : portfolioQuery;

  const showRetry =
    query.error instanceof ApiError && query.error.status !== 422;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); silently ignore.
    }
  };

  const hasInputs = isCompare
    ? state.tickers.length > 0
    : state.holdings.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Badge variant="accent" className="mb-3">
            Free · no sign-up
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Stock Comparison
          </h1>
          <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
            Compare any stocks or ETFs, or backtest a weighted portfolio —
            growth, risk, and correlation, side by side. Every view is a
            shareable link.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPaletteOpen(true)}
          className="shrink-0 gap-2 text-muted-foreground"
          aria-label="Open command palette">
          <Command className="size-3.5" />
          <kbd className="hidden font-sans text-xs sm:inline">⌘K</kbd>
        </Button>
      </header>

      <ToggleGroup
        type="single"
        value={state.mode}
        onValueChange={(v) => {
          if (v) setState({ ...state, mode: v as AppMode });
        }}
        aria-label="Mode"
        className="mb-4">
        <ToggleGroupItem value="compare" className="px-4">
          Compare
        </ToggleGroupItem>
        <ToggleGroupItem value="portfolio" className="px-4">
          Portfolio
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/40 p-4">
        {isCompare ? (
          <>
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
          </>
        ) : (
          <PortfolioBuilder
            holdings={state.holdings}
            onHoldingsChange={(holdings) => setState({ ...state, holdings })}
            rebalance={state.rebalance}
            onRebalanceChange={(rebalance) => setState({ ...state, rebalance })}
            benchmark={state.benchmark}
            onBenchmarkChange={(benchmark) => setState({ ...state, benchmark })}
            max={MAX_COMPARE_TICKERS}
          />
        )}

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
        {!hasInputs ? (
          <p className="text-sm text-muted-foreground">
            {isCompare
              ? "Add at least one ticker to begin."
              : "Add at least one holding to begin."}
          </p>
        ) : !state.start || !state.end ? (
          <p className="text-sm text-muted-foreground">
            Select a start and end date to load results.
          </p>
        ) : query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState
            error={query.error}
            onRetry={showRetry ? () => query.refetch() : undefined}
          />
        ) : isCompare && compareQuery.data ? (
          <CompareResults data={compareQuery.data} tickers={state.tickers} />
        ) : !isCompare && portfolioQuery.data ? (
          <PortfolioResults data={portfolioQuery.data} />
        ) : null}
      </div>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        state={state}
        setState={setState}
        onShare={handleShare}
      />
    </div>
  );
}
