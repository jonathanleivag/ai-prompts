"use client";

import { useTransition, useState, type KeyboardEvent } from "react";

import { deleteProjectAction } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await deleteProjectAction(projectId);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && !pending) setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        Eliminar proyecto
      </Button>

      {open ? (
        <div className="confirmation-backdrop" onKeyDown={handleKeyDown}>
          <section
            className="confirmation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
          >
            <p className="panel-index">Acción irreversible</p>
            <h2 id="delete-title">Eliminar proyecto</h2>
            <p id="delete-description">
              Se eliminarán permanentemente <strong>"{projectName}"</strong> y todos sus prompts, variables y eventos registrados. Esta acción no se puede deshacer.
            </p>
            <div className="form-actions">
              <Button type="button" variant="danger" autoFocus disabled={pending} onClick={handleConfirm}>
                {pending ? "Eliminando…" : "Sí, eliminar"}
              </Button>
              <Button type="button" variant="quiet" disabled={pending} onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
