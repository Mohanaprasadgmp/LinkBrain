import type {
  AiInsight,
  BulkLinkAction,
  Link,
  LinkFilter,
  LinkSort,
  LinkUpdate,
  NewLinkInput,
  Project,
} from "@/lib/domain/types";

/**
 * Data access interfaces.
 *
 * This is the contract the backend satisfies. `DrizzleLinkRepository` /
 * `DrizzleProjectRepository` (in this same directory) implement these
 * methods against Postgres; nothing that depends on these interfaces needs
 * to change if the backend is ever swapped again — only `lib/data/index.ts`
 * is edited to construct a different implementation.
 *
 * Methods are `async` so code written against this interface is already
 * correct for a network-backed implementation (which it now is).
 *
 * **Every one of these is user-scoped, on purpose at the type level.**
 * `getLinkRepository()`/`getProjectRepository()` return an object whose
 * *only* method is `forUser(userId)` — there is no `list()`,
 * `get()`, etc. directly on them. That id must come from
 * `lib/auth/session.ts`'s `requireUserId()`/`requireUserIdForAction()`
 * (which derive it from the authenticated session), never from a client
 * payload or URL param. Once you have a `forUser(userId)` result, every
 * query it makes is already scoped — there is no method to "forget" to scope,
 * because there is no unscoped method to call by accident.
 */
export interface LinkListOptions {
  sort?: LinkSort;
  limit?: number;
  offset?: number;
}

export interface UserScopedLinkRepository {
  /**
   * `filter` narrows the result set at the database level — status,
   * priority, project, favourite, and free-text `query` (matched against
   * title/description/domain). Omitting it returns everything *this user*
   * owns. `options` control ordering and pagination; omitting them returns
   * every matching row, newest first.
   */
  list(filter?: LinkFilter, options?: LinkListOptions): Promise<Link[]>;
  /** Total rows matching `filter`, ignoring `limit`/`offset` — for pagination UI. */
  count(filter?: LinkFilter): Promise<number>;
  /** `null` both when the id doesn't exist and when it belongs to another user — the two are indistinguishable on purpose. */
  get(id: string): Promise<Link | null>;
  /** Exact match on the stored URL, scoped to this user — used for duplicate-save detection. */
  findByUrl(url: string): Promise<Link | null>;
  /** Always creates the link owned by this user; nothing in `input` can override that. */
  create(input: NewLinkInput): Promise<Link>;
  /** `null` if `id` doesn't exist or belongs to another user. */
  update(id: string, patch: LinkUpdate): Promise<Link | null>;
  /** `false` if `id` doesn't exist or belongs to another user. */
  delete(id: string): Promise<boolean>;
  /**
   * Apply one `BulkLinkAction` to every id in `ids` **owned by this user**.
   * An id in `ids` that belongs to another user (or doesn't exist) is
   * silently skipped, not an error — same "not found and not yours look
   * identical" principle as every other method here. Returns how many rows
   * were actually affected.
   */
  bulkApply(ids: string[], action: BulkLinkAction): Promise<number>;
}

export interface LinkRepository {
  forUser(userId: string): UserScopedLinkRepository;
}

export interface UserScopedProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
  create(input: { name: string; description?: string }): Promise<Project>;
  update(
    id: string,
    patch: Partial<{ name: string; description: string }>,
  ): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
}

export interface ProjectRepository {
  forUser(userId: string): UserScopedProjectRepository;
}

export interface AiInsightCompletion {
  summary: string;
  category: string;
  topics: string[];
  keyPoints: string[];
  contentType: string;
  model: string;
  promptVersion: number;
}

/**
 * Deliberately **not** a `forUser(userId)` repository like the two above —
 * there is no `userId` column on `link_ai_insights` to scope by (see
 * `lib/db/schema/ai-insights.ts`'s doc comment). Ownership is enforced
 * exactly once, upstream: every call site resolves the link through
 * `getLinkRepository().forUser(userId).get(linkId)` first, and only reaches
 * this repository with a `linkId` already proven to belong to that user
 * (see `lib/ai/ai-service.ts` and `lib/actions/ai.ts`).
 */
export interface AiInsightRepository {
  getByLinkId(linkId: string): Promise<AiInsight | null>;
  /** Creates the initial `"pending"` row. Safe to call at most once per link — see call site. */
  insertPending(linkId: string): Promise<AiInsight>;
  /**
   * Atomically claims the *automatic, one-time* attempt: flips `"pending"`
   * or `"failed"` to `"processing"`, or returns `null` if the row is
   * already `"processing"` **or already `"completed"`** — the automatic
   * path must never reprocess a link that already has a valid result (the
   * brief's "avoid processing a link again if an equivalent successful
   * result already exists"). A user-triggered regenerate is the only way to
   * redo a `"completed"` result — see `tryStartRegeneration`.
   */
  tryStartProcessing(linkId: string): Promise<AiInsight | null>;
  /**
   * Atomically claims a *user-requested* regeneration: flips `"pending"`,
   * `"failed"`, **or `"completed"`** to `"processing"`, or returns `null`
   * only if another attempt is already `"processing"` — this is the one
   * path allowed to deliberately override a completed result.
   */
  tryStartRegeneration(linkId: string): Promise<AiInsight | null>;
  markCompleted(linkId: string, result: AiInsightCompletion): Promise<AiInsight | null>;
  /** `reason` is always one of the coarse, safe categories — never a raw error message. */
  markFailed(linkId: string, reason: string): Promise<AiInsight | null>;
}
