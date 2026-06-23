import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { listProjects } from "@/lib/data/projects";

export default async function HomePage() {
  const projects = await listProjects();

  return (
    <section className="dashboard">
      <PageHeader
        eyebrow="Mesa de control / Pipelines"
        title={<>Proyectos que piden <span>el próximo prompt.</span></>}
        titleLabel="Proyectos"
        description="Detecta el punto activo, entra al flujo y mantén cada entrega avanzando sin perder el ciclo."
        action={<Link className="button-link" href="/projects/new">Nuevo proyecto</Link>}
      />

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="project-grid">
          {projects.map((project) => (
            <li key={project.id}><ProjectCard project={project} /></li>
          ))}
        </ul>
      )}
    </section>
  );
}
