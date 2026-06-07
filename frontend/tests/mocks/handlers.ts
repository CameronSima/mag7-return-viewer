import { http, HttpResponse } from "msw";
import type { CompareResponse, PortfolioResponse } from "@/types";

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

export const samplePortfolioResponse: PortfolioResponse = {
  growth: {
    Portfolio: [
      { date: "2024-01-02", value: 1.0 },
      { date: "2024-01-03", value: 1.03 },
      { date: "2024-01-04", value: 1.08 },
    ],
    SPY: [
      { date: "2024-01-02", value: 1.0 },
      { date: "2024-01-03", value: 1.01 },
      { date: "2024-01-04", value: 1.02 },
    ],
  },
  stats: {
    Portfolio: {
      total_return: 0.08,
      cagr: 0.12,
      annual_vol: 0.22,
      sharpe: 0.7,
      max_drawdown: -0.05,
      best: 0.04,
      worst: -0.03,
      count: 2,
    },
    SPY: {
      total_return: 0.02,
      cagr: 0.04,
      annual_vol: 0.15,
      sharpe: 0.3,
      max_drawdown: -0.02,
      best: 0.02,
      worst: -0.01,
      count: 2,
    },
  },
  correlation: {
    tickers: ["Portfolio", "SPY"],
    matrix: [
      [1.0, 0.85],
      [0.85, 1.0],
    ],
  },
  window: { start: "2024-01-02", end: "2024-01-04", trading_days: 3 },
  holdings: [
    { ticker: "AAPL", weight: 0.4, total_return: 0.1, risk_contribution: 0.35 },
    { ticker: "MSFT", weight: 0.3, total_return: 0.05, risk_contribution: 0.2 },
    { ticker: "NVDA", weight: 0.3, total_return: 0.2, risk_contribution: 0.45 },
  ],
  annual: [
    { year: 2023, partial: true, returns: { Portfolio: 0.05, SPY: 0.04 } },
    { year: 2024, partial: false, returns: { Portfolio: 0.18, SPY: 0.12 } },
  ],
  benchmark: "SPY",
  benchmark_metrics: {
    benchmark: "SPY",
    beta: 1.15,
    alpha: 0.04,
    r_squared: 0.88,
    tracking_error: 0.06,
    information_ratio: 0.65,
    correlation: 0.94,
  },
  missing: [],
};

export const handlers = [
  http.get("/api/compare", () => HttpResponse.json(sampleCompareResponse)),
  http.get("/api/portfolio", () => HttpResponse.json(samplePortfolioResponse)),
];
