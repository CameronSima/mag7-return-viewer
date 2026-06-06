import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { DateRangePicker } from "./components/DateRangePicker";
import { TickerInput } from "./components/TickerInput";
import { GrowthChart } from "./components/GrowthChart";
import { ComparisonTable } from "./components/ComparisonTable";
import { CorrelationHeatmap } from "./components/CorrelationHeatmap";
import { LoadingState } from "./components/LoadingState";
import { ErrorState } from "./components/ErrorState";
import { useComparison } from "./hooks/useComparison";
import { useUrlState } from "./hooks/useUrlState";
import { ApiError } from "./api/client";
import { MAX_COMPARE_TICKERS } from "./types";

// Sensible defaults so a bare visit (no URL params) shows something compelling
// immediately: the leaders against the S&P 500 over the last five years.
const DEFAULT_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL", "SPY"];
const DEFAULT_START = dayjs().subtract(5, "year").format("YYYY-MM-DD");
const DEFAULT_END = dayjs().format("YYYY-MM-DD");

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

  const startDay = state.start ? dayjs(state.start) : null;
  const endDay = state.end ? dayjs(state.end) : null;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Stock Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare the long-run performance of any stocks or ETFs — growth,
            risk, and correlation, side by side. Free, no sign-up; every view is
            a shareable link.
          </Typography>
        </Box>

        <Stack spacing={2}>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                size="small"
                variant="outlined"
                onClick={() => setState({ ...state, tickers: preset.tickers })}>
                {preset.label}
              </Button>
            ))}
          </Stack>

          <TickerInput
            value={state.tickers}
            onChange={(tickers) => setState({ ...state, tickers })}
            max={MAX_COMPARE_TICKERS}
          />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ alignItems: { sm: "flex-start" } }}>
            <DateRangePicker
              start={startDay}
              end={endDay}
              onChange={(s: Dayjs | null, e: Dayjs | null) =>
                setState({
                  ...state,
                  start: s ? s.format("YYYY-MM-DD") : null,
                  end: e ? e.format("YYYY-MM-DD") : null,
                })
              }
            />
            <Button
              variant="outlined"
              onClick={handleShare}
              sx={{ whiteSpace: "nowrap" }}>
              {copied ? "Copied!" : "Share link"}
            </Button>
          </Stack>
        </Stack>

        {state.tickers.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Add at least one ticker to begin.
          </Typography>
        ) : !state.start || !state.end ? (
          <Typography variant="body2" color="text.secondary">
            Select a start and end date to load the comparison.
          </Typography>
        ) : query.isLoading ? (
          <LoadingState />
        ) : query.error ? (
          <ErrorState
            error={query.error}
            onRetry={showRetry ? () => query.refetch() : undefined}
          />
        ) : query.data ? (
          <Stack spacing={3}>
            {query.data.missing.length > 0 && (
              <Alert severity="warning" variant="outlined">
                No data for: {query.data.missing.join(", ")}. Check the
                symbol(s) — they may be misspelled or unavailable.
              </Alert>
            )}
            {query.data.window.start && (
              <Typography variant="body2" color="text.secondary">
                Common window: {query.data.window.start} →{" "}
                {query.data.window.end} · {query.data.window.trading_days}{" "}
                trading days. Tickers are compared over the dates they all share.
              </Typography>
            )}
            <GrowthChart series={series} />
            <ComparisonTable data={query.data} tickers={state.tickers} />
            {query.data.correlation.tickers.length >= 2 && (
              <CorrelationHeatmap correlation={query.data.correlation} />
            )}
          </Stack>
        ) : null}
      </Stack>
    </Container>
  );
}
