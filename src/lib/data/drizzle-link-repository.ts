import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { links as linksTable, projects as projectsTable } from "@/lib/db/schema";
import { PRIORITY_META, PRIORITY_ORDER } from "@/lib/domain/priority";
import { UNREAD_STATUSES } from "@/lib/domain/status";
import type {
  BulkLinkAction,
  LibraryStats,
  Link,
  LinkFilter,
  LinkSort,
  LinkUpdate,
  NewLinkInput,
} from "@/lib/domain/types";
import { extractDomain, normalizeUrl, titleFromUrl } from "@/lib/utils/url";

import type { LinkListOptions, LinkRepository, UserScopedLinkRepository } from "./repository";

/**
 * Maps a database row to the domain `Link` type.
 *
 * The only place a raw Drizzle row becomes a `Link` — nothing outside
 * `lib/data` ever sees the DB's column names.
 * (`userId` is deliberately not part of the domain `Link` type — ownership is
 * an access-control fact enforced by the query that produced the row, not
 * data the rest of the app needs to carry around.)
 */
function rowToLink(row: {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  favicon: string | null;
  previewImage: string | null;
  personalNote: string;
  status: string;
  priority: string;
  isFavorite: boolean;
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Link {
  return {
    id: row.id,
    url: row.url,
    domain: row.domain,
    title: row.title,
    description: row.description,
    note: row.personalNote,
    status: row.status as Link["status"],
    priority: row.priority as Link["priority"],
    isFavorite: row.isFavorite,
    projectId: row.projectId,
    favicon: row.favicon,
    previewImage: row.previewImage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DrizzleLinkRepository implements LinkRepository {
  forUser(userId: string): UserScopedLinkRepository {
    return new UserScopedDrizzleLinkRepository(userId);
  }
}

/**
 * Every query below is scoped to `userId` — see `repository.ts`'s doc
 * comment on why this is a class per user rather than a `userId` parameter
 * threaded through each call. `update`/`delete`/`bulkApply` fold `userId`
 * into the same `WHERE` as the target id(s), so a foreign id matches zero
 * rows instead of needing a separate "is this mine?" check and a
 * cross-user-access error path that could leak whether the id exists at all.
 */
class UserScopedDrizzleLinkRepository implements UserScopedLinkRepository {
  constructor(private readonly userId: string) {}

  async list(filter: LinkFilter = {}, options: LinkListOptions = {}): Promise<Link[]> {
    const db = getDb();
    const where = buildWhere(this.userId, filter);

    const rows = await db.query.links.findMany({
      where,
      orderBy: buildOrderBy(options.sort ?? "newest"),
      limit: options.limit,
      offset: options.offset,
    });

    return rows.map(rowToLink);
  }

  async count(filter: LinkFilter = {}): Promise<number> {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(linksTable)
      .where(buildWhere(this.userId, filter));
    return row?.count ?? 0;
  }

  async get(id: string): Promise<Link | null> {
    const row = await getDb().query.links.findFirst({
      where: and(eq(linksTable.id, id), eq(linksTable.userId, this.userId)),
    });
    return row ? rowToLink(row) : null;
  }

  async findByUrl(url: string): Promise<Link | null> {
    const row = await getDb().query.links.findFirst({
      where: and(eq(linksTable.url, url), eq(linksTable.userId, this.userId)),
    });
    return row ? rowToLink(row) : null;
  }

  async create(input: NewLinkInput): Promise<Link> {
    const url = normalizeUrl(input.url) ?? input.url;
    const status = input.status ?? "saved";
    const userId = this.userId;
    // Silently dropped (falls back to unfiled) if `input.projectId` doesn't
    // belong to this user — never trusted as-is, the same "not found and not
    // yours look identical" principle as every other cross-user case in this
    // file. Resolved before the transaction starts since it's a plain read
    // with no need to be part of the same atomic write.
    const projectId = await resolveOwnedProjectId(userId, input.projectId);

    const [inserted] = await getDb()
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
        projectId,
        // Always the authenticated user this scoped repository was built
        // for — nothing in `input` can set or override it.
        userId,
        // The database's own clock, not the app server's `new Date()` — see
        // `update()`'s identical choice below for why the two must agree.
        archivedAt: status === "archived" ? sql`now()` : null,
      })
      .returning({ id: linksTable.id });

    const created = await this.get(inserted.id);
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
    // `projectId` is pulled out too, so a foreign project id can be resolved
    // against this user's own projects before it ever reaches the `SET`
    // clause — see `create()`'s identical guard via `resolveOwnedProjectId`.
    const { note, projectId, ...rest } = patch;
    const resolvedProjectId =
      projectId !== undefined ? await resolveOwnedProjectId(this.userId, projectId) : undefined;

    // `updatedAt`/`archivedAt` are stamped with the database's own clock
    // (`sql`now()``) rather than the app server's `new Date()` — mixing
    // the two is what let `createdAt` (always DB-clock, via `defaultNow()`)
    // and `updatedAt` disagree on ordering whenever the app server's clock
    // drifted from the database's, even by a fraction of a second (caught by
    // the "recently updated" sort test).
    const updated = await getDb()
      .update(linksTable)
      .set({
        ...rest,
        ...(note !== undefined ? { personalNote: note } : {}),
        ...(resolvedProjectId !== undefined ? { projectId: resolvedProjectId } : {}),
        // Keep archivedAt consistent with status in one place, regardless of
        // which call site changed it (the dedicated archive action or a
        // direct status-menu selection).
        ...(patch.status === "archived"
          ? { archivedAt: sql`now()` }
          : patch.status !== undefined
            ? { archivedAt: null }
            : {}),
        updatedAt: sql`now()`,
      })
      .where(and(eq(linksTable.id, id), eq(linksTable.userId, this.userId)))
      .returning({ id: linksTable.id });

    if (updated.length === 0) return null;
    return this.get(id);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(linksTable)
      .where(and(eq(linksTable.id, id), eq(linksTable.userId, this.userId)))
      .returning({ id: linksTable.id });
    return deleted.length > 0;
  }

  /**
   * Apply one bulk action across many ids in a single statement rather than
   * looping per-link — the point of a bulk operation is exactly to avoid N
   * round trips for N selected links. Every branch scopes by `userId` as
   * well as `ids`, so an id belonging to another user mixed into the
   * selection is silently dropped, not acted on.
   */
  async bulkApply(ids: string[], action: BulkLinkAction): Promise<number> {
    if (ids.length === 0) return 0;
    const db = getDb();
    const userId = this.userId;
    const ownedIdsCondition = and(inArray(linksTable.id, ids), eq(linksTable.userId, userId));

    switch (action.type) {
      case "status": {
        const rows = await db
          .update(linksTable)
          .set({
            status: action.status,
            archivedAt: action.status === "archived" ? sql`now()` : null,
            updatedAt: sql`now()`,
          })
          .where(ownedIdsCondition)
          .returning({ id: linksTable.id });
        return rows.length;
      }
      case "archive": {
        const rows = await db
          .update(linksTable)
          .set({ status: "archived", archivedAt: sql`now()`, updatedAt: sql`now()` })
          .where(ownedIdsCondition)
          .returning({ id: linksTable.id });
        return rows.length;
      }
      case "priority": {
        const rows = await db
          .update(linksTable)
          .set({ priority: action.priority, updatedAt: sql`now()` })
          .where(ownedIdsCondition)
          .returning({ id: linksTable.id });
        return rows.length;
      }
      case "project": {
        // Silently resolved to unfiled if `action.projectId` isn't owned by
        // this user — see `create()`'s identical guard.
        const resolvedProjectId = await resolveOwnedProjectId(userId, action.projectId);
        const rows = await db
          .update(linksTable)
          .set({ projectId: resolvedProjectId, updatedAt: sql`now()` })
          .where(ownedIdsCondition)
          .returning({ id: linksTable.id });
        return rows.length;
      }
      case "favorite": {
        const rows = await db
          .update(linksTable)
          .set({ isFavorite: action.value, updatedAt: sql`now()` })
          .where(ownedIdsCondition)
          .returning({ id: linksTable.id });
        return rows.length;
      }
      case "delete": {
        const rows = await db.delete(linksTable).where(ownedIdsCondition).returning({ id: linksTable.id });
        return rows.length;
      }
      default: {
        const exhaustive: never = action;
        throw new Error(`Unhandled bulk action: ${JSON.stringify(exhaustive)}`);
      }
    }
  }
}

/**
 * Translate a `LinkSort` into a Drizzle `orderBy` clause.
 *
 * `priority` sorts by `PRIORITY_META[...].weight` (the same ordering
 * `sortLinks()` uses for the in-memory/mock path) via a `CASE` expression,
 * since the column itself is just the enum's text value — tied entries fall
 * back to newest first, exactly like `sortLinks`.
 */
function buildOrderBy(sort: LinkSort) {
  switch (sort) {
    case "oldest":
      return [asc(linksTable.createdAt)];
    case "recently-updated":
      return [desc(linksTable.updatedAt)];
    case "title":
      return [asc(sql`lower(${linksTable.title})`)];
    case "title-desc":
      return [desc(sql`lower(${linksTable.title})`)];
    case "priority":
      return [asc(priorityWeightExpr()), desc(linksTable.createdAt)];
    case "newest":
    default:
      return [desc(linksTable.createdAt)];
  }
}

function priorityWeightExpr() {
  const whenClauses = PRIORITY_ORDER.map(
    (priority) => sql`when ${priority} then ${PRIORITY_META[priority].weight}`,
  );
  return sql`case ${linksTable.priority} ${sql.join(whenClauses, sql` `)} end`;
}

/**
 * Resolves a project id to itself only if it belongs to `userId`, `null`
 * otherwise (including when `projectId` itself is `null`/`undefined`) — the
 * one place `create`/`update`/`bulkApply`'s "project" action all go through,
 * so a client can never assign a link to another user's project by passing
 * its id directly, even though nothing about a bare UUID reveals whose
 * project it is.
 */
async function resolveOwnedProjectId(
  userId: string,
  projectId: string | null | undefined,
): Promise<string | null> {
  if (!projectId) return null;
  const [row] = await getDb()
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId)))
    .limit(1);
  return row?.id ?? null;
}

