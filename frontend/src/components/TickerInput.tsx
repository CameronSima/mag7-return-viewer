import { Autocomplete, Chip, TextField } from "@mui/material";
import { BENCHMARK_TICKERS, MAG7_TICKERS } from "@/types";

interface TickerInputProps {
  value: string[];
  onChange: (tickers: string[]) => void;
  /** Max tickers accepted; mirrors the backend's MAX_COMPARE_TICKERS. */
  max: number;
}

// Suggestions offered in the dropdown: the MAG7 plus common benchmarks.
const SUGGESTIONS: string[] = [...MAG7_TICKERS, ...BENCHMARK_TICKERS];

// Same charset the backend enforces, so we reject obviously-bad input client-side.
const VALID_TICKER = /^[A-Z0-9.-]{1,12}$/;

/**
 * Multi-select ticker entry with chips. Accepts free-typed symbols (uppercased)
 * and offers MAG7 + benchmark suggestions. Normalizes on every change: trims,
 * uppercases, validates the charset, dedupes, and caps at `max` — so the value
 * handed upstream is always clean and ready to send.
 */
export function TickerInput({ value, onChange, max }: TickerInputProps) {
  const atCap = value.length >= max;

  const handleChange = (next: readonly string[]) => {
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const raw of next) {
      const symbol = raw.trim().toUpperCase();
      if (!VALID_TICKER.test(symbol) || seen.has(symbol)) continue;
      seen.add(symbol);
      cleaned.push(symbol);
    }
    onChange(cleaned.slice(0, max));
  };

  return (
    <Autocomplete
      multiple
      freeSolo
      options={SUGGESTIONS}
      value={value}
      onChange={(_event, next) => handleChange(next)}
      // Hide the dropdown once full so the cap is obvious. Spread conditionally
      // so we never pass an explicit `undefined` (exactOptionalPropertyTypes).
      {...(atCap ? { filterOptions: () => [] } : {})}
      renderValue={(values, getItemProps) =>
        values.map((option, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <Chip key={key} label={option} size="small" {...itemProps} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Tickers"
          placeholder={atCap ? "" : "Add a symbol…"}
          helperText={
            atCap
              ? `Maximum of ${max} tickers`
              : "Type a symbol and press Enter (e.g. AAPL, SPY)"
          }
          size="small"
        />
      )}
    />
  );
}
