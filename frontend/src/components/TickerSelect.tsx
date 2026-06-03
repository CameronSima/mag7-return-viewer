import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { MAG7_TICKERS } from "@/types";
import type { Ticker } from "@/types";

interface TickerSelectProps {
  selected: Ticker[];
  onChange: (selected: Ticker[]) => void;
}

/**
 * Multi-select toggle for choosing which MAG7 names to chart.
 *
 * A subset selection rather than free-text entry: the backend whitelists the
 * MAG7, so the UI offers exactly those. Order is the canonical display order,
 * not selection order, so the grid below stays stable as names are toggled.
 */
export function TickerSelect({ selected, onChange }: TickerSelectProps) {
  return (
    <ToggleButtonGroup
      value={selected}
      onChange={(_e, next: Ticker[]) => onChange(next)}
      size="small"
      color="primary"
      aria-label="Ticker selection"
      sx={{ flexWrap: "wrap" }}>
      {MAG7_TICKERS.map((ticker) => (
        <ToggleButton key={ticker} value={ticker} aria-label={ticker}>
          {ticker}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
