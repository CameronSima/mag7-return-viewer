import { useMemo } from "react";
import { TriangleAlert } from "lucide-react";
import type { CompareResponse } from "@/types";
import { GrowthChart } from "./GrowthChart";
import { ComparisonTable } from "./ComparisonTable";
import { CorrelationHeatmap } from "./CorrelationHeatmap";
import { RollingCharts } from "./RollingCharts";
import { Alert, AlertDescription } from "./ui/alert";
import { WindowCaption } from "./WindowCaption";
import { Reveal } from "./Reveal";

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
        <Reveal index={0}>
          <Alert variant="warning">
            <TriangleAlert />
            <AlertDescription>
              No data for: {data.missing.join(", ")}. Check the symbol(s) — they
              may be misspelled or unavailable.
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
        <ComparisonTable data={data} tickers={tickers} />
      </Reveal>
      {data.correlation.tickers.length >= 2 && (
        <Reveal index={4}>
          <CorrelationHeatmap correlation={data.correlation} />
        </Reveal>
      )}
      {Object.keys(data.rolling.volatility).length > 0 && (
        <Reveal index={5}>
          <RollingCharts rolling={data.rolling} order={tickers} />
        </Reveal>
      )}
    </div>
  );
}
