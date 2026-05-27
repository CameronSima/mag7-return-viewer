import { Box } from "@mui/material";
import { TickerCard } from "./TickerCard";
import { MAG7_TICKERS } from "@/types";
import type { ReturnsResponse } from "@/types";

interface ReturnsGridProps {
  data: ReturnsResponse;
}

/**
 * Responsive grid of TickerCards, one per MAG7 ticker.
 *
 * Iterates over the canonical MAG7_TICKERS list (not Object.keys on the
 * response) so display order is stable regardless of how the server
 * orders its JSON output.
 */
export function ReturnsGrid({ data }: ReturnsGridProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
        },
      }}>
      {MAG7_TICKERS.map((ticker) => {
        const series = data.returns[ticker] ?? [];
        const stats = data.stats[ticker] ?? { min: 0, max: 0, mean: 0, count: 0 };
        return (
          <TickerCard
            key={ticker}
            ticker={ticker}
            data={series}
            stats={stats}
          />
        );
      })}
    </Box>
  );
}
