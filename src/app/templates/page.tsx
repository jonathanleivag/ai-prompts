import Link from "next/link";

import { WORKFLOW_STEPS } from "@/components/projects/workflow-steps";
import { PageHeader } from "@/components/ui/page-header";
import { listTemplates } from "@/lib/data/templates";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <section>
      <PageHeader
        eyebrow="Biblioteca / Ocho etapas"
        title={<>Plantillas con <span>memoria editorial.</span></>}
        titleLabel="Plantillas"
        description="Revisa el agente recomendado, edita el prompt fuente y recupera cualquier versión sin perder el registro."
      />
      <ol className="template-catalog" aria-label="Plantillas por etapa">
        {templates.map((template) => (
          <li className="template-catalog__item" key={template.id}>
            <Link href={`/templates/${template.id}`}>
              <span className="template-catalog__step">{String(template.step).padStart(2, "0")} / {WORKFLOW_STEPS[template.step - 1]?.shortName}</span>
              <strong>{template.name}</strong>
              <span>Agente / {template.recommendedAgent}</span>
              <span>v{template.currentVersion} · {formatDate(template.updatedAt)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(value);
}
