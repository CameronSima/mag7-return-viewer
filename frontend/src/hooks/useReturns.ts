import { useQuery } from "@tanstack/react-query";
import type { ReturnsResponse } from "@/types";
import { fetchReturns } from "@/api/returns";

/**
 * Fetch MAG7 returns for a date range. Returns React Query's full result
 * object so consuming components can render loading, error, and data states.
 *
 * Empty start/end disable the query — components can mount with the hook
 * inert and only fire when a valid range is chosen.
 */
export function useReturns(
  start: string | null,
  end: string | null,
  tickers: string[],
) {
  // Sorted so the cache key is order-independent, mirroring the backend's
  // canonicalized cache key — the same subset shares one React Query entry.
  const tickerKey = [...tickers].sort();
  return useQuery<ReturnsResponse, Error>({
    queryKey: ["returns", start, end, tickerKey],
    queryFn: ({ signal }) => fetchReturns(start!, end!, tickers, signal),
    enabled: Boolean(start && end) && tickers.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min, matches backend cache TTL
  });
}
