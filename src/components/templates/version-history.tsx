import { Button } from "@/components/ui/button";

export type TemplateVersionView = {
  id: string;
  version: number;
  content: string;
  variables: string[];
  createdAt: string;
};

export function VersionHistory({
  versions,
  disabled,
  onRestore,
}: {
  versions: TemplateVersionView[];
  disabled: boolean;
  onRestore: (version: TemplateVersionView) => void;
}) {
  const ordered = [...versions].sort((left, right) => right.version - left.version);

  return (
    <section className="template-history" aria-labelledby="history-title">
      <div className="template-section-heading">
        <p className="panel-index">03 / Registro</p>
        <h2 id="history-title">Historial de versiones</h2>
      </div>
      <ol className="version-list" aria-label="Historial de versiones">
        {ordered.map((entry) => (
          <li className="version-entry" key={entry.id}>
            <div className="version-entry__heading">
              <div>
                <h3>Versión {entry.version}</h3>
                <time dateTime={entry.createdAt}>{formatDate(entry.createdAt)}</time>
              </div>
              <Button type="button" variant="quiet" disabled={disabled} onClick={() => onRestore(entry)}>
                Restaurar versión {entry.version}
              </Button>
            </div>
            <pre>{entry.content}</pre>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
