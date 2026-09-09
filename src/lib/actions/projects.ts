"use server";

import { revalidatePath } from "next/cache";

import { requireUserIdForAction } from "@/lib/auth/session";
import { getProjectRepository } from "@/lib/data";
import type { Project } from "@/lib/domain/types";

import { err, ok, toErrorMessage, type ActionResult } from "./result";

function revalidateProjectPaths() {
  revalidatePath("/projects");
  revalidatePath("/links");
}

const MAX_PROJECT_NAME_LENGTH = 100;

/** Shared name validation for create/update, so both fail the same way on the same input. */
function validateProjectName(name: string | undefined): string | null {
  if (name === undefined) return null;
  if (!name.trim()) return "Give the project a name.";
  if (name.trim().length > MAX_PROJECT_NAME_LENGTH) {
    return `Project names are limited to ${MAX_PROJECT_NAME_LENGTH} characters.`;
  }
  return null;
}

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<ActionResult<Project>> {
  const nameError = validateProjectName(input.name);
  if (nameError) return err(nameError);

  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const project = await getProjectRepository().forUser(auth.userId).create({
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
    });
    revalidateProjectPaths();
    return ok(project);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't create this project. Try again."));
  }
}

export async function updateProject(
  id: string,
  patch: Partial<{ name: string; description: string }>,
): Promise<ActionResult<Project>> {
  const nameError = validateProjectName(patch.name);
  if (nameError) return err(nameError);

  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const updated = await getProjectRepository().forUser(auth.userId).update(id, {
      ...patch,
      name: patch.name?.trim(),
      description: patch.description?.trim(),
    });
    if (!updated) return err("This project no longer exists.");
    revalidateProjectPaths();
    revalidatePath(`/projects/${id}`);
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't save your changes. Try again."));
  }
}

export async function deleteProject(id: string): Promise<ActionResult<null>> {
  const auth = await requireUserIdForAction();
  if (!auth.ok) return err(auth.error);

  try {
    const deleted = await getProjectRepository().forUser(auth.userId).delete(id);
    if (!deleted) return err("This project no longer exists.");
    revalidateProjectPaths();
    return ok(null);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't delete this project. Try again."));
  }
}
