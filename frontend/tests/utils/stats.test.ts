import { describe, it, expect } from "vitest";
import { formatReturnPct, isPositive } from "@/utils/stats";

describe("formatReturnPct", () => {
  it("formats positive returns with a plus sign and two decimals", () => {
    expect(formatReturnPct(0.0042)).toBe("+0.42%");
  });

  it("formats negative returns with a minus sign and two decimals", () => {
    expect(formatReturnPct(-0.013)).toBe("-1.30%");
  });

  it("formats zero as +0.00%", () => {
    expect(formatReturnPct(0)).toBe("+0.00%");
  });
});

describe("isPositive", () => {
  it("returns true for positive values", () => {
    expect(isPositive(0.01)).toBe(true);
  });

  it("returns false for negative values", () => {
    expect(isPositive(-0.01)).toBe(false);
  });

  it("returns true for zero (visual stability)", () => {
    expect(isPositive(0)).toBe(true);
  });
});
