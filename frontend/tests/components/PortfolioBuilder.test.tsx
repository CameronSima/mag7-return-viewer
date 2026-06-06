import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../test-utils";
import { PortfolioBuilder } from "@/components/PortfolioBuilder";
import type { HoldingInput } from "@/types";

function setup(holdings: HoldingInput[]) {
  const onHoldingsChange = vi.fn();
  renderWithProviders(
    <PortfolioBuilder
      holdings={holdings}
      onHoldingsChange={onHoldingsChange}
      rebalance="none"
      onRebalanceChange={vi.fn()}
      benchmark="SPY"
      onBenchmarkChange={vi.fn()}
      max={10}
    />,
  );
  return { onHoldingsChange };
}

describe("PortfolioBuilder", () => {
  it("renders a weight input per holding", () => {
    setup([
      { ticker: "AAPL", weight: 0.4 },
      { ticker: "MSFT", weight: 0.6 },
    ]);
    expect(screen.getByLabelText("AAPL weight")).toBeInTheDocument();
    expect(screen.getByLabelText("MSFT weight")).toBeInTheDocument();
    // Normalized percentages are shown.
    expect(screen.getByText("40.0%")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
  });

  it("adds a free-typed holding (uppercased) on Enter", async () => {
    const { onHoldingsChange } = setup([{ ticker: "AAPL", weight: 0.4 }]);
    await userEvent.setup().type(screen.getByLabelText("Add holding"), "nvda{enter}");

    expect(onHoldingsChange).toHaveBeenCalledTimes(1);
    const next = onHoldingsChange.mock.calls[0][0] as HoldingInput[];
    expect(next.map((h) => h.ticker)).toEqual(["AAPL", "NVDA"]);
  });

  it("equalizes weights", async () => {
    const { onHoldingsChange } = setup([
      { ticker: "AAPL", weight: 0.7 },
      { ticker: "MSFT", weight: 0.3 },
    ]);
    await userEvent.setup().click(screen.getByRole("button", { name: /equal weight/i }));

    const next = onHoldingsChange.mock.calls[0][0] as HoldingInput[];
    expect(next.every((h) => h.weight === 1)).toBe(true);
  });

  it("removes a holding", async () => {
    const { onHoldingsChange } = setup([
      { ticker: "AAPL", weight: 0.5 },
      { ticker: "MSFT", weight: 0.5 },
    ]);
    await userEvent.setup().click(screen.getByLabelText("Remove AAPL"));

    const next = onHoldingsChange.mock.calls[0][0] as HoldingInput[];
    expect(next.map((h) => h.ticker)).toEqual(["MSFT"]);
  });
});
