import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface RevealProps {
  /** Position in the sequence; drives the staggered animation delay. */
  index?: number;
  className?: string;
  children: ReactNode;
}

// Per-step delay and the cap, so a long results page doesn't trickle in forever.
const STEP_MS = 60;
const MAX_STEPS = 8;

/**
 * Reveals its child with a fade + slide-up, staggered by `index` so the results
 * sections cascade in rather than snapping all at once. Opts out entirely when
 * the user prefers reduced motion (rendering a plain wrapper, no delay).
 */
export function Reveal({ index = 0, className, children }: RevealProps) {
  const reduced = usePrefersReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-500",
        className,
      )}
      style={{
        animationDelay: `${Math.min(index, MAX_STEPS) * STEP_MS}ms`,
        // Hold the start (hidden) state through the delay so nothing flashes.
        animationFillMode: "both",
      }}>
      {children}
    </div>
  );
}
