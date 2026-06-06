import { useMemo } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import PlotImport from "react-plotly.js";
import { useTheme } from "@mui/material/styles";
import type { CorrelationMatrix } from "@/types";

// See TickerCard/GrowthChart: normalize react-plotly.js's "double default".
const Plot =
  (PlotImport as unknown as { default?: typeof PlotImport }).default ??
  PlotImport;

interface CorrelationHeatmapProps {
  correlation: CorrelationMatrix;
}

/**
 * Daily-return correlation matrix as a heatmap. Diverging blue→red scale on
 * [-1, 1] so highly correlated pairs (red) and diversifiers (blue/negative)
 * pop out. Each cell is annotated with its value. Rendered only for 2+ tickers
 * (a single ticker has nothing to correlate against).
 */
export function CorrelationHeatmap({ correlation }: CorrelationHeatmapProps) {
  const theme = useTheme();
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
        // Reversed RdBu: +1 red (move together), -1 blue (move apart).
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
          font: {
            size: 11,
            // White text reads on both ends of the diverging scale.
            color: "#ffffff",
          },
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
        color: theme.palette.text.primary,
        family: theme.typography.fontFamily ?? "inherit",
        size: 11,
      },
      xaxis: { side: "bottom" as const, fixedrange: true },
      yaxis: { autorange: "reversed" as const, fixedrange: true },
      annotations,
    }),
    [theme, annotations],
  );

  const config = useMemo(
    () => ({ displayModeBar: false, responsive: true }),
    [],
  );

  // Height scales a little with ticker count so cells stay roughly square.
  const height = Math.max(220, 40 + tickers.length * 44);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Return correlation
        </Typography>
        <Box sx={{ height }}>
          <Plot
            data={chartData}
            layout={layout}
            config={config}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </Box>
      </CardContent>
    </Card>
  );
}
