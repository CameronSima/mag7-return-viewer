import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import { ComparisonTable } from "@/components/ComparisonTable";
import { sampleCompareResponse } from "../mocks/handlers";

describe("ComparisonTable", () => {
  it("renders a row per ticker with formatted risk/return metrics", () => {
    renderWithProviders(
      <ComparisonTable
        data={sampleCompareResponse}
        tickers={["AAPL", "MSFT"]}
      />,
    );

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();

    // total_return 0.12 -> "+12.00%" (signed), annual_vol 0.24 -> "24.0%" (unsigned).
    expect(screen.getByText("+12.00%")).toBeInTheDocument();
    expect(screen.getByText("24.0%")).toBeInTheDocument();
    // Sharpe formatted to two decimals.
    expect(screen.getByText("0.90")).toBeInTheDocument();
  });

  it("skips tickers that have no stats", () => {
    renderWithProviders(
      <ComparisonTable
        data={sampleCompareResponse}
        tickers={["AAPL", "MSFT", "NODATA"]}
      />,
    );
    expect(screen.queryByText("NODATA")).toBeNull();
  });
});
