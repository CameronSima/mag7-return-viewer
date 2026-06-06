import { useState } from "react";
import { Scale, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REBALANCE_OPTIONS,
  type HoldingInput,
  type RebalanceFreq,
} from "@/types";
import { seriesColor } from "@/utils/palette";

interface PortfolioBuilderProps {
  holdings: HoldingInput[];
  onHoldingsChange: (holdings: HoldingInput[]) => void;
  rebalance: RebalanceFreq;
  onRebalanceChange: (rebalance: RebalanceFreq) => void;
  benchmark: string | null;
  onBenchmarkChange: (benchmark: string | null) => void;
  max: number;
}

const VALID_TICKER = /^[A-Z0-9.-]{1,12}$/;

/**
 * Editor for a weighted portfolio: add/remove holdings, tune each weight (shown
 * normalized to 100%), choose a rebalance frequency, and set a benchmark. Raw
 * weights are kept as entered; normalization for display and the request happens
 * downstream, so the inputs stay intuitive.
 */
export function PortfolioBuilder({
  holdings,
  onHoldingsChange,
  rebalance,
  onRebalanceChange,
  benchmark,
  onBenchmarkChange,
  max,
}: PortfolioBuilderProps) {
  const [draft, setDraft] = useState("");
  const total = holdings.reduce((sum, h) => sum + h.weight, 0) || 1;
  const atCap = holdings.length >= max;

  const addHolding = () => {
    const ticker = draft.trim().toUpperCase();
    setDraft("");
    if (!VALID_TICKER.test(ticker) || atCap) return;
    if (holdings.some((h) => h.ticker === ticker)) return;
    // New holding gets the average of existing weights (or 1), so adding one
    // doesn't lopsidedly dominate the mix.
    const avg = holdings.length
      ? holdings.reduce((s, h) => s + h.weight, 0) / holdings.length
      : 1;
    onHoldingsChange([...holdings, { ticker, weight: avg }]);
  };

  const updateWeight = (ticker: string, weight: number) => {
    if (!Number.isFinite(weight) || weight <= 0) return;
    onHoldingsChange(
      holdings.map((h) => (h.ticker === ticker ? { ...h, weight } : h)),
    );
  };

  const removeHolding = (ticker: string) =>
    onHoldingsChange(holdings.filter((h) => h.ticker !== ticker));

  const equalize = () =>
    onHoldingsChange(holdings.map((h) => ({ ...h, weight: 1 })));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Holdings</Label>
          {holdings.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={equalize}
              className="h-7 text-xs text-muted-foreground">
              <Scale className="size-3.5" />
              Equal weight
            </Button>
          )}
        </div>

        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border">
          {holdings.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No holdings yet — add a ticker below.
            </p>
          )}
          {holdings.map((holding, index) => (
            <div
              key={holding.ticker}
              className="flex items-center gap-3 px-3 py-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seriesColor(index) }}
              />
              <Badge variant="outline" className="w-16 justify-center">
                {holding.ticker}
              </Badge>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={holding.weight}
                onChange={(e) =>
                  updateWeight(holding.ticker, Number(e.target.value))
                }
                aria-label={`${holding.ticker} weight`}
                className="h-8 w-24"
              />
              <span className="w-14 text-right text-sm tabular-nums text-muted-foreground">
                {((holding.weight / total) * 100).toFixed(1)}%
              </span>
              <button
                type="button"
                aria-label={`Remove ${holding.ticker}`}
                onClick={() => removeHolding(holding.ticker)}
                className="ml-auto rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={draft}
            disabled={atCap}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addHolding();
              }
            }}
            placeholder={atCap ? `Maximum of ${max} holdings` : "Add ticker, e.g. AAPL"}
            aria-label="Add holding"
            className="h-8"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={addHolding}
            disabled={atCap || !draft.trim()}>
            Add
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-col gap-1.5 sm:w-44">
          <Label htmlFor="benchmark-input">Benchmark</Label>
          <Input
            id="benchmark-input"
            value={benchmark ?? ""}
            onChange={(e) =>
              onBenchmarkChange(e.target.value.toUpperCase() || null)
            }
            placeholder="e.g. SPY (optional)"
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:w-44">
          <Label>Rebalance</Label>
          <Select
            value={rebalance}
            onValueChange={(v) => onRebalanceChange(v as RebalanceFreq)}>
            <SelectTrigger aria-label="Rebalance frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REBALANCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
