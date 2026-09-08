import { LINK_FIXTURES } from "@/lib/data/fixtures/links";
import { PROJECT_FIXTURES } from "@/lib/data/fixtures/projects";
import type { Link, LinkUpdate, NewLinkInput, Project } from "@/lib/domain/types";
import { pickProjectAccent } from "@/lib/utils/project-accent";
import { extractDomain, normalizeUrl, titleFromUrl } from "@/lib/utils/url";

import type { LinkRepository, ProjectRepository } from "./repository";

/**
 * In-memory implementation of `LinkRepository`, backed by the fixtures.
 *
 * Holds its own mutable copy of the fixtures rather than the fixtures array
 * itself, so repeated create/update/delete calls (from a future server action,
 * for instance) don't corrupt the original seed data.
 */
export class MockLinkRepository implements LinkRepository {
  private links: Link[] = LINK_FIXTURES.map((link) => ({ ...link }));

  async list(): Promise<Link[]> {
    return [...this.links];
  }

  async get(id: string): Promise<Link | null> {
    return this.links.find((link) => link.id === id) ?? null;
  }

  async create(input: NewLinkInput): Promise<Link> {
    const url = normalizeUrl(input.url) ?? input.url;
    const now = new Date().toISOString();

    const link: Link = {
      id: `link-${crypto.randomUUID()}`,
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

    this.links = [link, ...this.links];
    return link;
  }

  async update(id: string, patch: LinkUpdate): Promise<Link | null> {
    let updated: Link | null = null;

    this.links = this.links.map((link) => {
      if (link.id !== id) return link;
      updated = { ...link, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    });

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.links.length;
    this.links = this.links.filter((link) => link.id !== id);
    return this.links.length < before;
  }
}

export class MockProjectRepository implements ProjectRepository {
  private projects: Project[] = PROJECT_FIXTURES.map((project) => ({
    ...project,
  }));

  async list(): Promise<Project[]> {
    return [...this.projects];
  }

  async get(id: string): Promise<Project | null> {
    return this.projects.find((project) => project.id === id) ?? null;
  }

  async create(input: { name: string; description?: string }): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: `proj-${crypto.randomUUID()}`,
      name: input.name,
      description: input.description ?? "",
      accent: pickProjectAccent(input.name),
      createdAt: now,
      updatedAt: now,
    };
    this.projects = [...this.projects, project];
    return project;
  }

  async update(
    id: string,
    patch: Partial<{ name: string; description: string }>,
  ): Promise<Project | null> {
    let updated: Project | null = null;

    this.projects = this.projects.map((project) => {
      if (project.id !== id) return project;
      updated = { ...project, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    });

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.projects.length;
    this.projects = this.projects.filter((project) => project.id !== id);
    return this.projects.length < before;
  }
}
