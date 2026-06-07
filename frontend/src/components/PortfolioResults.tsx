import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import { type PortfolioResponse, PORTFOLIO_KEY } from "@/types";
import { GrowthChart } from "./GrowthChart";
import { ComparisonTable } from "./ComparisonTable";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { HoldingsTable } from "./HoldingsTable";
import { AnnualReturns } from "./AnnualReturns";
import { Alert, AlertDescription } from "./ui/alert";
import { WindowCaption } from "./WindowCaption";

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
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>
            No data for: {data.missing.join(", ")} — dropped from the portfolio,
            with the remaining weights renormalized.
          </AlertDescription>
        </Alert>
      )}
      <WindowCaption window={data.window} />
      <GrowthChart series={series} />
      <ComparisonTable data={data} tickers={order} />
      <AnnualReturns annual={data.annual} tickers={order} />
      <HoldingsTable holdings={data.holdings} />
      {data.correlation.tickers.length >= 2 && (
        <CorrelationHeatmap correlation={data.correlation} />
      )}
    </div>
  );
}
