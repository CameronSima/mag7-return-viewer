import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { type PortfolioResponse, PORTFOLIO_KEY } from "@/types";
import { GrowthChart } from "./GrowthChart";
import { ComparisonTable } from "./ComparisonTable";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { HoldingsTable } from "./HoldingsTable";
import { AnnualReturns } from "./AnnualReturns";
import { BenchmarkMetricsPanel } from "./BenchmarkMetricsPanel";
import { Alert, AlertDescription } from "./ui/alert";
import { WindowCaption } from "./WindowCaption";
import { Reveal } from "./Reveal";

interface PortfolioResultsProps {
  data: PortfolioResponse;
}

/**
 * Results view for portfolio mode: the blended portfolio vs. its benchmark
 * (growth + risk/return), the per-holding breakdown, and — when there's a
 * benchmark to correlate against — the correlation matrix.
 */
export function PortfolioResults({ data }: PortfolioResultsProps) {
  // Portfolio first (accent color), benchmark second.
  const order = useMemo(
    () => [PORTFOLIO_KEY, ...(data.benchmark ? [data.benchmark] : [])],
    [data.benchmark],
  );
  const series = useMemo(
    () =>
      order
        .filter((k) => data.growth[k])
        .map((ticker) => ({ ticker, points: data.growth[ticker] })),
    [data, order],
  );

  return (
    <div className="flex flex-col gap-5">
      {data.missing.length > 0 && (
        <Reveal index={0}>
          <Alert variant="warning">
            <TriangleAlert />
            <AlertDescription>
              No data for: {data.missing.join(", ")} — dropped from the
              portfolio, with the remaining weights renormalized.
            </AlertDescription>
          </Alert>
        </Reveal>
      )}
      {data.window.start && (
        <Reveal index={1}>
          <WindowCaption window={data.window} />
        </Reveal>
      )}
      <Reveal index={2}>
        <GrowthChart series={series} />
      </Reveal>
      <Reveal index={3}>
        <ComparisonTable data={data} tickers={order} />
      </Reveal>
      {data.benchmark_metrics && (
        <Reveal index={4}>
          <BenchmarkMetricsPanel metrics={data.benchmark_metrics} />
        </Reveal>
      )}
      <Reveal index={5}>
        <AnnualReturns annual={data.annual} tickers={order} />
      </Reveal>
      <Reveal index={6}>
        <HoldingsTable holdings={data.holdings} />
      </Reveal>
      {data.correlation.tickers.length >= 2 && (
        <Reveal index={7}>
          <CorrelationHeatmap correlation={data.correlation} />
        </Reveal>
      )}
    </div>
  );
}
