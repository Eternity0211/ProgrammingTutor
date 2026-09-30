"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/_components/ui/tabs";
import { buildClassTabHref, resolveClassTab } from "@/lib/class-tabs";

interface ClassTabsProps {
  assignments: ReactNode;
  people: ReactNode;
  settings: ReactNode;
}

export function ClassTabs({ assignments, people, settings }: ClassTabsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveClassTab(searchParams.get("tab"));
  const search = searchParams.toString();

  return (
    <Tabs value={activeTab} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="assignments" asChild>
          <Link href={buildClassTabHref(pathname, search, "assignments")}>
            Assignments
          </Link>
        </TabsTrigger>
        <TabsTrigger value="people" asChild>
          <Link href={buildClassTabHref(pathname, search, "people")}>
            People
          </Link>
        </TabsTrigger>
        <TabsTrigger value="settings" asChild>
          <Link href={buildClassTabHref(pathname, search, "settings")}>
            Settings
          </Link>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="assignments">{assignments}</TabsContent>
      <TabsContent value="people">{people}</TabsContent>
      <TabsContent value="settings">{settings}</TabsContent>
    </Tabs>
  );
}
