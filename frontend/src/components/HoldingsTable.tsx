import { ArrowDown, ArrowUp } from "lucide-react";
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

// Flag a holding whose risk share diverges from its weight by ≥2 points — the
// concentration (or diversification) that a weight column alone would hide.
const DIVERGENCE = 0.02;

/**
 * Per-holding breakdown: normalized weight, share of portfolio risk, total
 * return over the window, and weighted contribution (weight × return). The Risk
 * column accounts for each holding's volatility *and* its correlation with the
 * rest, so it can diverge from weight — an up arrow flags a name carrying more
 * risk than its weight, a down arrow a diversifier carrying less.
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
              <TableHead className="text-right">Risk</TableHead>
              <TableHead className="text-right">Total return</TableHead>
              <TableHead className="text-right">Contribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((h, index) => {
              const overweightRisk = h.risk_contribution - h.weight;
              return (
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
                  <TableCell className="text-right font-medium tabular-nums">
                    <span className="inline-flex items-center justify-end gap-1">
                      {formatPct(h.risk_contribution)}
                      {overweightRisk > DIVERGENCE && (
                        <ArrowUp
                          className="size-3 text-muted-foreground"
                          aria-label="more risk than weight"
                        />
                      )}
                      {overweightRisk < -DIVERGENCE && (
                        <ArrowDown
                          className="size-3 text-muted-foreground"
                          aria-label="less risk than weight"
                        />
                      )}
                    </span>
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
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Risk is each holding's share of portfolio volatility — it factors in the
        holding's own volatility and its correlation with the rest, so it can
        differ from weight.
      </p>
    </section>
  );
}
