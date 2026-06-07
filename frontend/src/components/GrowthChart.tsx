import { useMemo, useState } from "react";
import PlotImport from "react-plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { GrowthPoint } from "@/types";
import { seriesColor } from "@/utils/palette";
import { CHART_THEME } from "@/utils/chartTheme";

// react-plotly.js is a CommonJS "double default"; normalize so <Plot /> is
// always a real component across dev, prod (Rollup), and Vitest.
const Plot =
  (PlotImport as unknown as { default?: typeof PlotImport }).default ??
  PlotImport;

interface GrowthChartProps {
  /** Ticker -> growth series, in the display order tickers should be colored. */
  series: { ticker: string; points: GrowthPoint[] }[];
}

/**
 * Overlaid "growth of $1" chart — one line per ticker on a shared axis, so the
 * magnitudes are directly comparable (unlike a per-card view). A log-scale
 * toggle makes multi-fold differences readable; Plotly supplies zoom, pan,
 * hover, and the legend for free.
 */
export function GrowthChart({ series }: GrowthChartProps) {
  const [logScale, setLogScale] = useState(false);

  const chartData = useMemo(
    () =>
      series.map((s, i) => ({
        x: s.points.map((p) => p.date),
        y: s.points.map((p) => p.value),
        type: "scatter" as const,
        mode: "lines" as const,
        name: s.ticker,
        line: { color: seriesColor(i), width: 1.75 },
        hovertemplate: `<b>${s.ticker}</b> %{x}<br>%{y:.2f}×<extra></extra>`,
      })),
    [series],
  );

  const layout = useMemo(
    () => ({
      autosize: true,
      margin: { l: 52, r: 16, t: 8, b: 36 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      showlegend: true,
      legend: { orientation: "h" as const, y: -0.18, font: { size: 11 } },
      font: {
        color: CHART_THEME.text,
        family: CHART_THEME.fontFamily,
        size: 11,
      },
      xaxis: {
        gridcolor: CHART_THEME.grid,
        zeroline: false,
        showspikes: false,
      },
      yaxis: {
        gridcolor: CHART_THEME.grid,
        type: (logScale ? "log" : "linear") as "log" | "linear",
        tickformat: logScale ? ".2r" : ".2f",
        ticksuffix: "×",
        zeroline: false,
      },
      hovermode: "x unified" as const,
      hoverlabel: {
        bgcolor: CHART_THEME.paper,
        bordercolor: CHART_THEME.grid,
        font: { color: CHART_THEME.text },
      },
    }),
    [logScale],
  );

  const config = useMemo(
    () => ({ displayModeBar: false, responsive: true }),
    [],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Growth of $1</CardTitle>
        <ToggleGroup
          type="single"
          value={logScale ? "log" : "linear"}
          onValueChange={(v) => {
            if (v) setLogScale(v === "log");
          }}
          aria-label="Y-axis scale">
          <ToggleGroupItem value="linear">Linear</ToggleGroupItem>
          <ToggleGroupItem value="log">Log</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="h-[420px]">
          <Plot
            data={chartData}
            layout={layout}
            config={config}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </div>
      </CardContent>
    </Card>
  );
}
