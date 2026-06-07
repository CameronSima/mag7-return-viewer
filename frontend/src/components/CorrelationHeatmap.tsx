import { useMemo } from "react";
import PlotImport from "react-plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CorrelationMatrix } from "@/types";
import { CHART_THEME } from "@/utils/chartTheme";

// See GrowthChart: normalize react-plotly.js's "double default".
const Plot =
  (PlotImport as unknown as { default?: typeof PlotImport }).default ??
  PlotImport;

interface CorrelationHeatmapProps {
  correlation: CorrelationMatrix;
}

/**
 * Daily-return correlation matrix as a heatmap. Diverging blue→red scale on
 * [-1, 1] so highly correlated pairs (red) and diversifiers (blue/negative)
 * pop out. Each cell is annotated with its value. Rendered only for 2+ tickers.
 */
export function CorrelationHeatmap({ correlation }: CorrelationHeatmapProps) {
  const { tickers, matrix } = correlation;

  const chartData = useMemo(
    () => [
      {
        z: matrix,
        x: tickers,
        y: tickers,
        type: "heatmap" as const,
        zmin: -1,
        zmax: 1,
        colorscale: "RdBu" as const,
        reversescale: true,
        showscale: true,
        hovertemplate: "%{y} · %{x}: %{z:.2f}<extra></extra>",
        xgap: 2,
        ygap: 2,
      },
    ],
    [matrix, tickers],
  );

  const annotations = useMemo(
    () =>
      tickers.flatMap((rowTicker, i) =>
        tickers.map((colTicker, j) => ({
          x: colTicker,
          y: rowTicker,
          text: matrix[i][j].toFixed(2),
          showarrow: false,
          font: { size: 11, color: "#ffffff" },
        })),
      ),
    [matrix, tickers],
  );

  const layout = useMemo(
    () => ({
      autosize: true,
      margin: { l: 56, r: 16, t: 8, b: 48 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: {
        color: CHART_THEME.text,
        family: CHART_THEME.fontFamily,
        size: 11,
      },
      xaxis: { side: "bottom" as const, fixedrange: true },
      yaxis: { autorange: "reversed" as const, fixedrange: true },
      annotations,
    }),
    [annotations],
  );

  const config = useMemo(
    () => ({ displayModeBar: false, responsive: true }),
    [],
  );

  const height = Math.max(220, 40 + tickers.length * 44);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Return correlation</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
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
