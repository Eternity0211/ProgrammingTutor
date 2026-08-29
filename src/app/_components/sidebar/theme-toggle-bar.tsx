import { Moon02Icon, Sun01Icon } from "hugeicons-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

export default function ThemeToggleBar({
  isMobile = false,
}: {
  isMobile?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  if (!mounted) {
    return null;
  }

  if (isMobile) {
    return (
      <Button
        onClick={toggleTheme}
        className="rounded-full p-1.5 transition-all duration-300"
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? (
          <Moon02Icon className="h-5 w-5" color={"#969696"} />
        ) : (
          <Sun01Icon className="h-5 w-5" color={"#969696"} />
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="flex rounded-full bg-gray-50 p-0.5 dark:bg-gray-800">
        {["light", "dark"].map((mode) => (
          <Button
            key={mode}
            className={`flex h-8 w-20 items-center justify-center rounded-full text-xs font-medium transition-all duration-300 ${
              theme === mode
                ? "bg-gradient-to-r from-purple-200 to-pink-200 text-purple-600 dark:from-indigo-200 dark:to-blue-200 dark:text-indigo-600"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
            onClick={() => setTheme(mode)}
            aria-label={`Switch to ${mode} mode`}
          >
            {mode === "light" ? (
              <Sun01Icon
                className={`mr-1 h-3 w-3 ${theme === "light" ? "animate-spin-slow" : ""}`}
              />
            ) : (
              <Moon02Icon
                className={`mr-1 h-3 w-3 ${theme === "dark" ? "animate-pulse" : ""}`}
              />
            )}
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Button>
        ))}
      </div>
    </div>
  );
}
