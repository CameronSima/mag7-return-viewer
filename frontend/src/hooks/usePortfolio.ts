import { useQuery } from "@tanstack/react-query";
import type { HoldingInput, PortfolioResponse, RebalanceFreq } from "@/types";
import { fetchPortfolio } from "@/api/portfolio";

/**
 * Backtest a portfolio for a date range. Returns React Query's full result so
 * components can render loading, error, and data states.
 *
 * Disabled until there's at least one holding and a full date range. The query
 * key includes the (sorted) holdings, rebalance, and benchmark so distinct
 * portfolios cache independently while reorderings share an entry.
 */
export function usePortfolio(
  holdings: HoldingInput[],
  start: string | null,
  end: string | null,
  rebalance: RebalanceFreq,
  benchmark: string | null,
) {
  const key = [...holdings]
    .map((h) => `${h.ticker}:${h.weight}`)
    .sort()
    .join(",");

  return useQuery<PortfolioResponse, Error>({
    queryKey: ["portfolio", key, rebalance, benchmark, start, end],
    queryFn: ({ signal }) =>
      fetchPortfolio(holdings, start!, end!, rebalance, benchmark, signal),
    enabled: holdings.length > 0 && Boolean(start && end),
    staleTime: 5 * 60 * 1000, // 5 min, matches backend cache TTL
  });
}
