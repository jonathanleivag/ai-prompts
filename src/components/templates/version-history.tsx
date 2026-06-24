"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export type TemplateVersionView = {
  id: string;
  version: number;
  content: string;
  variables: string[];
  createdAt: string;
};

const VERSION_PAGE_SIZE = 5;

export function VersionHistory({
  versions,
  disabled,
  onRestore,
}: {
  versions: TemplateVersionView[];
  disabled: boolean;
  onRestore: (version: TemplateVersionView, trigger: HTMLButtonElement) => void;
}) {
  const [page, setPage] = useState(1);
  const ordered = [...versions].sort((left, right) => right.version - left.version);
  const totalPages = Math.ceil(ordered.length / VERSION_PAGE_SIZE);
  const paginated = ordered.slice((page - 1) * VERSION_PAGE_SIZE, page * VERSION_PAGE_SIZE);

  return (
    <section className="template-history" aria-labelledby="history-title">
      <div className="template-section-heading">
        <p className="panel-index">03 / Registro</p>
        <h2 id="history-title">Historial de versiones</h2>
      </div>
      <ol className="version-list" aria-label="Historial de versiones">
        {paginated.map((entry) => (
          <li className="version-entry" key={entry.id}>
            <div className="version-entry__heading">
              <div>
                <h3>Versión {entry.version}</h3>
                <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
              </div>
              <Button type="button" variant="quiet" disabled={disabled} onClick={(event) => onRestore(entry, event.currentTarget)}>
                Restaurar versión {entry.version}
              </Button>
            </div>
            <pre>{entry.content}</pre>
          </li>
        ))}
      </ol>
      {totalPages > 1 && (
        <div className="run-history__pagination">
          <button className="pagination__btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
          <span className="pagination__info">{page} / {totalPages}</span>
          <button className="pagination__btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
