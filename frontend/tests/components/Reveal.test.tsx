import { describe, it, expect, vi, afterEach } from "vitest";
import { renderWithProviders, screen } from "../test-utils";
import { Reveal } from "@/components/Reveal";

afterEach(() => vi.restoreAllMocks());

function mockReducedMotion(reduce: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduce,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
}

describe("Reveal", () => {
  it("renders its child", () => {
    renderWithProviders(<Reveal>visible content</Reveal>);
    expect(screen.getByText("visible content")).toBeInTheDocument();
  });

  it("staggers the animation delay by index", () => {
    mockReducedMotion(false);
    renderWithProviders(<Reveal index={3}>x</Reveal>);
    const wrapper = screen.getByText("x");
    expect(wrapper).toHaveClass("animate-in");
    expect(wrapper.style.animationDelay).toBe("180ms"); // 3 * 60ms
  });

  it("opts out of animation when reduced motion is preferred", () => {
    mockReducedMotion(true);
    renderWithProviders(<Reveal index={3}>x</Reveal>);
    const wrapper = screen.getByText("x");
    expect(wrapper).not.toHaveClass("animate-in");
    expect(wrapper.style.animationDelay).toBe("");
  });
});
