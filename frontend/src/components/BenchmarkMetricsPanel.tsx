import type { BenchmarkMetrics } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatNumber,
  formatPct,
  formatReturnPct,
  isPositive,
} from "@/utils/stats";

interface BenchmarkMetricsPanelProps {
  metrics: BenchmarkMetrics;
}

/**
 * Benchmark-relative risk metrics, from the regression of the portfolio's daily
 * returns on the benchmark's. A compact tile grid: each tile is a value, a
 * label, and a one-line plain-English gloss so the numbers are self-explaining.
 */
export function BenchmarkMetricsPanel({ metrics }: BenchmarkMetricsPanelProps) {
  const bm = metrics.benchmark;
  const tiles: { label: string; value: string; hint: string; tone?: "signed" }[] =
    [
      {
        label: "Beta",
        value: formatNumber(metrics.beta),
        hint: `Sensitivity to ${bm} moves`,
      },
      {
        label: "Alpha (ann.)",
        value: formatReturnPct(metrics.alpha),
        hint: "Return beyond what beta explains",
        tone: "signed",
      },
      {
        label: "R²",
        value: formatNumber(metrics.r_squared),
        hint: `Variance explained by ${bm}`,
      },
      {
        label: "Tracking error",
        value: formatPct(metrics.tracking_error),
        hint: "Volatility of active return",
      },
      {
        label: "Information ratio",
        value: formatNumber(metrics.information_ratio),
        hint: "Active return ÷ tracking error",
      },
      {
        label: "Correlation",
        value: formatNumber(metrics.correlation),
        hint: `Daily returns vs. ${bm}`,
      },
    ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">vs. {bm}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium text-muted-foreground">
                {tile.label}
              </dt>
              <dd
                className={`text-2xl font-semibold tabular-nums ${
                  tile.tone === "signed"
                    ? isPositive(metrics.alpha)
                      ? "text-success"
                      : "text-destructive"
                    : "text-foreground"
                }`}>
                {tile.value}
              </dd>
              <p className="text-xs text-muted-foreground">{tile.hint}</p>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
