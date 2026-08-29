import { Skeleton } from "@/app/_components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden">
      {/* Left Panel - Question Description */}
      <div className="w-[40%] border-r border-border bg-background">
        <div className="flex h-full flex-col">
          {/* Question Navigation */}
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-md" />
              ))}
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* Examples Section */}
            <div className="mt-6 space-y-4">
              <Skeleton className="h-6 w-24" />
              <Card className="rounded-lg">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-32 mt-3 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            </div>

            {/* Constraints Section */}
            <div className="mt-6 space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Code Editor and Testing */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Code Editor Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>

        {/* Code Editor Area */}
        <div className="flex-1 bg-muted/30 p-4">
          <div className="h-full rounded-lg bg-muted/50 p-4">
            <div className="space-y-2">
              {[...Array(12)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-4 w-full"
                  style={{ width: `${Math.random() * 40 + 60}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Panel - Test Cases */}
        <div className="h-[40%] border-t border-border">
          <div className="flex h-full flex-col">
            {/* Tabs */}
            <div className="border-b border-border px-4 py-2">
              <div className="flex gap-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>

            {/* Test Content */}
            <div className="flex-1 p-4">
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="rounded-lg">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-border p-4">
              <div className="flex justify-end gap-3">
                <Skeleton className="h-10 w-24 rounded-md" />
                <Skeleton className="h-10 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
