"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/theme-provider";
import { IconButton } from "@/components/ui/button";

/**
 * A one-click light/dark toggle for the top bar.
 *
 * The fuller Light/Dark/System control already lives in the account menu and
 * in Settings → Appearance; this is a faster path to the single most common
 * action (flip between light and dark) without opening either of those.
 * Shows the icon for the theme currently in effect, not the one a click would
 * switch to — consistent with how the account menu marks the active option.
 */
export function ThemeQuickToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <IconButton
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      {isDark ? (
        <Moon aria-hidden="true" className="size-4" />
      ) : (
        <Sun aria-hidden="true" className="size-4" />
      )}
    </IconButton>
  );
}
