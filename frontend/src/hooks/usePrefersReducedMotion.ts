import { useEffect, useState } from "react";

/**
 * Tracks the OS "reduce motion" accessibility preference, reactively. Used to
 * skip entrance animations for users who ask for less motion (the CSS guard in
 * index.css collapses durations; this lets components opt out of the animation
 * machinery entirely, e.g. staggered delays). Guarded for environments without
 * matchMedia (jsdom, SSR).
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
