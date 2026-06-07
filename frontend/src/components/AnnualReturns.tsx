import { useMemo } from "react";
import PlotImport from "react-plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnnualReturn } from "@/types";
import { seriesColor } from "@/utils/palette";
import { CHART_THEME } from "@/utils/chartTheme";
import { formatReturnPct, isPositive } from "@/utils/stats";

// react-plotly.js is a CommonJS "double default"; normalize as in GrowthChart.
const Plot =
  (PlotImport as unknown as { default?: typeof PlotImport }).default ??
  PlotImport;

interface AnnualReturnsProps {
  annual: AnnualReturn[];
  /** Series order (e.g. ["Portfolio", "SPY"]) — drives bar/column coloring. */
  tickers: string[];
}

/**
 * Calendar-year returns: grouped bars (one per series) for a quick read on
 * consistency and regime shifts a single CAGR hides, plus a table for the exact
 * numbers. Partial first/last years are labeled so a stub year isn't misread.
 */
export function AnnualReturns({ annual, tickers }: AnnualReturnsProps) {
  const years = useMemo(() => annual.map((a) => String(a.year)), [annual]);

  const chartData = useMemo(
    () =>
      tickers.map((ticker, i) => ({
        x: years,
        y: annual.map((a) => a.returns[ticker] ?? 0),
        type: "bar" as const,
        name: ticker,
        marker: { color: seriesColor(i) },
        hovertemplate: `<b>${ticker}</b> %{x}<br>%{y:.1%}<extra></extra>`,
      })),
    [annual, tickers, years],
  );

  const layout = useMemo(
    () => ({
      autosize: true,
      barmode: "group" as const,
      bargap: 0.3,
      margin: { l: 48, r: 16, t: 8, b: 28 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      showlegend: true,
      legend: { orientation: "h" as const, y: -0.2, font: { size: 11 } },
      font: {
        color: CHART_THEME.text,
        family: CHART_THEME.fontFamily,
        size: 11,
      },
      xaxis: {
        type: "category" as const,
        gridcolor: CHART_THEME.grid,
        zeroline: false,
      },
      yaxis: {
        gridcolor: CHART_THEME.grid,
        tickformat: ".0%",
        zeroline: true,
        zerolinecolor: CHART_THEME.grid,
      },
      hoverlabel: {
        bgcolor: CHART_THEME.paper,
        bordercolor: CHART_THEME.grid,
        font: { color: CHART_THEME.text },
      },
    }),
    [],
  );

  const config = useMemo(
    () => ({ displayModeBar: false, responsive: true }),
    [],
  );

  if (annual.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Calendar-year returns</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-[260px]">
          <Plot
            data={chartData}
            layout={layout}
            config={config}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Year</TableHead>
              {tickers.map((ticker) => (
                <TableHead key={ticker} className="text-right">
                  {ticker}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {annual.map((row) => (
              <TableRow key={row.year}>
                <TableCell className="font-medium tabular-nums">
                  {row.year}
                  {row.partial && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      partial
                    </span>
                  )}
                </TableCell>
                {tickers.map((ticker) => {
                  const value = row.returns[ticker] ?? 0;
                  return (
                    <TableCell
                      key={ticker}
                      className={`text-right tabular-nums ${
                        isPositive(value) ? "text-success" : "text-destructive"
                      }`}>
                      {formatReturnPct(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
