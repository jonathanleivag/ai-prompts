import Link from "next/link";

import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewProjectPage() {
  return (
    <section className="new-project-page">
      <Link className="back-link" href="/">← Volver a proyectos</Link>
      <PageHeader
        eyebrow="Nueva ruta / 01"
        title={<>Activa el <span>próximo prompt.</span></>}
        description="Define el encargo y el punto de entrada. El flujo conserva la ruta completa, incluso si ya llegas con trabajo avanzado."
      />
      <div className="form-layout">
        <aside className="form-layout__note">
          <span>01—08</span>
          <p>Ocho etapas, un estado visible y una entrega lista para coordinar.</p>
        </aside>
        <ProjectForm />
      </div>
    </section>
  );
}
