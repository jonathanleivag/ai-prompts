import { WORKFLOW_STEPS } from "@/components/projects/workflow-steps";
import type { Step } from "@/lib/domain/types";

export type ProgressRun = { step: Step; status: string };

export function StepProgress({ currentStep, runs }: { currentStep: Step; runs: ProgressRun[] }) {
  const statusByStep = new Map(runs.map((run) => [run.step, run.status]));
  return (
    <nav className="workflow-progress" aria-label="Progreso del proyecto">
      <ol className="workflow-route" aria-label="Ruta del workflow">
        {WORKFLOW_STEPS.map(({ step, name, shortName }) => {
          const runStatus = statusByStep.get(step);
          const state = runStatus === "skipped" ? "skipped" : step === currentStep ? "current" : runStatus && runStatus !== "active" ? "completed" : "pending";
          const label = state === "skipped" ? "Omitida" : state === "current" ? "Actual" : state === "completed" ? "Completada" : "Pendiente";
          return (
            <li className={`workflow-route__step workflow-route__step--${state}`} key={step} aria-current={state === "current" ? "step" : undefined}>
              <span className="workflow-route__pulse" aria-hidden="true" />
              <span className="workflow-route__index">{String(step).padStart(2, "0")}</span>
              <span className="workflow-route__name">{name} · {label}</span>
              <span className="workflow-route__short" aria-hidden="true">{shortName}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
