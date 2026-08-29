"use client";

import { useTheme } from "next-themes";
import { Button } from "@/app/_components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative border-border text-foreground bg-transparent transition-colors duration-200 ease-in-out
                 hover:bg-muted hover:text-foreground
                 dark:border-muted dark:text-white dark:hover:bg-muted/20 dark:hover:text-white
                 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                 active:scale-95"
    >
      {/* Light Mode Icon (Sun) */}
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />

      {/* Dark Mode Icon (Moon) */}
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />

      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
