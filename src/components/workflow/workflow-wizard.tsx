"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { completeStepAction, generatePromptAction, reviewDecisionAction } from "@/app/actions/projects";
import { WORKFLOW_STEPS } from "@/components/projects/workflow-steps";
import { Button } from "@/components/ui/button";
import type { Step } from "@/lib/domain/types";
import { PromptPreview } from "./prompt-preview";
import { StepProgress } from "./step-progress";
import { VariableForm } from "./variable-form";

export type WorkflowRunView = {
  id: string;
  step: Step;
  cycle: number;
  status: string;
  templateSnapshot: string;
  variables: Record<string, string>;
  generatedPrompt?: string;
};
export type WorkflowProjectView = {
  id: string;
  name: string;
  description: string;
  currentStep: Step;
  cycle: number;
  status: "active" | "completed" | "archived";
  runs: WorkflowRunView[];
};

function templateVariables(template: string) {
  return [...new Set(Array.from(template.matchAll(/{{\s*([A-Z][A-Z0-9_]*)\s*}}/g), (match) => match[1]))];
}

export function WorkflowWizard({ project }: { project: WorkflowProjectView }) {
  const activeRun = useMemo(() => project.runs.find((run) => run.step === project.currentStep && run.cycle === project.cycle && run.status === "active") ?? project.runs.find((run) => run.step === project.currentStep && run.cycle === project.cycle), [project]);
  const stateKey = `${project.currentStep}-${project.cycle}-${activeRun?.id}-${activeRun?.generatedPrompt ?? ""}`;
  return <WorkflowWorkbench key={stateKey} project={project} activeRun={activeRun} />;
}

function WorkflowWorkbench({ project, activeRun }: { project: WorkflowProjectView; activeRun?: WorkflowRunView }) {
  const router = useRouter();
  const variables = templateVariables(activeRun?.templateSnapshot ?? "");
  const [values, setValues] = useState(activeRun?.variables ?? {});
  const [prompt, setPrompt] = useState(activeRun?.generatedPrompt);
  const [message, setMessage] = useState<string>();
  const [copyError, setCopyError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [confirmChanges, setConfirmChanges] = useState(false);
  const [decisionError, setDecisionError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const step = WORKFLOW_STEPS[project.currentStep - 1];
  const isDecisionStep = project.currentStep === 5 || project.currentStep === 6;

  function generate() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await generatePromptAction({ projectId: project.id, currentStep: project.currentStep, cycle: project.cycle, variables: values });
      if (!result.ok) return setMessage(result.message);
      const data = result.data as { prompt: string; variables?: Record<string, string> };
      setPrompt(data.prompt);
      if (data.variables) setValues(data.variables);
    });
  }

  async function copy() {
    if (!prompt) return;
    setCopied(false);
    setCopyError(undefined);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setCopyError("No se pudo copiar; inténtalo nuevamente");
    }
  }

  function transition(decision?: "approve" | "request_changes") {
    setMessage(undefined);
    startTransition(async () => {
      const state = { projectId: project.id, currentStep: project.currentStep, cycle: project.cycle };
      const result = decision ? await reviewDecisionAction({ ...state, decision }) : await completeStepAction(state);
      if (!result.ok) {
        if (decision === "request_changes") setDecisionError(result.message);
        else setMessage(result.message);
        return;
      }
      setConfirmChanges(false);
      setDecisionError(undefined);
      router.refresh();
    });
  }

  return (
    <div className="workflow-workbench">
      <StepProgress currentStep={project.currentStep} runs={project.runs} projectStatus={project.status} />
      <header className="workflow-heading">
        <div><p className="eyebrow">Ciclo {String(project.cycle).padStart(2, "0")} / Etapa {String(project.currentStep).padStart(2, "0")}</p><h1>{project.name}</h1></div>
        <div><p className="workflow-heading__code">{step.shortName}</p><h2>{step.name}</h2><p>{project.description || "Completa la etapa activa y conserva cada snapshot como evidencia del flujo."}</p></div>
      </header>
      {project.status === "completed" ? <section className="workflow-complete"><p className="eyebrow">Ruta finalizada</p><h2>Proyecto completado</h2><p>Los ocho pulsos quedaron registrados.</p></section> : (
        <div className="workflow-grid">
          <section className="workflow-panel" aria-labelledby="variables-title">
            <p className="panel-index">01 / Variables</p><h2 id="variables-title">Configura el prompt</h2>
            <VariableForm variables={variables} values={values} disabled={pending} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} />
            {message ? <p className="form-alert" role="alert">{message}</p> : null}
            <Button type="button" disabled={pending || variables.some((name) => !values[name]?.trim())} onClick={generate}>{pending ? "Procesando…" : "Generar prompt"}</Button>
            <p className="workflow-note">Generar guarda el snapshot, pero no avanza la etapa.</p>
          </section>
          <div className="workflow-output">
            <p className="panel-index">02 / Salida persistente</p>
            <PromptPreview prompt={prompt} copyError={copyError} copied={copied} onCopy={copy} />
            <div className="workflow-actions">
              {isDecisionStep ? <><Button type="button" disabled={!prompt || pending} onClick={() => transition("approve")}>Aprobado</Button><Button type="button" variant="quiet" disabled={!prompt || pending} onClick={() => { setDecisionError(undefined); setConfirmChanges(true); }}>Requiere cambios</Button></> : <Button type="button" disabled={!prompt || pending} onClick={() => transition()}>Completar etapa</Button>}
            </div>
          </div>
        </div>
      )}
      {confirmChanges ? <div className="confirmation-backdrop" onKeyDown={(event) => { if (event.key === "Escape" && !pending) { setConfirmChanges(false); setDecisionError(undefined); } }}><section className="confirmation" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><p className="panel-index">Confirmación requerida</p><h2 id="confirm-title">Iniciar un ciclo nuevo</h2><p id="confirm-description">Esta decisión vuelve a Requerimiento y conserva el historial del ciclo actual.</p>{decisionError ? <p className="form-alert" role="alert" aria-live="assertive">{decisionError}</p> : null}<div className="form-actions"><Button type="button" autoFocus onClick={() => transition("request_changes")} disabled={pending}>Confirmar cambios</Button><Button type="button" variant="quiet" onClick={() => { setConfirmChanges(false); setDecisionError(undefined); }} disabled={pending}>Cancelar</Button></div></section></div> : null}
    </div>
  );
}
