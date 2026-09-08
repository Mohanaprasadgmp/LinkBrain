"use server";

import { revalidatePath } from "next/cache";

import { getProjectRepository } from "@/lib/data";
import type { Project } from "@/lib/domain/types";

import { err, ok, toErrorMessage, type ActionResult } from "./result";

function revalidateProjectPaths() {
  revalidatePath("/projects");
  revalidatePath("/links");
}

export async function createProject(input: {
  name: string;
  description?: string;
}): Promise<ActionResult<Project>> {
  if (!input.name.trim()) {
    return err("Give the project a name.");
  }

  try {
    const project = await getProjectRepository().create({
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
  if (patch.name !== undefined && !patch.name.trim()) {
    return err("Give the project a name.");
  }

  try {
    const updated = await getProjectRepository().update(id, patch);
    if (!updated) return err("This project no longer exists.");
    revalidateProjectPaths();
    return ok(updated);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't save your changes. Try again."));
  }
}

export async function deleteProject(id: string): Promise<ActionResult<null>> {
  try {
    const deleted = await getProjectRepository().delete(id);
    if (!deleted) return err("This project no longer exists.");
    revalidateProjectPaths();
    return ok(null);
  } catch (error) {
    return err(toErrorMessage(error, "Couldn't delete this project. Try again."));
  }
}
