import { useQuery } from "@tanstack/react-query";
import type { CompareResponse } from "@/types";
import { fetchComparison } from "@/api/compare";

/**
 * Fetch a ticker comparison for a date range. Returns React Query's full result
 * object so components can render loading, error, and data states.
 *
 * The query is disabled until there's at least one ticker and a full date range,
 * so the app can mount inert and only fire once there's something to compare.
 * The query key sorts tickers so {AAPL,MSFT} and {MSFT,AAPL} share a cache entry
 * (matching the backend's order-independent cache key).
 */
export function useComparison(
  tickers: string[],
  start: string | null,
  end: string | null,
) {
  return useQuery<CompareResponse, Error>({
    queryKey: ["compare", [...tickers].sort().join(","), start, end],
    queryFn: ({ signal }) => fetchComparison(tickers, start!, end!, signal),
    enabled: tickers.length > 0 && Boolean(start && end),
    staleTime: 5 * 60 * 1000, // 5 min, matches backend cache TTL
  });
}
