import { Card, CardContent, Stack, Typography, Box } from "@mui/material";
import PlotImport from "react-plotly.js";
import { useTheme } from "@mui/material/styles";
import { useMemo } from "react";
import type { ReturnPoint, TickerStats } from "@/types";
import { formatReturnPct, isPositive } from "@/utils/stats";

// react-plotly.js is a CommonJS module with a "double default"
// (exports.__esModule = true; exports.default = Component). Vite's dev
// dependency pre-bundling exports the whole module object as the default
// instead of unwrapping `.default`, so the import is an object in the dev
// browser but the component itself under Rollup (prod) and Vitest. Normalize
// both shapes so `<Plot />` is always a real component.
const Plot =
  (PlotImport as unknown as { default?: typeof PlotImport }).default ??
  PlotImport;

interface TickerCardProps {
  ticker: string;
  data: ReturnPoint[];
  stats: TickerStats;
}

/**
 * A single ticker's return chart with summary stats.
 *
 * The chart is rendered with Plotly for built-in zoom, pan, and hover
 * tooltips. We memoize the chart data and layout so React doesn't
 * tear down and rebuild the Plotly instance on every parent re-render.
 */
export function TickerCard({ ticker, data, stats }: TickerCardProps) {
  const theme = useTheme();
  const lineColor = isPositive(stats.mean)
    ? theme.palette.success.main
    : theme.palette.error.main;

  // Plotly data and layout are memoized so identical re-renders don't
  // force a full chart rebuild (it's the most expensive thing on the page).
  const chartData = useMemo(
    () => [
      {
        x: data.map((d) => d.date),
        y: data.map((d) => d.return),
        type: "scatter" as const,
        mode: "lines" as const,
        line: { color: lineColor, width: 1.5 },
        hovertemplate: "<b>%{x}</b><br>Return: %{y:.2%}<extra></extra>",
        name: ticker,
      },
    ],
    [data, lineColor, ticker],
  );

  const layout = useMemo(
    () => ({
      autosize: true,
      margin: { l: 40, r: 16, t: 8, b: 32 },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
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
        tickformat: ".1%",
        zeroline: true,
        zerolinecolor: theme.palette.divider,
      },
      hoverlabel: {
        bgcolor: theme.palette.background.paper,
        bordercolor: theme.palette.divider,
        font: { color: theme.palette.text.primary },
      },
    }),
    [theme],
  );

  const config = useMemo(
    () => ({
      displayModeBar: false, // hide the plotly toolbar; tooltip + drag-zoom still work
      responsive: true,
    }),
    [],
  );

  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
          <Typography variant="h6">{ticker}</Typography>
          <Typography
            variant="body2"
            color={isPositive(stats.mean) ? "success.main" : "error.main"}>
            avg {formatReturnPct(stats.mean)}
          </Typography>
        </Stack>

        <Box sx={{ height: 180 }}>
          <Plot
            data={chartData}
            layout={layout}
            config={config}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
          />
        </Box>

        <Stack
          direction="row"
          // tabular numerals so the min/mean/max columns line up
          sx={{
            justifyContent: "space-between",
            mt: 1,
            fontFeatureSettings: '"tnum"',
          }}>
          <StatItem label="min" value={stats.min} />
          <StatItem label="mean" value={stats.mean} />
          <StatItem label="max" value={stats.max} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <Stack spacing={0} sx={{ alignItems: "center" }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        color={isPositive(value) ? "success.main" : "error.main"}>
        {formatReturnPct(value)}
      </Typography>
    </Stack>
  );
}
