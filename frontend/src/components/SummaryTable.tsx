import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Typography } from "@mui/material";
import type { ReturnsResponse } from "@/types";
import { MAG7_TICKERS } from "@/types";
import { formatPct, formatRatio, formatReturnPct, isPositive } from "@/utils/stats";

interface SummaryTableProps {
  data: ReturnsResponse;
}

interface SummaryRow {
  id: string;
  ticker: string;
  min: number;
  mean: number;
  max: number;
  vol: number;
  sharpe: number;
  observations: number;
}

/**
 * Sortable summary table: one row per ticker, with min/mean/max returns
 * and the count of valid observations in the range. Uses MUI X DataGrid
 * (free Community edition) for sort/resize for free.
 */
export function SummaryTable({ data }: SummaryTableProps) {
  // Canonical order, restricted to the tickers present in the response so a
  // subset selection shows only the chosen names.
  const rows: SummaryRow[] = MAG7_TICKERS.filter(
    (ticker) => ticker in data.stats,
  ).map((ticker) => {
    const { min, mean, max, count, vol, sharpe } = data.stats[ticker] ?? {
      min: 0,
      max: 0,
      mean: 0,
      count: 0,
      vol: 0,
      sharpe: 0,
    };
    // "Days" is the true observation count from the backend, not the length of
    // the (possibly downsampled) chart series.
    return { id: ticker, ticker, min, mean, max, vol, sharpe, observations: count };
  });

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Summary
      </Typography>
      <DataGrid
        rows={rows}
        columns={columns}
        autoHeight
        disableRowSelectionOnClick
        hideFooter
        sx={{ "& .MuiDataGrid-cell:focus": { outline: "none" } }}
        initialState={{
          sorting: { sortModel: [{ field: "mean", sort: "desc" }] },
        }}
      />
    </Box>
  );
}

const renderPctCell = (params: GridRenderCellParams<SummaryRow, number>) => {
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

// Volatility is a non-negative magnitude — render it neutrally (no green/red
// and no sign), so it doesn't read as a "good/bad" return.
const renderVolCell = (params: GridRenderCellParams<SummaryRow, number>) => (
  <Box component="span" sx={{ fontFeatureSettings: '"tnum"' }}>
    {formatPct(params.value ?? 0)}
  </Box>
);

const renderSharpeCell = (params: GridRenderCellParams<SummaryRow, number>) => {
  const value = params.value ?? 0;
  return (
    <Box
      component="span"
      sx={{
        color: isPositive(value) ? "success.main" : "error.main",
        fontFeatureSettings: '"tnum"',
      }}>
      {formatRatio(value)}
    </Box>
  );
};

const columns: GridColDef<SummaryRow>[] = [
  { field: "ticker", headerName: "Ticker", flex: 1, minWidth: 80 },
  {
    field: "min",
    headerName: "Min",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderPctCell,
  },
  {
    field: "mean",
    headerName: "Mean",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderPctCell,
  },
  {
    field: "max",
    headerName: "Max",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderPctCell,
  },
  {
    field: "vol",
    headerName: "Ann. Vol",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderVolCell,
  },
  {
    field: "sharpe",
    headerName: "Sharpe",
    flex: 1,
    minWidth: 90,
    type: "number",
    renderCell: renderSharpeCell,
  },
  {
    field: "observations",
    headerName: "Days",
    flex: 1,
    minWidth: 70,
    type: "number",
  },
];
