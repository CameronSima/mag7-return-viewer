import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "../test-utils";
import { TickerInput } from "@/components/TickerInput";

describe("TickerInput", () => {
  it("normalizes a free-typed symbol to uppercase on entry", async () => {
    const onChange = vi.fn();
    renderWithProviders(<TickerInput value={[]} onChange={onChange} max={10} />);

    const input = screen.getByLabelText(/tickers/i);
    await userEvent.setup().type(input, "aapl{enter}");

    expect(onChange).toHaveBeenCalledWith(["AAPL"]);
  });

  it("drops invalid symbols rather than passing them upstream", async () => {
    const onChange = vi.fn();
    renderWithProviders(<TickerInput value={[]} onChange={onChange} max={10} />);

    const input = screen.getByLabelText(/tickers/i);
    await userEvent.setup().type(input, "bad$sym{enter}");

    // Either not called, or called with an empty list — never with the bad symbol.
    for (const call of onChange.mock.calls) {
      expect(call[0]).not.toContain("BAD$SYM");
    }
  });

  it("shows the cap message once full", () => {
    const tickers = Array.from({ length: 10 }, (_, i) => `TKR${i}`);
    renderWithProviders(
      <TickerInput value={tickers} onChange={vi.fn()} max={10} />,
    );
    expect(screen.getByText(/maximum of 10 tickers/i)).toBeInTheDocument();
  });
});
