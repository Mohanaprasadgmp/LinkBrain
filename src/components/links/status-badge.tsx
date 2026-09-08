import { Badge, BadgeDot } from "@/components/ui/badge";
import { STATUS_META } from "@/lib/domain/status";
import type { LinkStatus } from "@/lib/domain/types";

export function StatusBadge({ status }: { status: LinkStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge size="sm" className={meta.className} title={meta.hint}>
      <BadgeDot className={meta.dotClassName} />
      {meta.label}
    </Badge>
  );
}
