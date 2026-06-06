import type { Holding } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPct, formatReturnPct, isPositive } from "@/utils/stats";
import { seriesColor } from "@/utils/palette";

interface HoldingsTableProps {
  holdings: Holding[];
}

/**
 * Per-holding breakdown: normalized weight, the holding's total return over the
 * window, and its weighted contribution (weight × return) — a quick read on
 * which names drove the portfolio.
 */
export function HoldingsTable({ holdings }: HoldingsTableProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Holdings</h2>
      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Ticker</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="text-right">Total return</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h, index) => (
              <TableRow key={h.ticker}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: seriesColor(index) }}
                    />
                    {h.ticker}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPct(h.weight)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    isPositive(h.total_return)
                      ? "text-success"
                      : "text-destructive"
                  }`}>
                  {formatReturnPct(h.total_return)}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${
                    isPositive(h.weight * h.total_return)
                      ? "text-success"
                      : "text-destructive"
                  }`}>
                  {formatReturnPct(h.weight * h.total_return)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
