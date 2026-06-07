import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUrlState, type AppState } from "@/hooks/useUrlState";

const DEFAULTS: AppState = {
  mode: "compare",
  tickers: ["AAPL", "MSFT"],
  holdings: [{ ticker: "AAPL", weight: 0.5 }],
  rebalance: "none",
  benchmark: "SPY",
  start: "2020-01-01",
  end: "2024-01-01",
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useUrlState", () => {
  afterEach(() => {
    delete window.__SEO_STATE__;
  });

  it("falls back to defaults when the URL carries no state", () => {
    const { result } = renderHook(() => useUrlState(DEFAULTS));
    expect(result.current[0]).toEqual(DEFAULTS);
  });

  it("boots from a pre-rendered page's __SEO_STATE__ when the URL is bare", () => {
    window.__SEO_STATE__ = { mode: "compare", tickers: ["NVDA", "AMD"] };
    const { result } = renderHook(() => useUrlState(DEFAULTS));

    expect(result.current[0].mode).toBe("compare");
    expect(result.current[0].tickers).toEqual(["NVDA", "AMD"]);
    // Untouched fields keep their defaults.
    expect(result.current[0].start).toBe(DEFAULTS.start);
  });

  it("lets an explicit query string win over __SEO_STATE__", () => {
    window.__SEO_STATE__ = { mode: "compare", tickers: ["NVDA", "AMD"] };
    window.history.replaceState(null, "", "/?tickers=voo,vti");
    const { result } = renderHook(() => useUrlState(DEFAULTS));

    expect(result.current[0].tickers).toEqual(["VOO", "VTI"]);
  });

  it("hydrates compare state from the query string", () => {
    window.history.replaceState(
      null,
      "",
      "/?tickers=nvda,googl&start=2021-06-01&end=2023-06-01",
    );
    const { result } = renderHook(() => useUrlState(DEFAULTS));

    expect(result.current[0].mode).toBe("compare");
    expect(result.current[0].tickers).toEqual(["NVDA", "GOOGL"]); // uppercased
    expect(result.current[0].start).toBe("2021-06-01");
  });

  it("hydrates portfolio state (mode, holdings, rebalance, benchmark)", () => {
    window.history.replaceState(
      null,
      "",
      "/?mode=portfolio&holdings=NVDA:0.6,GOOGL:0.4&rebalance=monthly&benchmark=qqq",
    );
    const { result } = renderHook(() => useUrlState(DEFAULTS));

    expect(result.current[0].mode).toBe("portfolio");
    expect(result.current[0].holdings).toEqual([
      { ticker: "NVDA", weight: 0.6 },
      { ticker: "GOOGL", weight: 0.4 },
    ]);
    expect(result.current[0].rebalance).toBe("monthly");
    expect(result.current[0].benchmark).toBe("QQQ"); // uppercased
  });

  it("mirrors portfolio state changes into the URL", () => {
    const { result } = renderHook(() => useUrlState(DEFAULTS));

    act(() => {
      result.current[1]({
        ...DEFAULTS,
        mode: "portfolio",
        holdings: [{ ticker: "TSLA", weight: 1 }],
        rebalance: "quarterly",
        benchmark: null,
        start: null,
        end: null,
      });
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get("mode")).toBe("portfolio");
    expect(params.get("holdings")).toBe("TSLA:1");
    expect(params.get("rebalance")).toBe("quarterly");
    expect(params.get("benchmark")).toBeNull();
  });
});
