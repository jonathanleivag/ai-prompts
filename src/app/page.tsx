import Link from "next/link";
import { listProjects } from "@/lib/data/projects";

export default async function HomePage() {
  const projects = await listProjects();

  return (
    <section>
      <div className="page-heading">
        <h1>Proyectos</h1>
        <Link className="button-link" href="/projects/new">
          Nuevo proyecto
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>Aún no tienes proyectos.</p>
          <Link href="/projects/new">Crea tu primer proyecto</Link>
        </div>
      ) : (
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.id}>{project.name}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
