import { useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { CompareResponse } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatNumber,
  formatPct,
  formatReturnPct,
  isPositive,
} from "@/utils/stats";
import { seriesColor } from "@/utils/palette";
import { cn } from "@/lib/utils";

interface ComparisonTableProps {
  data: CompareResponse;
  /** Display/color order — same order the chart colors its lines. */
  tickers: string[];
}

interface CompareRow {
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

const signedPct = (value: number) => (
  <span className={isPositive(value) ? "text-success" : "text-destructive"}>
    {formatReturnPct(value)}
  </span>
);

const columns: ColumnDef<CompareRow>[] = [
  {
    accessorKey: "ticker",
    header: "Ticker",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: seriesColor(row.original.colorIndex) }}
        />
        {row.original.ticker}
      </div>
    ),
  },
  {
    accessorKey: "totalReturn",
    header: "Total",
    cell: ({ getValue }) => signedPct(getValue<number>()),
  },
  {
    accessorKey: "cagr",
    header: "CAGR",
    cell: ({ getValue }) => signedPct(getValue<number>()),
  },
  {
    accessorKey: "annualVol",
    header: "Volatility",
    cell: ({ getValue }) => formatPct(getValue<number>()),
  },
  {
    accessorKey: "sharpe",
    header: "Sharpe",
    cell: ({ getValue }) => formatNumber(getValue<number>()),
  },
  {
    accessorKey: "maxDrawdown",
    header: "Max DD",
    cell: ({ getValue }) => signedPct(getValue<number>()),
  },
  {
    accessorKey: "best",
    header: "Best day",
    cell: ({ getValue }) => signedPct(getValue<number>()),
  },
  {
    accessorKey: "worst",
    header: "Worst day",
    cell: ({ getValue }) => signedPct(getValue<number>()),
  },
  { accessorKey: "days", header: "Days" },
];

/**
 * Sortable risk/return table: one row per ticker. Metrics are computed
 * server-side over the common window, so they stay consistent with the growth
 * chart and correlation matrix. A color dot ties each row to its chart line.
 */
export function ComparisonTable({ data, tickers }: ComparisonTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalReturn", desc: true },
  ]);

  const rows: CompareRow[] = tickers
    .filter((t) => data.stats[t])
    .map((ticker, index) => {
      const s = data.stats[ticker];
      return {
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

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Risk &amp; return</h2>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="cursor-pointer select-none whitespace-nowrap hover:text-foreground">
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        <SortIcon sorted={sorted} />
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "whitespace-nowrap",
                      cell.column.id !== "ticker" && "tabular-nums",
                    )}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ArrowUp className="size-3" />;
  if (sorted === "desc") return <ArrowDown className="size-3" />;
  return <ChevronsUpDown className="size-3 opacity-40" />;
}
