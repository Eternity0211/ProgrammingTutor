import { Skeleton } from "@/app/_components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { ChevronLeft } from "lucide-react";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-5xl p-6">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          disabled
          className="h-8 w-8 rounded-full"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </Button>

        <div>
          <h1 className="text-2xl font-medium text-foreground">
            Submission History
          </h1>
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
      </div>

      {/* Question Cards with Submissions */}
      <div className="space-y-6">
        {[1, 2, 3].map((questionIndex) => (
          <Card
            key={questionIndex}
            className="rounded-xl border border-border bg-background text-foreground"
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-32" />
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {/* Submission items */}
                {[1, 2].map((submissionIndex) => (
                  <div
                    key={submissionIndex}
                    className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/10"
                  >
                    <div className="flex items-center gap-4">
                      {/* Status icon placeholder */}
                      <Skeleton className="h-5 w-5 rounded-full" />

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-9 w-20 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
