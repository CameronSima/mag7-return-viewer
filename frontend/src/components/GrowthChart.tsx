import { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import PlotImport from "react-plotly.js";
import { useTheme } from "@mui/material/styles";
import type { GrowthPoint } from "@/types";
import { seriesColor } from "@/utils/palette";

// react-plotly.js is a CommonJS "double default"; normalize so <Plot /> is
// always a real component across dev, prod (Rollup), and Vitest. See TickerCard
// history — same shape issue.
const Plot =
  (PlotImport as unknown as { default?: typeof PlotImport }).default ??
  PlotImport;

interface GrowthChartProps {
  /** Ticker -> growth series, in the display order tickers should be colored. */
  series: { ticker: string; points: GrowthPoint[] }[];
}

/**
 * Overlaid "growth of $1" chart — one line per ticker on a shared axis, so the
 * magnitudes are directly comparable (unlike the per-card daily-return view).
 * A log-scale toggle makes multi-fold differences readable; Plotly supplies
 * zoom, pan, hover, and the legend for free.
 */
export function GrowthChart({ series }: GrowthChartProps) {
  const theme = useTheme();
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
      legend: {
        orientation: "h" as const,
        y: -0.18,
        font: { size: 11 },
      },
      font: {
        color: theme.palette.text.primary,
        family: theme.typography.fontFamily ?? "inherit",
        size: 11,
      },
      xaxis: {
        gridcolor: theme.palette.divider,
        zeroline: false,
        showspikes: false,
      },
      yaxis: {
        gridcolor: theme.palette.divider,
        type: (logScale ? "log" : "linear") as "log" | "linear",
        tickformat: logScale ? ".2r" : ".2f",
        ticksuffix: "×",
        zeroline: false,
      },
      hovermode: "x unified" as const,
      hoverlabel: {
        bgcolor: theme.palette.background.paper,
        bordercolor: theme.palette.divider,
        font: { color: theme.palette.text.primary },
      },
    }),
    [theme, logScale],
  );

  const config = useMemo(
    () => ({ displayModeBar: false, responsive: true }),
    [],
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Growth of $1</Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={logScale ? "log" : "linear"}
            onChange={(_e, v) => {
              if (v) setLogScale(v === "log");
            }}
            aria-label="Y-axis scale">
            <ToggleButton value="linear" aria-label="Linear scale">
              Linear
            </ToggleButton>
            <ToggleButton value="log" aria-label="Log scale">
              Log
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box sx={{ height: 420 }}>
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
