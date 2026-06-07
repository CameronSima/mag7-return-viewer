import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../test-utils";
import { CommandPalette } from "@/components/CommandPalette";
import type { AppState } from "@/hooks/useUrlState";

const STATE: AppState = {
  mode: "compare",
  tickers: ["AAPL", "MSFT"],
  holdings: [{ ticker: "AAPL", weight: 1 }],
  rebalance: "none",
  benchmark: "SPY",
  start: "2020-01-01",
  end: "2024-01-01",
};

function setup(overrides: Partial<AppState> = {}) {
  const setState = vi.fn();
  const onShare = vi.fn();
  const onOpenChange = vi.fn();
  renderWithProviders(
    <CommandPalette
      open
      onOpenChange={onOpenChange}
      state={{ ...STATE, ...overrides }}
      setState={setState}
      onShare={onShare}
    />,
  );
  return { setState, onShare, onOpenChange };
}

describe("CommandPalette", () => {
  it("renders the search input and grouped commands", () => {
    setup();
    expect(
      screen.getByPlaceholderText(/type a command or search/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Switch to Portfolio")).toBeInTheDocument();
    expect(screen.getByText("MAG7")).toBeInTheDocument();
    expect(screen.getByText("Last 5 years")).toBeInTheDocument();
  });

  it("offers 'Switch to Compare' when already in portfolio mode", () => {
    setup({ mode: "portfolio" });
    expect(screen.getByText("Switch to Compare")).toBeInTheDocument();
  });

  it("switches mode and closes when a mode command is run", async () => {
    const { setState, onOpenChange } = setup();
    await userEvent.setup().click(screen.getByText("Switch to Portfolio"));

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "portfolio" }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("applies a ticker preset (forcing compare mode)", async () => {
    const { setState } = setup({ mode: "portfolio" });
    await userEvent.setup().click(screen.getByText("Index battle"));

    expect(setState).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "compare",
        tickers: ["SPY", "QQQ", "DIA", "IWM"],
      }),
    );
  });

  it("runs the share action", async () => {
    const { onShare } = setup();
    await userEvent.setup().click(screen.getByText("Copy share link"));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("filters commands by the typed query", async () => {
    setup();
    await userEvent.setup().type(
      screen.getByPlaceholderText(/type a command or search/i),
      "battle",
    );
    expect(screen.getByText("Index battle")).toBeInTheDocument();
    expect(screen.queryByText("Switch to Portfolio")).not.toBeInTheDocument();
  });
});
