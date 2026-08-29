"use client";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/app/_components/ui/sidebar";
import { Moon02Icon, Sun01Icon } from "hugeicons-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggleTxt() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Update mounted state once component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          onClick={toggleTheme}
          className="w-full group-data-[collapsible=icon]:justify-center"
        >
          {theme === "light" ? (
            <Moon02Icon className="h-5 w-5" />
          ) : (
            <Sun01Icon className="h-5 w-5" />
          )}
          <div className="ml-2 flex-1 text-left text-sm font-medium group-data-[collapsible=icon]:hidden">
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
