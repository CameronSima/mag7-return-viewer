import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import { RollingCharts } from "@/components/RollingCharts";
import type { RollingBlock } from "@/types";

// Plotly needs canvas (absent in jsdom); stub the chart library.
vi.mock("react-plotly.js", () => ({
  default: () => <div data-testid="plotly-chart" />,
}));

const ROLLING: RollingBlock = {
  window: 63,
  volatility: {
    AAPL: [{ date: "2024-01-02", value: 0.22 }],
    MSFT: [{ date: "2024-01-02", value: 0.18 }],
  },
  correlation: {
    MSFT: [{ date: "2024-01-02", value: 0.6 }],
  },
  reference: "AAPL",
};

describe("RollingCharts", () => {
  it("renders a volatility and a correlation chart with the window + reference", () => {
    renderWithProviders(
      <RollingCharts rolling={ROLLING} order={["AAPL", "MSFT"]} />,
    );
    expect(screen.getByText("Rolling volatility · 63d")).toBeInTheDocument();
    expect(
      screen.getByText("Rolling correlation · 63d vs AAPL"),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId("plotly-chart")).toHaveLength(2);
  });

  it("renders only the volatility chart when there's no correlation series", () => {
    renderWithProviders(
      <RollingCharts
        rolling={{ ...ROLLING, correlation: {}, reference: null }}
        order={["AAPL"]}
      />,
    );
    expect(screen.getByText("Rolling volatility · 63d")).toBeInTheDocument();
    expect(screen.queryByText(/Rolling correlation/)).not.toBeInTheDocument();
    expect(screen.getAllByTestId("plotly-chart")).toHaveLength(1);
  });

  it("renders nothing when the range was too short to roll", () => {
    const { container } = renderWithProviders(
      <RollingCharts
        rolling={{ window: 63, volatility: {}, correlation: {}, reference: null }}
        order={[]}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
