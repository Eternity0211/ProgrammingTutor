import { Skeleton } from "@/app/_components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs-modified";

export default function Loading() {
  return (
    <div className="container p-2">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-2">Manage settings.</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger
            value="profile"
            className="text-main-600 border-b-2 border-transparent data-[state=active]:border-main-700 data-[state=active]:text-main-700"
            disabled
          >
            <Skeleton className="h-5 w-5 mr-2 rounded" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="p-6 rounded-2xl border-2 border-accent">
            {/* Profile Form Skeleton */}
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-28 rounded-md" />
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Name Field */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>

                {/* Username Field */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>

                {/* Role Field */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </div>

              {/* Bio Field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>

              {/* Social Links Section */}
              <div className="space-y-4">
                <Skeleton className="h-5 w-24" />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
