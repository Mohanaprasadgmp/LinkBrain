"use client";

import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { initialsFromName } from "@/lib/utils/initials";

/**
 * The account control anchored to the bottom of the sidebar.
 *
 * No theme control here — a quick light/dark toggle already lives in the
 * top bar, and the full Light/Dark/System control lives in
 * Settings → Appearance; a third copy here was pure duplication.
 *
 * Sign-out goes through `authClient.signOut()` (Better Auth's own client
 * SDK — see `lib/auth-client.ts`) and then a client-side redirect;
 * `proxy.ts` picks up the now-cleared session cookie on the next
 * navigation regardless, but redirecting explicitly is what actually moves
 * the user off a page they're no longer authorized to be looking at.
 */
export function UserMenu({
  user,
  collapsed = false,
}: {
  user: SessionUser;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/sign-in");
      router.refresh();
    });
  };

  return (
    <DropdownMenu
      align="start"
      side="top"
      label="Account menu"
      trigger={(triggerProps) => (
        <button
          {...triggerProps}
          title={collapsed ? user.name : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-hover",
            collapsed && "justify-center",
          )}
        >
          <Avatar initials={initialsFromName(user.name)} src={user.image} />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
              <span className="block truncate text-xs text-ink-subtle">{user.email}</span>
            </span>
          )}
        </button>
      )}
    >
      <DropdownMenuItem href="/settings" icon={<Settings className="size-4" />}>
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem
        icon={<LogOut className="size-4" />}
        disabled={isPending}
        onSelect={handleSignOut}
      >
        {isPending ? "Signing out..." : "Sign out"}
      </DropdownMenuItem>
    </DropdownMenu>
  );
}
