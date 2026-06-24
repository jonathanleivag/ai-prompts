import Link from "next/link";

export default function ProjectNotFound() {
  return <section className="not-found-panel"><p className="eyebrow">Error 404 / Proyecto</p><h1>Proyecto no encontrado</h1><p>El identificador no corresponde a un proyecto disponible.</p><Link className="button-link" href="/">Volver a proyectos</Link></section>;
}
