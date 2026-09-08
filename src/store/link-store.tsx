"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

import { LINK_FIXTURES } from "@/lib/data/fixtures/links";
import { PROJECT_FIXTURES } from "@/lib/data/fixtures/projects";
import type {
  Link,
  LinkStatus,
  LinkUpdate,
  NewLinkInput,
  Priority,
  Project,
} from "@/lib/domain/types";
import { extractDomain, normalizeUrl, titleFromUrl } from "@/lib/utils/url";

/**
 * Client-side link state.
 *
 * The initial state is seeded directly from the fixtures (the same data
 * `MockLinkRepository` wraps) so the first render is synchronous and
 * flash-free — there is nothing to fetch yet. Every action below mirrors a
 * `LinkRepository` method one-to-one (see `lib/data/repository.ts`), so that
 * when Phase 2 introduces persistence, each action becomes "call the
 * repository/server action, then dispatch the result" rather than a rewrite of
 * the reducer's shape.
 */

interface LinkState {
  links: Link[];
  projects: Project[];
}

type LinkAction =
  | { type: "ADD_LINK"; input: NewLinkInput }
  | { type: "UPDATE_LINK"; id: string; patch: LinkUpdate }
  | { type: "DELETE_LINK"; id: string }
  | { type: "TOGGLE_FAVORITE"; id: string }
  | { type: "SET_STATUS"; id: string; status: LinkStatus }
  | { type: "SET_PRIORITY"; id: string; priority: Priority }
  | { type: "ARCHIVE_LINK"; id: string };

function createInitialState(): LinkState {
  return {
    links: LINK_FIXTURES.map((link) => ({ ...link })),
    projects: PROJECT_FIXTURES.map((project) => ({ ...project })),
  };
}

function withUpdatedLink(
  links: Link[],
  id: string,
  patch: LinkUpdate,
): Link[] {
  const now = new Date().toISOString();
  return links.map((link) =>
    link.id === id ? { ...link, ...patch, updatedAt: now } : link,
  );
}

function reducer(state: LinkState, action: LinkAction): LinkState {
  switch (action.type) {
    case "ADD_LINK": {
      const { input } = action;
      const url = normalizeUrl(input.url) ?? input.url;
      const now = new Date().toISOString();

      const link: Link = {
        id: `link-${now}-${Math.random().toString(36).slice(2, 8)}`,
        url,
        domain: extractDomain(url),
        title: input.title.trim() || titleFromUrl(url),
        description: input.description?.trim() ?? "",
        note: input.note?.trim() ?? "",
        tags: input.tags ?? [],
        status: input.status ?? "saved",
        priority: input.priority ?? "useful",
        isFavorite: input.isFavorite ?? false,
        projectId: input.projectId ?? null,
        createdAt: now,
        updatedAt: now,
      };

      return { ...state, links: [link, ...state.links] };
    }

    case "UPDATE_LINK":
      return {
        ...state,
        links: withUpdatedLink(state.links, action.id, action.patch),
      };

    case "DELETE_LINK":
      return {
        ...state,
        links: state.links.filter((link) => link.id !== action.id),
      };

    case "TOGGLE_FAVORITE": {
      const current = state.links.find((link) => link.id === action.id);
      if (!current) return state;
      return {
        ...state,
        links: withUpdatedLink(state.links, action.id, {
          isFavorite: !current.isFavorite,
        }),
      };
    }

    case "SET_STATUS":
      return {
        ...state,
        links: withUpdatedLink(state.links, action.id, {
          status: action.status,
        }),
      };

    case "SET_PRIORITY":
      return {
        ...state,
        links: withUpdatedLink(state.links, action.id, {
          priority: action.priority,
        }),
      };

    case "ARCHIVE_LINK":
      return {
        ...state,
        links: withUpdatedLink(state.links, action.id, {
          status: "archived",
        }),
      };

    default:
      return state;
  }
}

interface LinkStoreContextValue extends LinkState {
  addLink: (input: NewLinkInput) => void;
  updateLink: (id: string, patch: LinkUpdate) => void;
  deleteLink: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setStatus: (id: string, status: LinkStatus) => void;
  setPriority: (id: string, priority: Priority) => void;
  archiveLink: (id: string) => void;
}

const LinkStoreContext = createContext<LinkStoreContextValue | null>(null);

export function LinkStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  const value = useMemo<LinkStoreContextValue>(
    () => ({
      ...state,
      addLink: (input) => dispatch({ type: "ADD_LINK", input }),
      updateLink: (id, patch) => dispatch({ type: "UPDATE_LINK", id, patch }),
      deleteLink: (id) => dispatch({ type: "DELETE_LINK", id }),
      toggleFavorite: (id) => dispatch({ type: "TOGGLE_FAVORITE", id }),
      setStatus: (id, status) => dispatch({ type: "SET_STATUS", id, status }),
      setPriority: (id, priority) =>
        dispatch({ type: "SET_PRIORITY", id, priority }),
      archiveLink: (id) => dispatch({ type: "ARCHIVE_LINK", id }),
    }),
    [state],
  );

  return (
    <LinkStoreContext.Provider value={value}>
      {children}
    </LinkStoreContext.Provider>
  );
}

export function useLinkStore(): LinkStoreContextValue {
  const context = useContext(LinkStoreContext);
  if (!context) {
    throw new Error("useLinkStore must be used within a LinkStoreProvider");
  }
  return context;
}
