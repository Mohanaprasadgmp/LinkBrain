"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ProjectDialog } from "@/components/projects/project-dialog";
import { Button } from "@/components/ui/button";

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="size-3.5" />
        New project
      </Button>

      <ProjectDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
