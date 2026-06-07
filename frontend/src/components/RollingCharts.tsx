import { useMemo } from "react";
import PlotImport from "react-plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GrowthPoint, RollingBlock } from "@/types";
import { seriesColor } from "@/utils/palette";
import { CHART_THEME } from "@/utils/chartTheme";

// react-plotly.js is a CommonJS "double default"; normalize as in GrowthChart.
const Plot =
  (PlotImport as unknown as { default?: typeof PlotImport }).default ??
  PlotImport;

interface RollingChartsProps {
  rolling: RollingBlock;
  /** Display order driving per-series colors (matches the growth chart). */
  order: string[];
}

/**
 * Rolling-window views that expose regime changes a single number hides:
 * annualized volatility over time, and (when ≥2 series) each series' rolling
 * correlation against the reference. Colors track the growth chart via the
 * shared display order. Renders nothing when the range is too short to roll.
 */
export function RollingCharts({ rolling, order }: RollingChartsProps) {
  const volData = useMemo(
    () => buildTraces(rolling.volatility, order, "%{y:.1%}"),
    [rolling.volatility, order],
  );
  const corrData = useMemo(
    () => buildTraces(rolling.correlation, order, "%{y:.2f}"),
    [rolling.correlation, order],
  );

  if (volData.length === 0) return null;

  const corrTitle =
    `Rolling correlation · ${rolling.window}d` +
    (rolling.reference ? ` vs ${rolling.reference}` : "");

  return (
    <div className="flex flex-col gap-5">
      <RollingCard
        title={`Rolling volatility · ${rolling.window}d`}
        data={volData}
        yaxis={{ tickformat: ".0%", zeroline: false }}
      />
      {corrData.length > 0 && (
        <RollingCard
          title={corrTitle}
          data={corrData}
          yaxis={{
            tickformat: ".1f",
            range: [-1, 1],
            zeroline: true,
            zerolinecolor: CHART_THEME.grid,
          }}
        />
      )}
    </div>
  );
}

type Trace = ReturnType<typeof buildTraces>[number];

function buildTraces(
  series: Record<string, GrowthPoint[]>,
  order: string[],
  hover: string,
) {
  return Object.entries(series).map(([ticker, points]) => ({
    x: points.map((p) => p.date),
    y: points.map((p) => p.value),
    type: "scatter" as const,
    mode: "lines" as const,
    name: ticker,
    line: { color: seriesColor(Math.max(order.indexOf(ticker), 0)), width: 1.75 },
    hovertemplate: `<b>${ticker}</b> %{x}<br>${hover}<extra></extra>`,
  }));
}

function RollingCard({
  title,
  data,
  yaxis,
}: {
  title: string;
  data: Trace[];
  yaxis: Record<string, unknown>;
}) {
  const layout = {
    autosize: true,
    margin: { l: 48, r: 16, t: 8, b: 32 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    showlegend: true,
    legend: { orientation: "h" as const, y: -0.2, font: { size: 11 } },
    font: { color: CHART_THEME.text, family: CHART_THEME.fontFamily, size: 11 },
    xaxis: { gridcolor: CHART_THEME.grid, zeroline: false },
    yaxis: { gridcolor: CHART_THEME.grid, ...yaxis },
    hovermode: "x unified" as const,
    hoverlabel: {
      bgcolor: CHART_THEME.paper,
      bordercolor: CHART_THEME.grid,
      font: { color: CHART_THEME.text },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Plot
            data={data}
            layout={layout}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </div>
      </CardContent>
    </Card>
  );
}