/** Translate a `LinkFilter` into a Drizzle `where` condition, always scoped to `userId`. */
function buildWhere(userId: string, filter: LinkFilter) {
  const conditions = [eq(linksTable.userId, userId)];

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

  const query = filter.query?.trim();
  if (query) {
    conditions.push(
      sql`to_tsvector('english', ${linksTable.title} || ' ' || ${linksTable.description} || ' ' || ${linksTable.domain}) @@ plainto_tsquery('english', ${query})`,
    );
  }

  return and(...conditions);
}

export interface ProjectLinkStats {
  count: number;
  lastActivity: string;
}

/**
 * Per-project link count and most-recent update, keyed by project id, scoped
 * to one user.
 *
 * A single GROUP BY over `links` rather than fetching every link just to
 * fold over it in memory (the old `countLinksByProject`/`lastActivityByProject`
 * pure functions did that, which was fine scanning a 20-row fixture array —
 * it isn't once links live in Postgres at real scale).
 */
export async function getProjectLinkStats(userId: string): Promise<Record<string, ProjectLinkStats>> {
  const rows = await getDb()
    .select({
      projectId: linksTable.projectId,
      count: sql<number>`count(*)::int`,
      lastActivity: sql<string>`max(${linksTable.updatedAt})`,
    })
    .from(linksTable)
    .where(and(eq(linksTable.userId, userId), sql`${linksTable.projectId} is not null`))
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
 * Counts for the sidebar's Inbox/Favorites badges, scoped to one user.
 *
 * Preserves Phase 1's exact (if slightly quirky) definitions rather than
 * "fixing" them here: the Inbox badge counts only `status = 'saved'`, not
 * the broader `saved | reading` the Inbox page itself lists — that mismatch
 * already existed in the fixture-backed version and changing it is outside
 * this phase's scope.
 */
export async function getSidebarCounts(userId: string): Promise<SidebarCounts> {
  const db = getDb();

  const [[savedRow], [favoriteRow]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(linksTable)
      .where(and(eq(linksTable.userId, userId), eq(linksTable.status, "saved"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(linksTable)
      .where(and(eq(linksTable.userId, userId), eq(linksTable.isFavorite, true))),
  ]);

  return {
    inbox: savedRow?.count ?? 0,
    favorites: favoriteRow?.count ?? 0,
  };
}

/**
 * Dashboard summary counts for one user, computed as SQL aggregates rather
 * than by fetching every link/project and folding over them in JS (the old
 * `deriveStats` pure function this replaces, since removed along with its
 * only caller). Totals and favorites exclude archived links; unread never
 * includes them in the first place since `UNREAD_STATUSES` doesn't contain
 * `"archived"`.
 */
export async function getLibraryStats(userId: string): Promise<LibraryStats> {
  const db = getDb();

  const [[totalRow], [unreadRow], [favoriteRow], [projectRow]] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(linksTable)
      .where(and(eq(linksTable.userId, userId), sql`${linksTable.status} != 'archived'`)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(linksTable)
      .where(and(eq(linksTable.userId, userId), inArray(linksTable.status, UNREAD_STATUSES))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(linksTable)
      .where(
        and(
          eq(linksTable.userId, userId),
          eq(linksTable.isFavorite, true),
          sql`${linksTable.status} != 'archived'`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(projectsTable)
      .where(eq(projectsTable.userId, userId)),
  ]);

  return {
    totalLinks: totalRow?.count ?? 0,
    unread: unreadRow?.count ?? 0,
    favorites: favoriteRow?.count ?? 0,
    projects: projectRow?.count ?? 0,
  };
}
