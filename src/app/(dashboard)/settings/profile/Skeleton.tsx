import { Skeleton } from "@/app/_components/ui/skeleton";

export function SettingsFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="space-y-6">
        <div className="flex items-center">
          <div className="w-1/2">
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="w-1/2">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
