import { useCallback, useEffect, useState } from "react";
import type { HoldingInput, RebalanceFreq } from "@/types";

export type AppMode = "compare" | "portfolio";

declare global {
  interface Window {
    /** Initial state injected by a pre-rendered SEO landing page. */
    __SEO_STATE__?: Partial<AppState>;
  }
}

const REBALANCE_VALUES: RebalanceFreq[] = [
  "none",
  "monthly",
  "quarterly",
  "annually",
];

/**
 * The whole app's shareable state. The URL *is* the state — no backend, no
 * accounts, yet every comparison or portfolio is a copy-pasteable link.
 */
export interface AppState {
  mode: AppMode;
  tickers: string[]; // compare mode
  holdings: HoldingInput[]; // portfolio mode
  rebalance: RebalanceFreq; // portfolio mode
  benchmark: string | null; // portfolio mode
  start: string | null; // ISO date
  end: string | null; // ISO date
}

/**
 * Two-way binding between AppState and the page's query string.
 *
 * On mount, hydrate from the URL if it carries any state (tickers, holdings, or
 * an explicit mode), else use the supplied defaults. On every change, mirror the
 * state into the URL via `replaceState` (no history spam, no navigation).
 */
export function useUrlState(
  defaults: AppState,
): [AppState, (next: AppState) => void] {
  const [state, setState] = useState<AppState>(() => {
    const params = new URLSearchParams(window.location.search);
    const carriesState =
      params.has("tickers") || params.has("holdings") || params.has("mode");
    if (carriesState) return parse(params, defaults);

    // A pre-rendered landing page (/compare/<slug>/) injects its selection as a
    // global so the SPA boots into that comparison. The query string, if any,
    // still wins — it's the explicit, user-driven source.
    const seeded = window.__SEO_STATE__;
    if (seeded) return { ...defaults, ...seeded };

    return defaults;
  });

  useEffect(() => {
    const qs = serialize(state);
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [state]);

  const update = useCallback((next: AppState) => setState(next), []);
  return [state, update];
}

function parse(params: URLSearchParams, defaults: AppState): AppState {
  const tickers = splitSymbols(params.get("tickers"));
  const holdings = parseHoldings(params.get("holdings"));
  const rebalanceRaw = params.get("rebalance") as RebalanceFreq | null;

  return {
    mode: params.get("mode") === "portfolio" ? "portfolio" : "compare",
    tickers: tickers.length > 0 ? tickers : defaults.tickers,
    holdings: holdings.length > 0 ? holdings : defaults.holdings,
    rebalance:
      rebalanceRaw && REBALANCE_VALUES.includes(rebalanceRaw)
        ? rebalanceRaw
        : "none",
    benchmark: cleanSymbol(params.get("benchmark")),
    start: params.get("start") ?? defaults.start,
    end: params.get("end") ?? defaults.end,
  };
}

function serialize(state: AppState): string {
  const params = new URLSearchParams();
  if (state.mode === "portfolio") params.set("mode", "portfolio");
  if (state.tickers.length > 0) params.set("tickers", state.tickers.join(","));
  if (state.holdings.length > 0) {
    params.set(
      "holdings",
      state.holdings.map((h) => `${h.ticker}:${h.weight}`).join(","),
    );
  }
  if (state.rebalance !== "none") params.set("rebalance", state.rebalance);
  if (state.benchmark) params.set("benchmark", state.benchmark);
  if (state.start) params.set("start", state.start);
  if (state.end) params.set("end", state.end);
  return params.toString();
}

function splitSymbols(raw: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

function cleanSymbol(raw: string | null): string | null {
  const symbol = (raw ?? "").trim().toUpperCase();
  return symbol || null;
}

function parseHoldings(raw: string | null): HoldingInput[] {
  if (!raw) return [];
  const out: HoldingInput[] = [];
  for (const pair of raw.split(",")) {
    const [ticker, weightRaw] = pair.split(":");
    const symbol = ticker?.trim().toUpperCase();
    const weight = Number(weightRaw);
    if (symbol && Number.isFinite(weight) && weight > 0) {
      out.push({ ticker: symbol, weight });
    }
  }
  return out;
}
