import "server-only";

import { and, desc, eq, exists, inArray, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  linkTags as linkTagsTable,
  links as linksTable,
  tags as tagsTable,
} from "@/lib/db/schema";
import type {
  Link,
  LinkFilter,
  LinkUpdate,
  NewLinkInput,
  Tag,
} from "@/lib/domain/types";
import { slugifyTag } from "@/lib/utils/tags";
import { extractDomain, normalizeUrl, titleFromUrl } from "@/lib/utils/url";

import type { LinkRepository } from "./repository";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

/**
 * Note on scope: `favicon`/`previewImage` are real database columns (see
 * `lib/db/schema/links.ts`) but deliberately don't appear in the domain
 * `Link` type or anywhere in the UI yet — nothing populates or reads them
 * until the metadata-extraction phase, so surfacing them now would be
 * exactly the "large speculative implementation for future features" this
 * phase is asked to avoid. They stay `null` in every row until then.
 */

/**
 * Maps a database row (with its joined tags) to the domain `Link` type.
 *
 * The only place a raw Drizzle row becomes a `Link` — nothing outside
 * `lib/data` ever sees the DB's column names or nested join shape.
 */
function rowToLink(row: {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  personalNote: string;
  status: string;
  priority: string;
  isFavorite: boolean;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  linkTags?: { tag: { name: string } }[];
}): Link {
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    title: row.title,
    description: row.description,
    note: row.personalNote,
    tags: (row.linkTags ?? []).map((lt) => lt.tag.name),
    status: row.status as Link["status"],
    priority: row.priority as Link["priority"],
    isFavorite: row.isFavorite,
    projectId: row.projectId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const LINK_WITH_TAGS_QUERY = {
  with: { linkTags: { with: { tag: true } } },
} as const;

export class DrizzleLinkRepository implements LinkRepository {
  async list(filter: LinkFilter = {}): Promise<Link[]> {
    const db = getDb();
    const where = buildWhere(filter);

    const rows = await db.query.links.findMany({
      where,
      orderBy: [desc(linksTable.createdAt)],
      ...LINK_WITH_TAGS_QUERY,
    });

    return rows.map(rowToLink);
  }

  async get(id: string): Promise<Link | null> {
    const row = await getDb().query.links.findFirst({
      where: eq(linksTable.id, id),
      ...LINK_WITH_TAGS_QUERY,
    });
    return row ? rowToLink(row) : null;
  }

  async create(input: NewLinkInput): Promise<Link> {
    const url = normalizeUrl(input.url) ?? input.url;
    const status = input.status ?? "saved";

    const id = await getDb().transaction(async (tx) => {
      const [inserted] = await tx
        .insert(linksTable)
        .values({
          url,
          domain: extractDomain(url),
          title: input.title.trim() || titleFromUrl(url),
          description: input.description?.trim() ?? "",
          personalNote: input.note?.trim() ?? "",
          status,
          priority: input.priority ?? "useful",
          isFavorite: input.isFavorite ?? false,
          projectId: input.projectId ?? null,
          archivedAt: status === "archived" ? new Date() : null,
        })
        .returning({ id: linksTable.id });

      if (input.tags?.length) {
        await replaceLinkTags(tx, inserted.id, input.tags);
      }

      return inserted.id;
    });

    const created = await this.get(id);
    if (!created) {
      throw new Error("Failed to read back the link that was just created.");
    }
    return created;
  }

  async update(id: string, patch: LinkUpdate): Promise<Link | null> {
    // `note` is the one domain field name that doesn't match its column
    // (`personal_note` / `personalNote`) — pulled out and remapped
    // explicitly rather than spread, so the rest of the patch stays typed
    // against the table's real column names instead of an `unknown` escape
    // hatch that would hide a future mismatch the same way this one was.
    const { tags, note, ...rest } = patch;

    await getDb().transaction(async (tx) => {
      if (note !== undefined || Object.keys(rest).length > 0) {
        const values: Partial<typeof linksTable.$inferInsert> = {
          ...rest,
          updatedAt: new Date(),
        };
        if (note !== undefined) values.personalNote = note;

        // Keep archivedAt consistent with status in one place, regardless of
        // which call site changed it (the dedicated archive action or a
        // direct status-menu selection).
        if (patch.status === "archived") {
          values.archivedAt = new Date();
        } else if (patch.status !== undefined) {
          values.archivedAt = null;
        }

        await tx.update(linksTable).set(values).where(eq(linksTable.id, id));
      }

      if (tags !== undefined) {
        await replaceLinkTags(tx, id, tags);
      }
    });

    return this.get(id);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(linksTable)
      .where(eq(linksTable.id, id))
      .returning({ id: linksTable.id });
    return deleted.length > 0;
  }
}

/** Translate a `LinkFilter` into a Drizzle `where` condition, or `undefined` for no filter. */
function buildWhere(filter: LinkFilter) {
  const conditions = [];

  if (filter.status?.length) {
    conditions.push(inArray(linksTable.status, filter.status));
  }
  if (filter.priority?.length) {
    conditions.push(inArray(linksTable.priority, filter.priority));
  }
  if (filter.projectId) {
    conditions.push(eq(linksTable.projectId, filter.projectId));
  }
  if (filter.isFavorite !== undefined) {
    conditions.push(eq(linksTable.isFavorite, filter.isFavorite));
  }

  // A link must carry every requested tag — mirrors filterLinks()'s existing
  // "every required tag present" semantics, one EXISTS check per tag.
  if (filter.tags?.length) {
    for (const tagLabel of filter.tags) {
      const slug = slugifyTag(tagLabel);
      if (!slug) continue;
      conditions.push(
        exists(
          getDb()
            .select({ one: sql`1` })
            .from(linkTagsTable)
            .innerJoin(tagsTable, eq(linkTagsTable.tagId, tagsTable.id))
            .where(and(eq(linkTagsTable.linkId, linksTable.id), eq(tagsTable.slug, slug))),
        ),
      );
    }
  }

  const query = filter.query?.trim();
  if (query) {
    const textMatch = sql`to_tsvector('english', ${linksTable.title} || ' ' || ${linksTable.description} || ' ' || ${linksTable.domain}) @@ plainto_tsquery('english', ${query})`;
    const tagMatch = inArray(
      linksTable.id,
      getDb()
        .select({ id: linkTagsTable.linkId })
        .from(linkTagsTable)
        .innerJoin(tagsTable, eq(linkTagsTable.tagId, tagsTable.id))
        .where(sql`${tagsTable.name} ILIKE ${"%" + query + "%"}`),
    );
    conditions.push(or(textMatch, tagMatch)!);
  }

  return conditions.length ? and(...conditions) : undefined;
}

/**
 * Get each tag's id, creating it if it doesn't exist yet.
 *
 * Uniqueness is enforced on `slug` (via the existing `slugifyTag` util, the
 * same normalisation `deriveTags()` used to dedupe in memory), so "AWS" and
 * "aws" resolve to the same row; whichever spelling was inserted first is
 * kept as the display name.
 */
async function getOrCreateTagId(tx: Transaction, name: string): Promise<string | null> {
  const slug = slugifyTag(name);
  if (!slug) return null;

  const [inserted] = await tx
    .insert(tagsTable)
    .values({ name, slug })
    .onConflictDoNothing({ target: tagsTable.slug })
    .returning({ id: tagsTable.id });
  if (inserted) return inserted.id;

  const [existing] = await tx
    .select({ id: tagsTable.id })
    .from(tagsTable)
    .where(eq(tagsTable.slug, slug))
    .limit(1);
  return existing?.id ?? null;
}

/**
 * Replace a link's tag assignments with exactly the given set.
 *
 * Delete-then-insert rather than diffing the existing set: simpler, still
 * correct, and safe from partial results because it always runs inside the
 * caller's transaction — a failure partway through rolls back to the
 * link's previous tag set instead of leaving it half-updated.
 */
async function replaceLinkTags(tx: Transaction, linkId: string, tagNames: string[]): Promise<void> {
  await tx.delete(linkTagsTable).where(eq(linkTagsTable.linkId, linkId));

  const seenSlugs = new Set<string>();
  for (const name of tagNames) {
    const slug = slugifyTag(name);
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    const tagId = await getOrCreateTagId(tx, name);
    if (!tagId) continue;
    await tx.insert(linkTagsTable).values({ linkId, tagId }).onConflictDoNothing();
  }
}

/**
 * Tag list with per-tag link counts, replacing the old fixture-era
 * `deriveTags()` (which scanned an in-memory array — there is no such array
 * to scan once links live in Postgres). A single GROUP BY query instead of
 * loading every link just to count tags on it.
 */
export async function listTagsWithCounts(): Promise<Tag[]> {
  const rows = await getDb()
    .select({
      slug: tagsTable.slug,
      label: tagsTable.name,
      linkCount: sql<number>`count(${linkTagsTable.linkId})::int`,
    })
    .from(tagsTable)
    .leftJoin(linkTagsTable, eq(linkTagsTable.tagId, tagsTable.id))
    .groupBy(tagsTable.id)
    .orderBy(desc(sql`count(${linkTagsTable.linkId})`), tagsTable.name);

  return rows.filter((row) => row.linkCount > 0);
}

export interface ProjectLinkStats {
  count: number;
  lastActivity: string;
}

/**
 * Per-project link count and most-recent update, keyed by project id.
 *
 * A single GROUP BY over `links` rather than fetching every link just to
 * fold over it in memory (the old `countLinksByProject`/`lastActivityByProject`
 * pure functions did that, which was fine scanning a 20-row fixture array —
 * it isn't once links live in Postgres at real scale).
 */
export async function getProjectLinkStats(): Promise<Record<string, ProjectLinkStats>> {
  const rows = await getDb()
    .select({
      projectId: linksTable.projectId,
      count: sql<number>`count(*)::int`,
      lastActivity: sql<string>`max(${linksTable.updatedAt})`,
    })
    .from(linksTable)
    .where(sql`${linksTable.projectId} is not null`)
    .groupBy(linksTable.projectId);

  const stats: Record<string, ProjectLinkStats> = {};
  for (const row of rows) {
    if (!row.projectId) continue;
    stats[row.projectId] = {
      count: row.count,
      lastActivity: new Date(row.lastActivity).toISOString(),
    };
  }
  return stats;
}

export interface SidebarCounts {
  inbox: number;
  favorites: number;
}

/**
 * Counts for the sidebar's Inbox/Favorites badges.
 *
 * Preserves Phase 1's exact (if slightly quirky) definitions rather than
 * "fixing" them here: the Inbox badge counts only `status = 'saved'`, not
 * the broader `saved | reading` the Inbox page itself lists — that mismatch
 * already existed in the fixture-backed version and changing it is outside
 * this phase's scope.
 */
export async function getSidebarCounts(): Promise<SidebarCounts> {
  const db = getDb();

  const [[savedRow], [favoriteRow]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(linksTable)
      .where(eq(linksTable.status, "saved")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(linksTable)
      .where(eq(linksTable.isFavorite, true)),
  ]);

  return {
    inbox: savedRow?.count ?? 0,
    favorites: favoriteRow?.count ?? 0,
  };
}
