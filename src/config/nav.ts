import {
  Archive,
  FolderOpen,
  Home,
  Inbox,
  Library,
  Settings,
  Star,
  Tags,
  type LucideIcon,
} from "lucide-react";

/**
 * Sidebar navigation, defined as data rather than markup.
 *
 * Both the desktop sidebar and the mobile drawer render from this one array, so
 * adding a destination means adding an entry here and nothing else.
 */
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * Which live count to show as a badge, or `undefined` for no badge.
   * Resolved against the store at render time rather than stored here, so the
   * config stays free of application state.
   */
  badge?: "inbox" | "favorites";
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/inbox", label: "Inbox", icon: Inbox, badge: "inbox" },
  { href: "/favorites", label: "Favorites", icon: Star, badge: "favorites" },
  { href: "/links", label: "All Links", icon: Library },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/tags", label: "Tags", icon: Tags },
  { href: "/archive", label: "Archive", icon: Archive },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Whether a nav item should render as the current page.
 *
 * Home matches only exactly, because every path starts with `/`; everything
 * else also matches its nested routes so that future detail pages keep their
 * parent highlighted.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
