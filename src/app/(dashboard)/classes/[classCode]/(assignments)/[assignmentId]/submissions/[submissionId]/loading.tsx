import { Skeleton } from "@/app/_components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/app/_components/ui/card";
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
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div>
          <h1 className="text-2xl font-medium text-foreground">
            Submission Details
          </h1>
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Code and Test Results */}
        <div className="lg:col-span-2">
          {/* Submitted Code Card */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle>Submitted Code</CardTitle>
              <CardDescription>
                <Skeleton className="h-4 w-48" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4">
                <div className="space-y-2">
                  {[...Array(15)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-4"
                      style={{ width: `${Math.random() * 40 + 60}%` }}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Results Card */}
          <Card className="mt-6 rounded-2xl border-border">
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <div className="mt-2 flex items-center gap-4">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-4 w-12" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Submission Info */}
        <div className="space-y-6">
          {/* Submission Status Card */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-base">Submission Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Score</span>
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Language</span>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics Card */}
          <Card className="rounded-2xl border-border">
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Runtime</span>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Memory</span>
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Submitted</span>
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
