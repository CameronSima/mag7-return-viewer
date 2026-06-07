import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import type { SeoInput } from "@/lib/seo";

const compareState: SeoInput = {
  mode: "compare",
  tickers: ["AAPL", "MSFT"],
  holdings: [],
  benchmark: null,
};

function metaContent(selector: string): string | null {
  return document.head
    .querySelector<HTMLMetaElement>(selector)
    ?.getAttribute("content") ?? null;
}

describe("useDocumentMeta", () => {
  it("sets the title, description, canonical and OG tags from state", () => {
    renderHook(() => useDocumentMeta(compareState));

    expect(document.title).toContain("AAPL vs MSFT");
    expect(metaContent('meta[name="description"]')).toContain("AAPL and MSFT");
    expect(metaContent('meta[property="og:title"]')).toContain("AAPL vs MSFT");

    const canonical = document.head
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.getAttribute("href");
    expect(canonical).toContain("/compare/aapl-vs-msft/");
  });

  it("updates (not duplicates) tags when state changes", () => {
    const { rerender } = renderHook(({ s }) => useDocumentMeta(s), {
      initialProps: { s: compareState },
    });
    rerender({ s: { ...compareState, tickers: ["VOO", "VTI"] } });

    expect(document.title).toContain("VOO vs VTI");
    // Exactly one description / canonical tag, updated in place.
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });
});
