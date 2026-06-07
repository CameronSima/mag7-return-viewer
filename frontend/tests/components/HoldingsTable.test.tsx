import { describe, it, expect } from "vitest";
import { renderWithProviders, screen, within } from "../test-utils";
import { HoldingsTable } from "@/components/HoldingsTable";
import type { Holding } from "@/types";

const HOLDINGS: Holding[] = [
  // Weight 30% but 50% of risk — a concentration the weight column hides.
  { ticker: "NVDA", weight: 0.3, total_return: 0.2, risk_contribution: 0.5 },
  // Weight 40% but only 25% of risk — a diversifier.
  { ticker: "AAPL", weight: 0.4, total_return: 0.1, risk_contribution: 0.25 },
];

function rowFor(ticker: string) {
  return screen.getByText(ticker).closest("tr") as HTMLElement;
}

describe("HoldingsTable", () => {
  it("renders weight and risk as separate columns", () => {
    renderWithProviders(<HoldingsTable holdings={HOLDINGS} />);

    expect(
      screen.getByRole("columnheader", { name: "Weight" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Risk" })).toBeInTheDocument();

    const nvda = within(rowFor("NVDA"));
    expect(nvda.getByText("30.0%")).toBeInTheDocument(); // weight
    expect(nvda.getByText("50.0%")).toBeInTheDocument(); // risk
  });

  it("flags a holding carrying more risk than its weight", () => {
    renderWithProviders(<HoldingsTable holdings={HOLDINGS} />);
    expect(
      within(rowFor("NVDA")).getByLabelText("more risk than weight"),
    ).toBeInTheDocument();
  });

  it("flags a diversifier carrying less risk than its weight", () => {
    renderWithProviders(<HoldingsTable holdings={HOLDINGS} />);
    expect(
      within(rowFor("AAPL")).getByLabelText("less risk than weight"),
    ).toBeInTheDocument();
  });
});
