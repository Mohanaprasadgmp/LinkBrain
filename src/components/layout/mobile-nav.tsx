"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/layout/logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { IconButton } from "@/components/ui/button";
import { PRIMARY_NAV, SECONDARY_NAV } from "@/config/nav";

/**
 * The off-canvas navigation drawer shown below the `lg` breakpoint.
 *
 * A plain fixed-position panel rather than routing through `Dialog`: it is
 * anchored to an edge rather than centred, and closes automatically on
 * navigation rather than requiring an explicit dismiss action.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close whenever the route changes, so following a link never leaves the
  // drawer open over the new page. Adjusting state during render (rather than
  // in an effect) applies the reset in the same render pass as the pathname
  // change, so the drawer never has a chance to paint in a stale "open" state
  // first — see https://react.dev/learn/you-might-not-need-an-effect.
  const [priorPathname, setPriorPathname] = useState(pathname);
  if (pathname !== priorPathname) {
    setPriorPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <IconButton
        label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
        className="lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </IconButton>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative flex h-full w-72 max-w-[80vw] flex-col bg-surface shadow-overlay"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <Logo />
              <IconButton label="Close menu" onClick={() => setOpen(false)}>
                <X aria-hidden="true" className="size-5" />
              </IconButton>
            </div>

            <div className="flex-1 overflow-y-auto px-3">
              <SidebarNav items={PRIMARY_NAV} onNavigate={() => setOpen(false)} />
            </div>

            <div className="border-t border-border px-3 py-3">
              <SidebarNav
                items={SECONDARY_NAV}
                onNavigate={() => setOpen(false)}
              />
              <div className="mt-2">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
