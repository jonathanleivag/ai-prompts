import Link from "next/link";

import type { ProjectSummary } from "@/lib/data/projects";
import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STEPS } from "./workflow-steps";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const current = WORKFLOW_STEPS.find((s) => s.step === project.currentStep)!;
  const isCompleted = project.status === "completed";
  const formattedDate = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(project.updatedAt);

  return (
    <article className="project-card">
      <div className="project-card__meta">
        <span>Ciclo {String(project.cycle).padStart(2, "0")}</span>
        <Badge tone={isCompleted ? "neutral" : "active"}>
          {isCompleted ? "Completado" : "En curso"}
        </Badge>
      </div>
      <div className="project-card__body">
        <div>
          <p className="project-card__step">
            {isCompleted ? "Flujo completado" : "Próximo prompt"} · {current.shortName}
          </p>
          <h2><Link href={`/projects/${project.id}`}>{project.name}</Link></h2>
          {isCompleted ? <p className="project-card__completion">Checklist finalizado</p> : null}
          <p className="project-card__description">{project.description || "Sin descripción operativa."}</p>
        </div>
        <span className="project-card__number" aria-hidden="true">{String(project.currentStep).padStart(2, "0")}</span>
      </div>
      <ol className="pulse-route" aria-label={`Progreso: etapa ${project.currentStep} de 12`}>
        {WORKFLOW_STEPS.map(({ step, name, shortName }) => {
          const state = !isCompleted && step === project.currentStep
            ? "active"
            : project.cycle === 1 && step < project.initialStep
            ? "omitted"
            : isCompleted || step < project.currentStep
            ? "complete"
            : "waiting";
          return (
            <li className={`pulse-route__step pulse-route__step--${state}`} key={step}>
              <span className="pulse-route__bar" aria-hidden="true" />
              <span className="pulse-route__label"><b>{String(step).padStart(2, "0")}</b> {shortName}</span>
              <span className="sr-only">{name}: {state === "omitted" ? "omitida" : state === "complete" ? "completada" : state === "active" ? "actual" : "pendiente"}</span>
            </li>
          );
        })}
      </ol>
      <footer className="project-card__footer">
        <span>Actualizado {formattedDate}</span>
        <Link aria-label={`Abrir proyecto ${project.name}`} href={`/projects/${project.id}`}>
          {isCompleted ? "Ver historial" : "Abrir flujo"} <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </article>
  );
}
