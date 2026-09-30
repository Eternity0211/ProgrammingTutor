"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveClassTab(searchParams.get("tab"));

  const handleTabChange = (value: string) => {
    const tab = resolveClassTab(value);
    router.replace(buildClassTabHref(pathname, searchParams.toString(), tab), {
      scroll: false,
    });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="assignments">Assignments</TabsTrigger>
        <TabsTrigger value="people">People</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="assignments">{assignments}</TabsContent>
      <TabsContent value="people">{people}</TabsContent>
      <TabsContent value="settings">{settings}</TabsContent>
    </Tabs>
  );
}
