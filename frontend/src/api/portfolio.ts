import type { HoldingInput, PortfolioResponse, RebalanceFreq } from "@/types";
import { getJson } from "@/api/client";

/**
 * Backtest a weighted portfolio against an optional benchmark over a date range.
 *
 * @param holdings Tickers with their (pre-normalized) weights.
 * @param start ISO date string (YYYY-MM-DD), inclusive.
 * @param end ISO date string (YYYY-MM-DD), inclusive.
 * @param rebalance How often to rebalance back to target weights.
 * @param benchmark Optional benchmark symbol (e.g. "SPY").
 * @throws ApiError when the request fails or the server returns an error status.
 */
export async function fetchPortfolio(
  holdings: HoldingInput[],
  start: string,
  end: string,
  rebalance: RebalanceFreq,
  benchmark: string | null,
  signal?: AbortSignal,
): Promise<PortfolioResponse> {
  const params = new URLSearchParams({
    tickers: holdings.map((h) => h.ticker).join(","),
    weights: holdings.map((h) => h.weight).join(","),
    rebalance,
    start,
    end,
  });
  if (benchmark) params.set("benchmark", benchmark);
  return getJson<PortfolioResponse>(
    `/api/portfolio?${params.toString()}`,
    signal,
  );
}
