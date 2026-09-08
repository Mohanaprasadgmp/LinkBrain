"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import { EditLinkDialog } from "@/components/links/edit-link-dialog";
import { LinkCard } from "@/components/links/link-card";
import type { Link } from "@/lib/domain/types";

/**
 * A divided list of link rows.
 *
 * Owns the "which link is being edited" state itself, since every page that
 * renders a list needs identical edit behaviour — one dialog, opened from any
 * row's actions menu. Pages stay responsible only for deciding which links to
 * pass in and what to show when that set is empty.
 */
export function LinkList({
  links,
  emptyState,
}: {
  links: Link[];
  emptyState: ReactNode;
}) {
  const [editingLink, setEditingLink] = useState<Link | null>(null);

  if (links.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="divide-y divide-border">
      {links.map((link) => (
        <LinkCard key={link.id} link={link} onEdit={setEditingLink} />
      ))}

      <EditLinkDialog link={editingLink} onClose={() => setEditingLink(null)} />
    </div>
  );
}
