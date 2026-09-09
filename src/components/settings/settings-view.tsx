"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/panel";
import { authClient } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth/session";
import { initialsFromName } from "@/lib/utils/initials";

/**
 * Theme is the one preference that's real (see `ThemeProvider`) — there is
 * no settings-persistence backend for anything else, so this deliberately
 * doesn't show toggles that would look interactive but do nothing (Phase
 * 7.5 removed three that used to: a UI control with no effect is worse for
 * trust than not having the control at all).
 *
 * The Profile/Account sections below are real, though — `user` comes from
 * the authenticated session (`requireUser()`, resolved by
 * `app/(workspace)/settings/page.tsx`), not a fixture. There's no edit-profile
 * flow yet (name/email/avatar are exactly what the sign-up form or Google
 * provided) — sign-in/out plus "who am I," not a profile-management system.
 */
export function SettingsView({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [isSigningOut, startSignOut] = useTransition();

  const handleSignOut = () => {
    startSignOut(async () => {
      await authClient.signOut();
      router.push("/sign-in");
      router.refresh();
    });
  };

  return (
    <div className="max-w-2xl space-y-8">
      <SectionHeading
        eyebrow="Workspace"
        title="Settings"
        description="Manage your profile, appearance and preferences."
      />

      <SettingsSection title="Profile" description="Your account details, from sign-up or Google.">
        <SettingsRow label="Avatar">
          <Avatar initials={initialsFromName(user.name)} src={user.image} />
        </SettingsRow>
        <SettingsRow label="Name">
          <p className="text-sm text-ink">{user.name}</p>
        </SettingsRow>
        <SettingsRow label="Email">
          <p className="text-sm text-ink">{user.email}</p>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Appearance" description="Choose how LinkBrain looks.">
        <SettingsRow
          label="Theme"
          description="Match your system, or pick light or dark."
        >
          <ThemeToggle />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="AI insights"
        description="Automatic summaries, categories, topics and key points for your saved links."
      >
        <SettingsRow label="How it works">
          <p className="max-w-sm text-right text-xs text-ink-subtle">
            Generated automatically when you save a link, shown on that
            link&rsquo;s own detail page. Regenerate any link&rsquo;s
            insights from there at any time — there&rsquo;s no setting to
            turn on here.
          </p>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Browser extension"
        description="Save the page you're on straight to LinkBrain from Chrome."
      >
        <SettingsRow
          label="Connect the extension"
          description="Load the extension, then connect it to this account."
        >
          <Button variant="secondary" onClick={() => router.push("/extension")}>
            Connect
          </Button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Account" description="Sessions and sign-out.">
        <SettingsRow label="Signed in as" description={user.email}>
          <Button variant="secondary" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </SettingsRow>
        <SettingsRow label="Legal">
          <div className="flex gap-4 text-sm">
            <Button variant="ghost" size="sm" onClick={() => router.push("/privacy")}>
              Privacy Policy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/terms")}>
              Terms of Service
            </Button>
          </div>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
