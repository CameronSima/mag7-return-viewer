import { http, HttpResponse } from "msw";
import type { CompareResponse } from "@/types";

/**
 * Default happy-path /compare response. Tests can override per-test via
 * server.use() for specific scenarios (errors, missing tickers, …).
 */
export const sampleCompareResponse: CompareResponse = {
  growth: {
    AAPL: [
      { date: "2024-01-02", value: 1.0 },
      { date: "2024-01-03", value: 1.05 },
      { date: "2024-01-04", value: 1.12 },
    ],
    MSFT: [
      { date: "2024-01-02", value: 1.0 },
      { date: "2024-01-03", value: 0.98 },
      { date: "2024-01-04", value: 1.03 },
    ],
  },
  stats: {
    AAPL: {
      total_return: 0.12,
      cagr: 0.18,
      annual_vol: 0.24,
      sharpe: 0.9,
      max_drawdown: -0.08,
      best: 0.07,
      worst: -0.05,
      count: 2,
    },
    MSFT: {
      total_return: 0.03,
      cagr: 0.05,
      annual_vol: 0.2,
      sharpe: 0.4,
      max_drawdown: -0.02,
      best: 0.05,
      worst: -0.02,
      count: 2,
    },
  },
  correlation: {
    tickers: ["AAPL", "MSFT"],
    matrix: [
      [1.0, 0.6],
      [0.6, 1.0],
    ],
  },
  window: { start: "2024-01-02", end: "2024-01-04", trading_days: 3 },
  missing: [],
};

export const handlers = [
  http.get("/api/compare", () => HttpResponse.json(sampleCompareResponse)),
];
