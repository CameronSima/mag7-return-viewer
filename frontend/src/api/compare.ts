import type { CompareResponse } from "@/types";
import { getJson } from "@/api/client";

/**
 * Fetch a comparison (normalized growth, risk stats, correlation) for a set of
 * tickers over a date range.
 *
 * @param tickers Ticker symbols, e.g. ["AAPL", "MSFT", "SPY"].
 * @param start ISO date string (YYYY-MM-DD), inclusive.
 * @param end ISO date string (YYYY-MM-DD), inclusive.
 * @throws ApiError when the request fails or the server returns an error status.
 */
export async function fetchComparison(
  tickers: string[],
  start: string,
  end: string,
  signal?: AbortSignal,
): Promise<CompareResponse> {
  const params = new URLSearchParams({ tickers: tickers.join(","), start, end });
  return getJson<CompareResponse>(`/api/compare?${params.toString()}`, signal);
}
