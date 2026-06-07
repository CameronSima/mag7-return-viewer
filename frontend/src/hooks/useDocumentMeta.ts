import { useEffect } from "react";
import { metaForState, comparePath, type SeoInput } from "@/lib/seo";

/**
 * Keeps the document <head> in sync with the current selection: title, meta
 * description, canonical, and Open Graph / Twitter tags. So a shared link gets a
 * relevant title + rich preview, and a JS-rendering crawler reads accurate
 * metadata. Tags are upserted (created once, then updated) and never removed —
 * the head simply reflects the latest state.
 */
export function useDocumentMeta(state: SeoInput): void {
  useEffect(() => {
    const { title, description } = metaForState(state);
    document.title = title;

    // Self-referencing canonical on the real origin: the clean /compare/<slug>/
    // path for a comparison, else the current path. Avoids duplicate-content
    // dilution across the query-param permutations of the same view.
    const path =
      state.mode === "compare" && state.tickers.length > 0
        ? comparePath(state.tickers)
        : window.location.pathname;
    const canonical = `${window.location.origin}${path}`;

    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", canonical);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertLink("canonical", canonical);
  }, [state]);
}

function upsertMeta(keyAttr: "name" | "property", key: string, content: string) {
  const selector = `meta[${keyAttr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(keyAttr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
