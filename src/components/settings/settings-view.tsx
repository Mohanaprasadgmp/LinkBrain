"use client";

import { useState } from "react";

import { SettingsRow, SettingsSection } from "@/components/settings/settings-section";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { CURRENT_USER } from "@/lib/data/fixtures/user";

/**
 * Preference toggles kept as local component state only.
 *
 * Nothing here is persisted: there is no account or backend yet to persist it
 * to, and re-fetching it from `localStorage` would imply a durability the app
 * doesn't actually have. Theme is the one exception (see `ThemeProvider`),
 * because a toggle that visibly reverts itself on reload is worse than one
 * that is honest about being session-only.
 */
export function SettingsView() {
  const [openInNewTab, setOpenInNewTab] = useState(true);
  const [showFavicons, setShowFavicons] = useState(true);
  const [compactList, setCompactList] = useState(false);

  return (
    <div className="max-w-2xl space-y-8">
      <SectionHeading
        eyebrow="Workspace"
        title="Settings"
        description="Manage your profile, appearance and preferences."
      />

      <SettingsSection
        title="Profile"
        description="Your account details. Editing is not saved yet — there is no account backend in this phase."
      >
        <SettingsRow label="Avatar">
          <Avatar initials={CURRENT_USER.initials} />
        </SettingsRow>
        <SettingsRow label="Name">
          <Input
            aria-label="Name"
            defaultValue={CURRENT_USER.name}
            className="w-56"
          />
        </SettingsRow>
        <SettingsRow label="Email" description="Used to identify your account once sign-in exists.">
          <Input
            aria-label="Email"
            type="email"
            defaultValue={CURRENT_USER.email}
            disabled
            className="w-56"
          />
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
          description="Suggest tags and a project when you save a link."
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

      <SettingsSection
        title="Account"
        description="Sign-in, sessions and data export."
        badge="Coming soon"
      >
        <SettingsRow
          label="Authentication"
          description="Sign in to sync your library across devices."
        >
          <Button variant="secondary" disabled>
            Connect account
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Delete all data"
          description="Permanently remove your library."
        >
          <Button variant="danger" disabled>
            Delete
          </Button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
