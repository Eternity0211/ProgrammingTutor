import { Skeleton } from "@/app/_components/ui/skeleton";
import { PageHeader } from "@/app/_components/page-header";
import { Card, CardContent } from "@/app/_components/ui/card";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl p-6">
      <PageHeader
        heading="Create Assignment"
        text="Create a new coding assignment for your students."
      />

      <div className="mt-8 space-y-8">
        {/* Assignment Details Section */}
        <Card className="rounded-xl border-border">
          <CardContent className="p-6">
            <Skeleton className="h-6 w-40 mb-6" />

            <div className="space-y-6">
              {/* Title Field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>

              {/* Due Date and Time Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>

              {/* Settings Toggles */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <Card className="rounded-xl border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-9 w-32 rounded-md" />
            </div>

            {/* Question Cards */}
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="rounded-lg border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>

                    <div className="space-y-4">
                      {/* Question Title */}
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full rounded-md" />
                      </div>

                      {/* Problem Statement */}
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-20 w-full rounded-md" />
                      </div>

                      {/* Language and Points */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-10 w-full rounded-md" />
                        </div>
                      </div>

                      {/* Test Cases */}
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <div className="space-y-2">
                          <Skeleton className="h-20 w-full rounded-md" />
                          <Skeleton className="h-20 w-full rounded-md" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
