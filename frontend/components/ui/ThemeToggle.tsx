"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-12 h-6 rounded-full bg-muted animate-pulse" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isDark ? "bg-slate-700" : "bg-blue-100"
      )}
      aria-label="Toggle theme"
    >
      <span className="sr-only">Toggle theme</span>
      
      {/* Sun Icon (Visible in Light Mode) */}
      <Sun 
        className={cn(
          "absolute left-1.5 h-4 w-4 text-yellow-500 transition-opacity duration-300 z-10",
          isDark ? "opacity-0" : "opacity-100"
        )} 
      />
      
      {/* Moon Icon (Visible in Dark Mode) */}
      <Moon 
        className={cn(
          "absolute right-1.5 h-4 w-4 text-slate-200 transition-opacity duration-300 z-10",
          isDark ? "opacity-100" : "opacity-0"
        )} 
      />

      {/* Sliding Thumb */}
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out z-20",
          isDark ? "translate-x-8" : "translate-x-1"
        )}
      />
    </button>
  );
}
