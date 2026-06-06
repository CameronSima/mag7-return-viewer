import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder while a comparison loads. Roughly mirrors the shape of
 * the results (chart card + table) so the layout doesn't jump on load.
 */
export function LoadingState() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-[480px] w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
