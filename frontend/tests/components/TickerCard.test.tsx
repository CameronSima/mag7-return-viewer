import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import { TickerCard } from "@/components/TickerCard";

// Mock Plotly: jsdom doesn't implement canvas, and Plotly inits aggressively.
// We render a placeholder so we can assert structure without the chart engine.
vi.mock("react-plotly.js", () => ({
  default: () => <div data-testid="plotly-chart" />,
}));

describe("TickerCard", () => {
  const baseProps = {
    ticker: "MSFT",
    data: [
      { date: "2024-01-02", return: 0.01 },
      { date: "2024-01-03", return: -0.005 },
    ],
    stats: { min: -0.005, max: 0.01, mean: 0.0025 },
  };

  it("renders the ticker symbol and chart", () => {
    renderWithProviders(<TickerCard {...baseProps} />);
    expect(screen.getByText("MSFT")).toBeInTheDocument();
    expect(screen.getByTestId("plotly-chart")).toBeInTheDocument();
  });

  it("displays min/mean/max formatted as percentages", () => {
    renderWithProviders(<TickerCard {...baseProps} />);
    expect(screen.getByText("-0.50%")).toBeInTheDocument(); // min
    expect(screen.getByText("+1.00%")).toBeInTheDocument(); // max
    // Mean appears twice (header + stat row), so use getAllByText.
    const meanMatches = screen.getAllByText("+0.25%");
    expect(meanMatches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders without crashing on empty data", () => {
    renderWithProviders(
      <TickerCard
        ticker="MSFT"
        data={[]}
        stats={{ min: 0, max: 0, mean: 0 }}
      />,
    );
    expect(screen.getByText("MSFT")).toBeInTheDocument();
  });
});
