import { Tags as TagsIcon } from "lucide-react";
import { connection } from "next/server";

import { TagPill } from "@/components/tags/tag-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/panel";
import { listTagsWithCounts } from "@/lib/data";

export async function TagsView() {
  await connection();

  const tags = await listTagsWithCounts();

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Organize"
        title="Tags"
        description="Every tag across your library, busiest first."
      />

      {tags.length === 0 ? (
        <EmptyState
          icon={TagsIcon}
          title="No tags yet"
          description="Tag a link to start building your index."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tags.map((tag) => (
            <TagPill key={tag.slug} tag={tag} />
          ))}
        </div>
      )}
    </div>
  );
}
