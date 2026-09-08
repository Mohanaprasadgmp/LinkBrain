import type { Project } from "@/lib/domain/types";

/**
 * Seed projects.
 *
 * Phase 1 data only. Ids are stable, human-readable strings so that link
 * fixtures can reference them legibly; a real database would use generated ids.
 */
export const PROJECT_FIXTURES: Project[] = [
  {
    id: "proj-aws-learning",
    name: "AWS Learning",
    description:
      "Working through serverless and data services, one certification at a time.",
    accent: "amber",
    createdAt: "2026-05-14T09:20:00.000Z",
    updatedAt: "2026-09-06T16:05:00.000Z",
  },
  {
    id: "proj-youtube-channel",
    name: "YouTube Channel",
    description:
      "Research, thumbnails and scripting references for the dev channel.",
    accent: "rose",
    createdAt: "2026-06-02T11:00:00.000Z",
    updatedAt: "2026-09-07T08:40:00.000Z",
  },
  {
    id: "proj-travel",
    name: "Travel",
    description: "Itineraries, visa notes and places worth the detour.",
    accent: "teal",
    createdAt: "2026-04-21T18:30:00.000Z",
    updatedAt: "2026-09-01T13:15:00.000Z",
  },
  {
    id: "proj-development",
    name: "Development",
    description:
      "Patterns, tooling and deep dives that make the day job smoother.",
    accent: "violet",
    createdAt: "2026-03-08T07:45:00.000Z",
    updatedAt: "2026-09-07T19:25:00.000Z",
  },
  {
    id: "proj-personal",
    name: "Personal",
    description: "Recipes, reading lists and things that are nobody's business.",
    accent: "slate",
    createdAt: "2026-02-19T20:10:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
  },
];
