import { describe, it, expect } from "vitest";
import {
  compareSlug,
  comparePath,
  defaultMeta,
  metaForState,
  tickersFromSlug,
  type SeoInput,
} from "@/lib/seo";

const base: SeoInput = {
  mode: "compare",
  tickers: [],
  holdings: [],
  benchmark: null,
};

describe("metaForState", () => {
  it("builds a 'vs' title and total-return description for a comparison", () => {
    const { title, description } = metaForState({
      ...base,
      tickers: ["AAPL", "MSFT", "NVDA"],
    });
    expect(title).toBe(
      "AAPL vs MSFT vs NVDA — total return comparison | Stock Comparison",
    );
    expect(description).toContain("AAPL, MSFT and NVDA");
    expect(description).toContain("total return");
  });

  it("builds a backtest title for a portfolio, including the benchmark", () => {
    const { title } = metaForState({
      ...base,
      mode: "portfolio",
      holdings: [{ ticker: "AAPL" }, { ticker: "MSFT" }],
      benchmark: "SPY",
    });
    expect(title).toBe("AAPL and MSFT portfolio backtest vs. SPY | Stock Comparison");
  });

  it("falls back to the default meta when there is no selection", () => {
    expect(metaForState(base)).toEqual(defaultMeta());
    expect(metaForState({ ...base, mode: "portfolio" })).toEqual(defaultMeta());
  });
});

describe("slugs", () => {
  it("round-trips tickers through the comparison slug", () => {
    expect(compareSlug(["AAPL", "MSFT"])).toBe("aapl-vs-msft");
    expect(comparePath(["AAPL", "MSFT"])).toBe("/compare/aapl-vs-msft/");
    expect(tickersFromSlug("aapl-vs-msft")).toEqual(["AAPL", "MSFT"]);
  });

  it("preserves hyphenated tickers like BRK-B", () => {
    const tickers = ["AAPL", "BRK-B"];
    expect(tickersFromSlug(compareSlug(tickers))).toEqual(tickers);
  });
});
