import { http, HttpResponse } from "msw";
import type { ReturnsResponse } from "@/types";

/**
 * Default happy-path response. Tests can override per-test via
 * server.use() for specific scenarios.
 */
export const sampleResponse: ReturnsResponse = {
  returns: {
    MSFT: [
      { date: "2024-01-02", return: 0.01 },
      { date: "2024-01-03", return: 0.005 },
    ],
    AAPL: [
      { date: "2024-01-02", return: -0.005 },
      { date: "2024-01-03", return: 0.002 },
    ],
    GOOGL: [{ date: "2024-01-02", return: 0.003 }],
    AMZN: [{ date: "2024-01-02", return: -0.001 }],
    NVDA: [{ date: "2024-01-02", return: 0.02 }],
    META: [{ date: "2024-01-02", return: 0.008 }],
    TSLA: [{ date: "2024-01-02", return: -0.015 }],
  },
  stats: {
    MSFT: { min: 0.005, max: 0.01, mean: 0.0075, count: 2, vol: 0.056, sharpe: 2.13 },
    AAPL: { min: -0.005, max: 0.002, mean: -0.0015, count: 2, vol: 0.079, sharpe: -0.3 },
    GOOGL: { min: 0.003, max: 0.003, mean: 0.003, count: 1, vol: 0, sharpe: 0 },
    AMZN: { min: -0.001, max: -0.001, mean: -0.001, count: 1, vol: 0, sharpe: 0 },
    NVDA: { min: 0.02, max: 0.02, mean: 0.02, count: 1, vol: 0, sharpe: 0 },
    META: { min: 0.008, max: 0.008, mean: 0.008, count: 1, vol: 0, sharpe: 0 },
    TSLA: { min: -0.015, max: -0.015, mean: -0.015, count: 1, vol: 0, sharpe: 0 },
  },
};

export const handlers = [
  http.get("/api/returns", () => HttpResponse.json(sampleResponse)),
];
