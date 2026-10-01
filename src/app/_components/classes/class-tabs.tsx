"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { buildClassTabHref, resolveClassTab } from "@/lib/class-tabs";
import { cn } from "@/lib/utils";

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
  const tabs = [
    { value: "assignments" as const, label: "Assignments" },
    { value: "people" as const, label: "People" },
    { value: "settings" as const, label: "Settings" },
  ];

  return (
    <div className="w-full">
      <nav
        aria-label="Class sections"
        className="mb-6 inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={buildClassTabHref(pathname, search, tab.value)}
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              activeTab === tab.value && "bg-background text-foreground shadow",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <section
        aria-label={`${tabs.find((tab) => tab.value === activeTab)?.label} section`}
      >
        {activeTab === "assignments" && assignments}
        {activeTab === "people" && people}
        {activeTab === "settings" && settings}
      </section>
    </div>
  );
}
