"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth/session";
import { initialsFromName } from "@/lib/utils/initials";

/**
 * Preference toggles kept as local component state only.
 *
 * Nothing here is persisted: there is no settings-persistence backend yet,
 * and re-fetching it from `localStorage` would imply a durability the app
 * doesn't actually have. Theme is the one exception (see `ThemeProvider`),
 * because a toggle that visibly reverts itself on reload is worse than one
 * that is honest about being session-only.
 *
 * The Profile/Account sections below are real, though — `user` comes from
 * the authenticated session (`requireUser()`, resolved by
 * `app/(workspace)/settings/page.tsx`), not a fixture. There's no edit-profile
 * flow yet (name/email/avatar are exactly what the sign-up form or Google
 * provided), per this phase's explicit scope: sign-in/out plus "who am I,"
 * not a profile-management system.
 */
export function SettingsView({ user }: { user: SessionUser }) {
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [showFavicons, setShowFavicons] = useState(true);
  const [compactList, setCompactList] = useState(false);
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
        title="Preferences"
        description="Small behaviours that affect how you browse your library."
      >
        <SettingsRow
          label="Open links in a new tab"
          description="Keep LinkBrain open in this tab when you follow a link."
        >
          <Switch
            checked={openInNewTab}
            onCheckedChange={setOpenInNewTab}
            label="Open links in a new tab"
          />
        </SettingsRow>
        <SettingsRow
          label="Show favicons"
          description="Display a generated site mark on each link card."
        >
          <Switch
            checked={showFavicons}
            onCheckedChange={setShowFavicons}
            label="Show favicons"
          />
        </SettingsRow>
        <SettingsRow
          label="Compact list view"
          description="Reduce spacing in link lists to fit more on screen."
        >
          <Switch
            checked={compactList}
            onCheckedChange={setCompactList}
            label="Compact list view"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="AI"
        description="Automatic categorisation, summaries and Q&A over your library."
        badge="Coming soon"
      >
        <SettingsRow
          label="Auto-categorize new links"
          description="Suggest a project when you save a link."
        >
          <Switch
            checked={false}
            onCheckedChange={() => {}}
            label="Auto-categorize new links"
            disabled
          />
        </SettingsRow>
        <SettingsRow
          label="Generate summaries"
          description="Write a short summary for links that don't have one."
        >
          <Switch
            checked={false}
            onCheckedChange={() => {}}
            label="Generate summaries"
            disabled
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Account" description="Sessions and sign-out.">
        <SettingsRow label="Signed in as" description={user.email}>
          <Button variant="secondary" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
