import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import { AnnualReturns } from "@/components/AnnualReturns";
import type { AnnualReturn } from "@/types";

// Plotly needs canvas (absent in jsdom); stub the chart library.
vi.mock("react-plotly.js", () => ({
  default: () => <div data-testid="plotly-chart" />,
}));

const ANNUAL: AnnualReturn[] = [
  { year: 2023, partial: true, returns: { Portfolio: 0.05, SPY: 0.04 } },
  { year: 2024, partial: false, returns: { Portfolio: -0.12, SPY: 0.1 } },
];

describe("AnnualReturns", () => {
  it("renders a column per series and a row per year", () => {
    renderWithProviders(
      <AnnualReturns annual={ANNUAL} tickers={["Portfolio", "SPY"]} />,
    );

    // Column headers (series) + year rows.
    expect(
      screen.getByRole("columnheader", { name: "Portfolio" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "SPY" })).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();

    // Signed, formatted returns.
    expect(screen.getByText("+5.00%")).toBeInTheDocument();
    expect(screen.getByText("-12.00%")).toBeInTheDocument();
  });

  it("flags a partial year", () => {
    renderWithProviders(
      <AnnualReturns annual={ANNUAL} tickers={["Portfolio", "SPY"]} />,
    );
    expect(screen.getByText("partial")).toBeInTheDocument();
  });

  it("renders nothing when there are no years", () => {
    const { container } = renderWithProviders(
      <AnnualReturns annual={[]} tickers={["Portfolio"]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
