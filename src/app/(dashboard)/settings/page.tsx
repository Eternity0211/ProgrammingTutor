import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs-modified";
import { UserAccountIcon } from "hugeicons-react";
import { Suspense } from "react";
import { SettingsFormSkeleton } from "./profile/Skeleton";
// import DeleteAccount from './profile/DeleteAccount';
import ProfileSettings from "./profile/ProfileSettings";
import { auth } from "@/lib/auth";

export default async function Settings() {
  const session = await auth();
  return (
    <div className="container p-2">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-2">Manage settings.</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger
            value="profile"
            className="text-main-600 border-b-2 border-transparent data-[state=active]:border-main-700 data-[state=active]:text-main-700"
          >
            <UserAccountIcon className="h-5 w-5" />
            Profile
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <div className="p-6 rounded-2xl border-2 border-accent">
            <Suspense fallback={<SettingsFormSkeleton />}>
              <ProfileSettings user={session?.user} />
            </Suspense>
          </div>

          {/* TODO: Add delete profile */}
          {/* <div className="mt-4 p-6 rounded-2xl border-2 border-accent">
            <Suspense fallback={<GeneralSettingsFormSkeleton />}>
              <DeleteAccount />
            </Suspense>
          </div> */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
