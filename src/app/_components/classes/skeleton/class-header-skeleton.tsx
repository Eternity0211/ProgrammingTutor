import { Skeleton } from "../../ui/skeleton";
export function ClassHeaderSkeleton() {
  return (
    <div className="relative">
      <div className="relative h-44 w-full rounded-2xl bg-muted animate-pulse"></div>
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="absolute -top-16 flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-8 w-64 bg-white/20" />
            <Skeleton className="h-5 w-48 bg-white/15" />
          </div>
        </div>
      </div>
    </div>
  );
}
