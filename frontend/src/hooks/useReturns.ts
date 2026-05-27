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
export function useReturns(start: string | null, end: string | null) {
  return useQuery<ReturnsResponse, Error>({
    queryKey: ["returns", start, end],
    queryFn: ({ signal }) => fetchReturns(start!, end!, signal),
    enabled: Boolean(start && end),
    staleTime: 5 * 60 * 1000, // 5 min, matches backend cache TTL
    retry: (failureCount, error) => {
      // Don't retry validation errors — the user input is wrong, not the server.
      if (error instanceof Error && "status" in error) {
        const status = (error as { status: number }).status;
        if (status === 422) return false;
      }
      return failureCount < 2;
    },
  });
}
