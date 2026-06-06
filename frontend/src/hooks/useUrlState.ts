import { useCallback, useEffect, useState } from "react";

/**
 * The comparison's shareable state. The URL *is* the state — no backend, no
 * accounts, yet every comparison is a copy-pasteable link.
 */
export interface CompareState {
  tickers: string[];
  start: string | null; // ISO date
  end: string | null; // ISO date
}

/**
 * Two-way binding between CompareState and the page's query string.
 *
 * On mount, hydrate from `?tickers=…&start=…&end=…` if present, else use the
 * supplied defaults. On every change, mirror the state into the URL via
 * `replaceState` (no history spam, no navigation, no router dependency).
 */
export function useUrlState(
  defaults: CompareState,
): [CompareState, (next: CompareState) => void] {
  const [state, setState] = useState<CompareState>(() => {
    const parsed = parseSearch(window.location.search);
    // Tickers are the signal that the URL carries a real shared state; if none,
    // fall back to defaults so a bare visit still shows something useful.
    return parsed.tickers.length > 0 ? parsed : defaults;
  });

  useEffect(() => {
    const qs = serialize(state);
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [state]);

  const update = useCallback((next: CompareState) => setState(next), []);
  return [state, update];
}

function parseSearch(search: string): CompareState {
  const params = new URLSearchParams(search);
  const tickersRaw = params.get("tickers") ?? "";
  const tickers = tickersRaw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  return {
    tickers,
    start: params.get("start"),
    end: params.get("end"),
  };
}

function serialize(state: CompareState): string {
  const params = new URLSearchParams();
  if (state.tickers.length > 0) params.set("tickers", state.tickers.join(","));
  if (state.start) params.set("start", state.start);
  if (state.end) params.set("end", state.end);
  return params.toString();
}
