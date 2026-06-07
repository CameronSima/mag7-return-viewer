import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder while results load. Mirrors the real layout — window
 * caption, growth chart, then a table — so the page doesn't jump when the data
 * arrives and the wait reads as "loading this view", not a blank gap.
 */
export function LoadingState() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-[420px] w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}
