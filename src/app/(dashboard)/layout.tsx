import { AppSidebar } from "@/app/_components/sidebar/app-sidebar";
import { Separator } from "@/app/_components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/_components/ui/sidebar";
import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { AppBreadcrumbs } from "../_components/navigation/breadcrumbs";
import OnboardingCheck from "./(features)/onboarding/onboarding-check";
import { getNavigationConfig } from "@/config/navigation";
import { isUserOnboarded } from "@/server/actions/utility-actions";
import { DraggableFloatChat } from "@/app/_components/draggable‑float‑chat";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionData = await auth();
  let navGroups: any = [];
  let isoOnboarded = false;
  let userRole: string | null = null;

  if (sessionData?.user) {
    const config = await getNavigationConfig();
    navGroups = config.navGroups;
    isoOnboarded = await isUserOnboarded(sessionData.user.id);

    const dbUser = await prisma.user.findUnique({
      where: { id: sessionData.user.id },
      select: { role: true },
    });
    if (dbUser) {
      userRole = dbUser.role;
    }
  }

  return (
    <>
      <SessionProvider>
        {sessionData && <OnboardingCheck onboarded={isoOnboarded} />}
        <SidebarProvider>
          <AppSidebar navGroups={navGroups} />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <AppBreadcrumbs />
              </div>
            </header>
            <div className="container p-4">{children}</div>
          </SidebarInset>
        </SidebarProvider>
        {sessionData && userRole === "STUDENT" && <DraggableFloatChat />}
      </SessionProvider>
    </>
  );
}
