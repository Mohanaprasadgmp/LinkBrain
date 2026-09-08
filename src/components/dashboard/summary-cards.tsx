import { BookOpen, FolderOpen, Library, Star } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import type { LibraryStats } from "@/lib/domain/types";

export function SummaryCards({ stats }: { stats: LibraryStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={Library} label="Total Links" value={stats.totalLinks} accent="accent" />
      <StatCard icon={BookOpen} label="Unread" value={stats.unread} accent="info" />
      <StatCard icon={Star} label="Favorites" value={stats.favorites} accent="warning" />
      <StatCard icon={FolderOpen} label="Projects" value={stats.projects} accent="success" />
    </div>
  );
}
