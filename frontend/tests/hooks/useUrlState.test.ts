import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useUrlState } from "@/hooks/useUrlState";

const DEFAULTS = {
  tickers: ["AAPL", "MSFT"],
  start: "2020-01-01",
  end: "2024-01-01",
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("useUrlState", () => {
  it("falls back to defaults when the URL has no tickers", () => {
    const { result } = renderHook(() => useUrlState(DEFAULTS));
    expect(result.current[0]).toEqual(DEFAULTS);
  });

  it("hydrates from the query string when present", () => {
    window.history.replaceState(
      null,
      "",
      "/?tickers=nvda,googl&start=2021-06-01&end=2023-06-01",
    );
    const { result } = renderHook(() => useUrlState(DEFAULTS));

    expect(result.current[0]).toEqual({
      tickers: ["NVDA", "GOOGL"], // uppercased
      start: "2021-06-01",
      end: "2023-06-01",
    });
  });

  it("mirrors state changes into the URL", () => {
    const { result } = renderHook(() => useUrlState(DEFAULTS));

    act(() => {
      result.current[1]({ tickers: ["TSLA"], start: null, end: null });
    });

    expect(window.location.search).toBe("?tickers=TSLA");
    expect(result.current[0].tickers).toEqual(["TSLA"]);
  });
});
