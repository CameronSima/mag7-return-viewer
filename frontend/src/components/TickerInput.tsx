import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BENCHMARK_TICKERS, MAG7_TICKERS } from "@/types";
import { cn } from "@/lib/utils";

interface TickerInputProps {
  value: string[];
  onChange: (tickers: string[]) => void;
  /** Max tickers accepted; mirrors the backend's MAX_COMPARE_TICKERS. */
  max: number;
}

// Suggestions offered in the dropdown: the MAG7 plus common benchmarks.
const SUGGESTIONS: string[] = [...MAG7_TICKERS, ...BENCHMARK_TICKERS];

// Same charset the backend enforces, so obviously-bad input is rejected early.
const VALID_TICKER = /^[A-Z0-9.-]{1,12}$/;

/**
 * Multi-select ticker entry with chips. Accepts free-typed symbols (Enter or
 * comma to commit) and offers MAG7 + benchmark suggestions. Every committed
 * value is trimmed, uppercased, validated, deduped, and capped at `max`, so the
 * array handed upstream is always clean and ready to send.
 */
export function TickerInput({ value, onChange, max }: TickerInputProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const atCap = value.length >= max;

  const addTicker = (raw: string) => {
    const symbol = raw.trim().toUpperCase();
    setInput("");
    if (!VALID_TICKER.test(symbol) || value.includes(symbol) || atCap) return;
    onChange([...value, symbol]);
  };

  const removeTicker = (symbol: string) =>
    onChange(value.filter((t) => t !== symbol));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input.trim()) addTicker(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTicker(value[value.length - 1]);
    }
  };

  const suggestions = SUGGESTIONS.filter(
    (s) => !value.includes(s) && s.startsWith(input.trim().toUpperCase()),
  );

  return (
    <div className="relative flex flex-col gap-1.5">
      <Label htmlFor="ticker-input">Tickers</Label>

      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
        )}
        onClick={() => inputRef.current?.focus()}>
        {value.map((ticker) => (
          <Badge key={ticker} variant="accent" className="gap-1 pr-1">
            {ticker}
            <button
              type="button"
              aria-label={`Remove ${ticker}`}
              onClick={(e) => {
                e.stopPropagation();
                removeTicker(ticker);
              }}
              className="rounded-sm hover:bg-primary/20">
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <input
          id="ticker-input"
          ref={inputRef}
          value={input}
          disabled={atCap}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={atCap ? "" : value.length ? "" : "Add a symbol…"}
          className="min-w-[6rem] flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>

      {open && !atCap && suggestions.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              // onMouseDown (not onClick) so the selection lands before the
              // input's blur closes the dropdown.
              onMouseDown={(e) => {
                e.preventDefault();
                addTicker(s);
              }}
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground">
              {s}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {atCap
          ? `Maximum of ${max} tickers`
          : "Type a symbol and press Enter (e.g. AAPL, SPY)"}
      </p>
    </div>
  );
}
