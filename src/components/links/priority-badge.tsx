import { Badge } from "@/components/ui/badge";
import { PRIORITY_META } from "@/lib/domain/priority";
import type { Priority } from "@/lib/domain/types";

export function PriorityBadge({ priority }: { priority: Priority }) {
  const meta = PRIORITY_META[priority];
  return (
    <Badge size="sm" className={meta.className} title={meta.hint}>
      {meta.label}
    </Badge>
  );
}
