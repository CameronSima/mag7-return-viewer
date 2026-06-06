import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import type { CompareResponse } from "@/types";
import { GrowthChart } from "./GrowthChart";
import { ComparisonTable } from "./ComparisonTable";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { Alert, AlertDescription } from "./ui/alert";
import { WindowCaption } from "./WindowCaption";

interface CompareResultsProps {
  data: CompareResponse;
  /** The user's chosen ticker order (drives line/row coloring). */
  tickers: string[];
}

/** Results view for compare mode: growth chart, risk/return table, correlation. */
export function CompareResults({ data, tickers }: CompareResultsProps) {
  const series = useMemo(
    () =>
      tickers
        .filter((t) => data.growth[t])
        .map((ticker) => ({ ticker, points: data.growth[ticker] })),
    [data, tickers],
  );

  return (
    <div className="flex flex-col gap-5">
      {data.missing.length > 0 && (
        <Alert variant="warning">
          <TriangleAlert />
          <AlertDescription>
            No data for: {data.missing.join(", ")}. Check the symbol(s) — they
            may be misspelled or unavailable.
          </AlertDescription>
        </Alert>
      )}
      <WindowCaption window={data.window} />
      <GrowthChart series={series} />
      <ComparisonTable data={data} tickers={tickers} />
      {data.correlation.tickers.length >= 2 && (
        <CorrelationHeatmap correlation={data.correlation} />
      )}
    </div>
  );
}
