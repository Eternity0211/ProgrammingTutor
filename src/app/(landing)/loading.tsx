import { Skeleton } from "@/app/_components/ui/skeleton";

export default function Loading() {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Site Header Skeleton */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-6">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </nav>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-col justify-center">
        {/* Hero Section Skeleton */}
        <section className="container flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Skeleton className="h-12 w-3/4 max-w-2xl" />
          <Skeleton className="h-12 w-2/3 max-w-2xl" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <Skeleton className="h-6 w-3/4 max-w-xl" />
          <div className="mt-8 flex gap-4">
            <Skeleton className="h-11 w-32 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </section>

        {/* Features Section Skeleton */}
        <section className="container py-24">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-lg border border-border p-6">
                <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </section>

        {/* Educators Section Skeleton */}
        <section className="container py-24">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <Skeleton className="h-10 w-64 mb-4" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-3/4 mb-8" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Skeleton className="h-96 w-full rounded-lg" />
          </div>
        </section>

        {/* Students Section Skeleton */}
        <section className="container py-24">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <Skeleton className="h-96 w-full rounded-lg order-2 lg:order-1" />
            <div className="order-1 lg:order-2">
              <Skeleton className="h-10 w-64 mb-4" />
              <Skeleton className="h-6 w-full mb-2" />
              <Skeleton className="h-6 w-3/4 mb-8" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Section Skeleton */}
        <section className="container py-24">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="mb-4 flex justify-center">
                  <Skeleton className="h-16 w-16 rounded-full" />
                </div>
                <Skeleton className="h-6 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section Skeleton */}
        <section className="container py-24">
          <div className="grid gap-8 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-12 w-24 mx-auto mb-2" />
                <Skeleton className="h-4 w-32 mx-auto" />
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section Skeleton */}
        <section className="container py-24">
          <div className="rounded-lg bg-muted p-12 text-center">
            <Skeleton className="h-10 w-96 mx-auto mb-4" />
            <Skeleton className="h-6 w-64 mx-auto mb-8" />
            <Skeleton className="h-11 w-40 mx-auto rounded-md" />
          </div>
        </section>
      </main>

      {/* Footer Skeleton */}
      <footer className="border-t border-border">
        <div className="container py-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Skeleton className="h-8 w-32 mb-4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 border-t border-border pt-8 text-center">
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </footer>
    </div>
  );
}
