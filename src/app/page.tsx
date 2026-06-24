import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { auth } from "@/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ProjectCard } from "@/components/projects/project-card";
import { listProjects } from "@/lib/data/projects";

const PAGE_SIZE = 6;

export default async function HomePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const session = await auth();
  const userId = session?.user?.email;
  if (!userId) redirect("/login");

  const params = await searchParams;
  const q = params.q ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const { items: projects, total } = await listProjects({ userId, q, page, pageSize: PAGE_SIZE });

  return (
    <section className="dashboard">
      <PageHeader
        eyebrow="Mesa de control / Pipelines"
        title={<>Proyectos que piden <span>el próximo prompt.</span></>}
        titleLabel="Proyectos"
        description="Detecta el punto activo, entra al flujo y mantén cada entrega avanzando sin perder el ciclo."
        action={<Link className="button-link" href="/projects/new">Nuevo proyecto</Link>}
      />

      <Suspense>
        <SearchInput defaultValue={q} placeholder="Buscar proyecto…" />
      </Suspense>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ul className="project-grid">
            {projects.map((project) => (
              <li key={project.id}><ProjectCard project={project} /></li>
            ))}
          </ul>
          <Suspense>
            <Pagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              basePath="/"
              searchParams={q ? { q } : {}}
            />
          </Suspense>
        </>
      )}
    </section>
  );
}
