"use client";

import { Skeleton } from "@/app/_components/ui/skeleton";
import { Plus } from "lucide-react";

export function ClassGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div className="group relative flex h-[280px] w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))] dark:bg-background p-6 text-[hsl(var(--foreground))] shadow-sm transition-all animate-pulse">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--muted))] transition-colors group-hover:bg-[hsl(var(--border-secondary))]">
          <Plus className="h-8 w-8" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      {[...Array(5)].map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border bg-background shadow-lg dark:bg-background animate-pulse"
        >
          <div className="relative h-32 w-full rounded-t-2xl bg-muted" />
          <div className="p-6">
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="grid grid-cols-2 gap-2 p-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
