import { Skeleton } from "../../ui/skeleton";
import { AssignmentCardSkeleton } from "./Assignment-card-skeleton";
export function AssignmentListSkeleton() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <AssignmentCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
