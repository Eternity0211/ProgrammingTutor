import { AssignmentListSkeleton } from "../../assignments/skeleton/Assignment-list-skeleton";
import { Skeleton } from "../../ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import { ClassHeaderSkeleton } from "./class-header-skeleton";

export function ClassPageSkeleton() {
  return (
    <div className="flex flex-col">
      <ClassHeaderSkeleton />
      <div className="mx-auto max-w-6xl w-full px-6 pt-6">
        <Tabs defaultValue="assignments" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <AssignmentListSkeleton />
          </TabsContent>

          <TabsContent value="people">
            <div className="space-y-4">
              <Skeleton className="h-8 w-32" />
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Skeleton className="h-8 w-40" />
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
