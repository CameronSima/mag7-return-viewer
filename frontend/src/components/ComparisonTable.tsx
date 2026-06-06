import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Typography } from "@mui/material";
import type { CompareResponse } from "@/types";
import {
  formatNumber,
  formatPct,
  formatReturnPct,
  isPositive,
} from "@/utils/stats";
import { seriesColor } from "@/utils/palette";

interface ComparisonTableProps {
  data: CompareResponse;
  /** Display/color order — same order the chart colors its lines. */
  tickers: string[];
}

interface CompareRow {
  id: string;
  ticker: string;
  colorIndex: number;
  totalReturn: number;
  cagr: number;
  annualVol: number;
  sharpe: number;
  maxDrawdown: number;
  best: number;
  worst: number;
  days: number;
}

/**
 * Sortable risk/return table: one row per ticker. The metrics (CAGR, volatility,
 * Sharpe, max drawdown) are computed server-side over the common window so they
 * stay consistent with the growth chart and correlation matrix. A color dot ties
 * each row to its line in the chart.
 */
export function ComparisonTable({ data, tickers }: ComparisonTableProps) {
  const rows: CompareRow[] = tickers
    .filter((t) => data.stats[t])
    .map((ticker, index) => {
      const s = data.stats[ticker];
      return {
        id: ticker,
        ticker,
        colorIndex: index,
        totalReturn: s.total_return,
        cagr: s.cagr,
        annualVol: s.annual_vol,
        sharpe: s.sharpe,
        maxDrawdown: s.max_drawdown,
        best: s.best,
        worst: s.worst,
        days: s.count,
      };
    });

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Risk &amp; return
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        autoHeight
        disableRowSelectionOnClick
        hideFooter
        sx={{ "& .MuiDataGrid-cell:focus": { outline: "none" } }}
        initialState={{
          sorting: { sortModel: [{ field: "totalReturn", sort: "desc" }] },
        }}
      />
    </Box>
  );
}

/** Signed percentage cell, green/red by sign (returns, CAGR, drawdown, …). */
const renderSignedPct = (params: GridRenderCellParams<CompareRow, number>) => {
  const value = params.value ?? 0;
  return (
    <Box
      component="span"
      sx={{
        color: isPositive(value) ? "success.main" : "error.main",
        fontFeatureSettings: '"tnum"',
      }}>
      {formatReturnPct(value)}
    </Box>
  );
};

/** Unsigned percentage cell, neutral color (volatility). */
const renderPlainPct = (params: GridRenderCellParams<CompareRow, number>) => (
  <Box component="span" sx={{ fontFeatureSettings: '"tnum"' }}>
    {formatPct(params.value ?? 0)}
  </Box>
);

const renderTicker = (params: GridRenderCellParams<CompareRow, string>) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        bgcolor: seriesColor(params.row.colorIndex),
        flexShrink: 0,
      }}
    />
    {params.value}
  </Box>
);

const columns: GridColDef<CompareRow>[] = [
  {
    field: "ticker",
    headerName: "Ticker",
    flex: 1,
    minWidth: 100,
    renderCell: renderTicker,
  },
  {
    field: "totalReturn",
    headerName: "Total",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderSignedPct,
  },
  {
    field: "cagr",
    headerName: "CAGR",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderSignedPct,
  },
  {
    field: "annualVol",
    headerName: "Volatility",
    flex: 1,
    minWidth: 100,
    type: "number",
    renderCell: renderPlainPct,
  },
  {
    field: "sharpe",
    headerName: "Sharpe",
    flex: 1,
    minWidth: 90,
    type: "number",
    valueFormatter: (value: number) => formatNumber(value ?? 0),
  },
  {
    field: "maxDrawdown",
    headerName: "Max DD",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderSignedPct,
  },
  {
    field: "best",
    headerName: "Best day",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderSignedPct,
  },
  {
    field: "worst",
    headerName: "Worst day",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderSignedPct,
  },
  { field: "days", headerName: "Days", flex: 1, minWidth: 70, type: "number" },
];
