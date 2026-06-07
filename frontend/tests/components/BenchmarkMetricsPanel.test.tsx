import { describe, it, expect } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import { BenchmarkMetricsPanel } from "@/components/BenchmarkMetricsPanel";
import type { BenchmarkMetrics } from "@/types";

const METRICS: BenchmarkMetrics = {
  benchmark: "SPY",
  beta: 1.15,
  alpha: 0.042,
  r_squared: 0.88,
  tracking_error: 0.06,
  information_ratio: 0.65,
  correlation: 0.94,
};

describe("BenchmarkMetricsPanel", () => {
  it("renders each metric with its formatted value", () => {
    renderWithProviders(<BenchmarkMetricsPanel metrics={METRICS} />);

    expect(screen.getByText("vs. SPY")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("1.15")).toBeInTheDocument(); // beta
    expect(screen.getByText("+4.20%")).toBeInTheDocument(); // alpha (signed)
    expect(screen.getByText("6.0%")).toBeInTheDocument(); // tracking error
    expect(screen.getByText("0.65")).toBeInTheDocument(); // information ratio
  });

  it("colors a negative alpha as a loss", () => {
    renderWithProviders(
      <BenchmarkMetricsPanel metrics={{ ...METRICS, alpha: -0.03 }} />,
    );
    const alpha = screen.getByText("-3.00%");
    expect(alpha).toHaveClass("text-destructive");
  });
});
