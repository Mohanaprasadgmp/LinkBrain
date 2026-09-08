"use client";

import { LogOut, Moon, Settings, Sun, SunMoon } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { CURRENT_USER } from "@/lib/data/fixtures/user";

const THEME_ITEMS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: SunMoon },
];

/**
 * The account control anchored to the bottom of the sidebar.
 *
 * Sign-out has no destination yet — there is no auth in Phase 1 — so it
 * renders disabled with a hint, rather than as a dead click.
 */
export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu
      align="start"
      label="Account menu"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-hover"
        >
          <Avatar initials={CURRENT_USER.initials} />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">
                {CURRENT_USER.name}
              </span>
              <span className="block truncate text-xs text-ink-subtle">
                {CURRENT_USER.email}
              </span>
            </span>
          )}
        </button>
      )}
    >
      <DropdownMenuLabel>Appearance</DropdownMenuLabel>
      {THEME_ITEMS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuItem
          key={value}
          icon={<Icon className="size-4" />}
          selected={theme === value}
          onSelect={() => setTheme(value)}
        >
          {label}
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />

      <DropdownMenuItem href="/settings" icon={<Settings className="size-4" />}>
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem icon={<LogOut className="size-4" />} disabled>
        Sign out (coming soon)
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
