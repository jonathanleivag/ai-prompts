import Link from "next/link";

export function EmptyState() {
  return (
    <div className="empty-state">
      <span className="empty-state__index" aria-hidden="true">00 / 08</span>
      <div>
        <h2>La mesa está lista.</h2>
        <p>Crea un proyecto para activar su primera etapa y preparar el próximo prompt.</p>
      </div>
      <Link className="button-link" href="/projects/new">Crear primer proyecto</Link>
    </div>
  );
}
