"use client";

import { NavMain } from "@/app/_components/sidebar/nav-main";
import { NavUser } from "@/app/_components/sidebar/nav-user";
import { ModeToggle } from "@/app/_components/sidebar/theme-toggle-btn";
import BlurFade from "@/app/_components/ui/blur-fade";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/app/_components/ui/sidebar";
import { isValidUrl, titleCase } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useClientSession } from "@/hooks/use-auth-session";
import { NavGroupInterface } from "@/lib/types/config-types";
import { ROUTES } from "@/config/route";
import { BookOpen, CircleAlert, Code } from "lucide-react";
import Link from "next/link";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navGroups: NavGroupInterface[];
  navigationUnavailable?: boolean;
}
export function AppSidebar({
  navGroups,
  navigationUnavailable = false,
  ...props
}: AppSidebarProps) {
  const { resolvedTheme } = useTheme();
  const { open, isMobile } = useSidebar();
  const { user: sessionUser } = useClientSession();

  const userProfile = sessionUser
    ? {
        name: titleCase(sessionUser?.name || "John Doe"),
        email: sessionUser.email || "john.doe@example.com",
        avatar: sessionUser.image
          ? isValidUrl(sessionUser.image)
            ? sessionUser.image
            : `https://ui-avatars.com/api/?name=${
                titleCase(sessionUser?.name || "John Doe") ?? "John Doe"
              }`
          : `https://ui-avatars.com/api/?name=${
              titleCase(sessionUser?.name || "John Doe") ?? "John Doe"
            }`,
      }
    : null;

  return (
    <>
      <Sidebar collapsible="icon" variant="floating" {...props}>
        <SidebarHeader className="mt-3 p-2">
          <div className="flex items-center justify-between">
            {isMobile || open ? (
              <>
                <Link
                  href="/classes"
                  className="flex justify-start items-center gap-2"
                >
                  <div className="ml-1.5 flex h-8 w-8 items-center justify-center rounded-lg  bg-primary-button  hover:bg-main-700">
                    <Code className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-semibold text-foreground">
                    gradeIT
                  </span>
                </Link>
                <ModeToggle />
              </>
            ) : resolvedTheme === "light" || resolvedTheme === "dark" ? (
              <Link href="/classes">
                <div className="ml-1.5 flex h-8 w-8 items-center justify-center rounded-lg  bg-primary-button  hover:bg-main-700">
                  <Code className="h-4 w-4 text-primary-foreground" />
                </div>
              </Link>
            ) : null}
          </div>
        </SidebarHeader>
        <SidebarContent>
          {navGroups.length > 0 ? (
            <NavMain items={navGroups} label="Classes" />
          ) : (
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold text-sidebar-primary-foreground">
                Classes
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip={
                        navigationUnavailable
                          ? "Class list unavailable"
                          : "View classes"
                      }
                    >
                      <Link href={ROUTES.CLASSES}>
                        {navigationUnavailable ? (
                          <CircleAlert size={20} />
                        ) : (
                          <BookOpen size={20} />
                        )}
                        <span className="ml-1 text-sm font-medium">
                          {navigationUnavailable
                            ? "Class list unavailable"
                            : "View classes"}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter className="flex flex-col gap-2">
          {userProfile && (
            <BlurFade>
              <NavUser user={userProfile} />
            </BlurFade>
          )}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}
