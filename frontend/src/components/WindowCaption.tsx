import type { CompareWindow } from "@/types";

/**
 * One-line note on the effective comparison window — the overlap of the
 * requested symbols' histories, over which everything is computed.
 */
export function WindowCaption({ window }: { window: CompareWindow }) {
  if (!window.start) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Common window: {window.start} → {window.end} · {window.trading_days}{" "}
      trading days. Series are compared over the dates they all share.
    </p>
  );
}
