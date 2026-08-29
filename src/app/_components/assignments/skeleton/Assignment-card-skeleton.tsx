import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/app/_components/ui/card";
import { Skeleton } from "../../ui/skeleton";
export function AssignmentCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardFooter>
    </Card>
  );
}
