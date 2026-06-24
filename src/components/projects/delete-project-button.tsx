"use client";

import { useTransition } from "react";

import { deleteProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${projectName}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      await deleteProjectAction(projectId);
    });
  }

  return (
    <Button type="button" variant="quiet" disabled={pending} onClick={handleDelete}>
      {pending ? "Eliminando…" : "Eliminar proyecto"}
    </Button>
  );
}
