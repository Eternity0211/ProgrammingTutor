import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";
import { Button } from "@/app/_components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function GradingLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" disabled className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Button>
          <div>
            <div className="h-8 bg-muted rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grading Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
            <div className="flex gap-2">
              <div className="h-9 bg-muted rounded w-32 animate-pulse"></div>
              <div className="h-9 bg-muted rounded w-24 animate-pulse"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-7 gap-4 pb-4 border-b">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-muted rounded animate-pulse"
                ></div>
              ))}
            </div>
            {/* Table Rows */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4 py-4 border-b">
                {[...Array(7)].map((_, j) => (
                  <div
                    key={j}
                    className="h-4 bg-muted rounded animate-pulse"
                  ></div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
