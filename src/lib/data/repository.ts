import type {
  Link,
  LinkUpdate,
  NewLinkInput,
  Project,
} from "@/lib/domain/types";

/**
 * Data access interfaces.
 *
 * This is the contract a future backend must satisfy. A Phase 2
 * `PrismaLinkRepository` (or similar) implements these same methods against a
 * real database; nothing that depends on `LinkRepository` needs to change when
 * that happens — only `lib/data/index.ts` (see below) is edited to construct
 * the new implementation instead of the mock.
 *
 * Methods are `async` even though `MockLinkRepository` resolves immediately,
 * so code written against this interface is already correct for a
 * network-backed implementation.
 *
 * Note on Phase 1 wiring: the interactive pages in this phase read and mutate
 * client state through `store/link-store.tsx`, whose reducer actions mirror
 * these methods one-to-one (`create` -> `ADD_LINK`, `update` -> `UPDATE_LINK`,
 * etc). This repository is the seam a future server action or route handler
 * will call directly; the store is what today's UI calls.
 */
export interface LinkRepository {
  list(): Promise<Link[]>;
  get(id: string): Promise<Link | null>;
  create(input: NewLinkInput): Promise<Link>;
  update(id: string, patch: LinkUpdate): Promise<Link | null>;
  delete(id: string): Promise<boolean>;
}

export interface ProjectRepository {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project | null>;
}
