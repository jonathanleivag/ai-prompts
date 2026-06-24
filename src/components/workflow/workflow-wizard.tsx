"use client";

import { useEffect, useMemo, useRef, useState, useTransition, useCallback, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import { completeStepAction, generatePromptAction, reviewDecisionAction } from "@/app/actions/projects";
import { WORKFLOW_STEPS } from "@/components/projects/workflow-steps";
import { Button } from "@/components/ui/button";
import { previewPrompt } from "@/lib/domain/template";
import type { Step } from "@/lib/domain/types";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
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
  resultContent?: string;
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
  const stateKey = `${project.currentStep}-${project.cycle}-${activeRun?.id}-${activeRun?.generatedPrompt ?? ""}-${activeRun?.resultContent ?? ""}`;
  return <WorkflowWorkbench key={stateKey} project={project} activeRun={activeRun} />;
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completada",
  approved: "Aprobada",
  changes_requested: "Rechazada",
  skipped: "Omitida",
};

const RUN_HISTORY_PAGE_SIZE = 5;

function RunHistory({ runs, currentStep, activeCycle }: { runs: WorkflowRunView[]; currentStep: Step; activeCycle: number }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const all = useMemo(() =>
    runs
      .filter((r) => r.generatedPrompt && !(r.step === currentStep && r.cycle === activeCycle))
      .sort((a, b) => a.cycle - b.cycle || a.step - b.step),
    [runs, currentStep, activeCycle],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((r) => {
      const step = WORKFLOW_STEPS[r.step - 1];
      return (
        step?.shortName.toLowerCase().includes(term) ||
        step?.name.toLowerCase().includes(term) ||
        Object.entries(r.variables).some(([k, v]) =>
          k.toLowerCase().includes(term) || v.toLowerCase().includes(term),
        )
      );
    });
  }, [all, q]);

  const totalPages = Math.ceil(filtered.length / RUN_HISTORY_PAGE_SIZE);
  const page_ = Math.min(page, totalPages || 1);
  const paginated = filtered.slice((page_ - 1) * RUN_HISTORY_PAGE_SIZE, page_ * RUN_HISTORY_PAGE_SIZE);

  const handleSearch = useCallback((value: string) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { setQ(value); setPage(1); }, 250);
  }, []);

  if (all.length === 0) return null;

  return (
    <details className="run-history">
      <summary className="run-history__toggle">
        Prompts anteriores ({all.length} {all.length === 1 ? "entrada" : "entradas"})
      </summary>
      <div className="run-history__controls">
        <div className="search-wrap search-wrap--sm">
          <input
            className="search-input search-input--sm"
            type="search"
            placeholder="Buscar por etapa o variable…"
            aria-label="Buscar en el historial"
            onChange={(e) => handleSearch(e.target.value)}
          />
          <svg className="search-wrap__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 10.5 13.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      {paginated.length === 0 ? (
        <p className="run-history__empty">Sin resultados para "{q}".</p>
      ) : (
        <ol className="run-history__list">
          {paginated.map((run) => (
            <li key={run.id} className="run-history__item">
              <div className="run-history__meta">
                <span className="run-history__step">{WORKFLOW_STEPS[run.step - 1]?.shortName} · Etapa {String(run.step).padStart(2, "0")}</span>
                <span className="run-history__cycle">Ciclo {String(run.cycle).padStart(2, "0")}</span>
                <span className={`run-history__status run-history__status--${run.status}`}>
                  {STATUS_LABELS[run.status] ?? run.status}
                </span>
              </div>
              {Object.keys(run.variables).length > 0 && (
                <dl className="run-history__vars">
                  {Object.entries(run.variables).map(([k, v]) => (
                    <div key={k} className="run-history__var">
                      <dt>{k}</dt>
                      {v.length > 120
                        ? <dd><details className="run-history__var-details"><summary>{v.slice(0, 80).replace(/\n/g, " ")}…</summary><pre className="run-history__prompt"><code>{v}</code></pre></details></dd>
                        : <dd>{v}</dd>}
                    </div>
                  ))}
                </dl>
              )}
              <details className="run-history__prompt-wrap">
                <summary>Ver prompt</summary>
                <pre className="run-history__prompt"><code>{run.generatedPrompt}</code></pre>
              </details>
              {run.resultContent && (
                <details className="run-history__prompt-wrap">
                  <summary>Resultado del agente</summary>
                  <pre className="run-history__prompt"><code>{run.resultContent}</code></pre>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
      {totalPages > 1 && (
        <div className="run-history__pagination">
          <button className="pagination__btn" disabled={page_ <= 1} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
          <span className="pagination__info">{page_} / {totalPages}</span>
          <button className="pagination__btn" disabled={page_ >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente →</button>
        </div>
      )}
    </details>
  );
}

function WorkflowWorkbench({ project, activeRun }: { project: WorkflowProjectView; activeRun?: WorkflowRunView }) {
  const router = useRouter();
  const variables = templateVariables(activeRun?.templateSnapshot ?? "");
  const [values, setValues] = useState(() => {
    const initial: Record<string, string> = { ...(activeRun?.variables ?? {}) };
    const getStepResult = (step: number) =>
      project.runs.filter((r) => r.step === step && r.resultContent).sort((a, b) => b.cycle - a.cycle)[0]?.resultContent;
    if (!initial["ANALISIS_DE_REQUERIMIENTO"]) {
      const r = getStepResult(1);
      if (r) initial["ANALISIS_DE_REQUERIMIENTO"] = r;
    }
    if (!initial["ANALISIS_DEL_PROYECTO"]) {
      const r = getStepResult(2);
      if (r) initial["ANALISIS_DEL_PROYECTO"] = r;
    }
    if (!initial["DISENIO_UI_UX"]) {
      const r = getStepResult(3);
      if (r) initial["DISENIO_UI_UX"] = r;
    }
    if (!initial["INPUT_PATH"]) {
      const prevStep = (project.currentStep - 1) as number;
      if (prevStep >= 0) {
        const r = getStepResult(prevStep);
        if (r) initial["INPUT_PATH"] = r;
      }
    }
    if (!initial["DETALLE"]) {
      const r = getStepResult(5);
      if (r) initial["DETALLE"] = r;
    }
    return initial;
  });
  const [prompt, setPrompt] = useState(activeRun?.generatedPrompt);
  const livePreview = useMemo(
    () => previewPrompt(activeRun?.templateSnapshot ?? "", values),
    [activeRun?.templateSnapshot, values],
  );
  const [message, setMessage] = useState<string>();
  const [copyError, setCopyError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [confirmChanges, setConfirmChanges] = useState(false);
  const [decisionError, setDecisionError] = useState<string>();
  const [resultContent, setResultContent] = useState<string | undefined>(activeRun?.resultContent);
  const [pending, startTransition] = useTransition();
  const changesTrigger = useRef<HTMLButtonElement | null>(null);
  const step = WORKFLOW_STEPS.find((s) => s.step === project.currentStep)!;
  const isDecisionStep = project.currentStep === 5 || project.currentStep === 6;

  useEffect(() => {
    if (!confirmChanges && !pending && changesTrigger.current) {
      changesTrigger.current.focus();
      changesTrigger.current = null;
    }
  }, [confirmChanges, pending]);

  function generate() {
    setMessage(undefined);
    startTransition(async () => {
      const filtered = Object.fromEntries(variables.map((v) => [v, values[v] ?? ""]));
      const result = await generatePromptAction({ projectId: project.id, currentStep: project.currentStep, cycle: project.cycle, variables: filtered });
      if (!result.ok) return setMessage(result.message);
      const data = result.data as { prompt: string; variables?: Record<string, string> };
      setPrompt(data.prompt);
      if (data.variables) setValues(data.variables);
      await copy(data.prompt);
    });
  }

  async function copy(value = prompt) {
    if (!value) return;
    setCopied(false);
    setCopyError(undefined);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopyError("No se pudo copiar; inténtalo nuevamente");
    }
  }

  function closeChanges() {
    if (pending) return;
    setConfirmChanges(false);
    setDecisionError(undefined);
  }

  function keepModalFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeChanges();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!event.currentTarget.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  function transition(decision?: "approve" | "request_changes") {
    setMessage(undefined);
    startTransition(async () => {
      const state = { projectId: project.id, currentStep: project.currentStep, cycle: project.cycle, resultContent };
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

  const previewProp = !prompt && Object.values(values).some((v) => v.trim())
    ? livePreview || undefined
    : undefined;

  return (
    <div className="workflow-workbench">
      <div data-testid="workflow-background" inert={confirmChanges ? true : undefined}>
      <StepProgress currentStep={project.currentStep} currentCycle={project.cycle} runs={project.runs} projectStatus={project.status} />
      <header className="workflow-heading">
        <div>
          <p className="eyebrow">Ciclo {String(project.cycle).padStart(2, "0")} / Etapa {String(project.currentStep).padStart(2, "0")}</p>
          <h1>{project.name}</h1>
          <div style={{ marginTop: "1.25rem" }}>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        </div>
        <div><p className="workflow-heading__code">{step.shortName}</p><h2>{step.name}</h2><p>{project.description || "Completa la etapa activa y conserva cada snapshot como evidencia del flujo."}</p></div>
      </header>
      {project.status === "completed" ? (
        <>
          <section className="workflow-complete"><p className="eyebrow">Ruta finalizada</p><h2>Proyecto completado</h2><p>Los ocho pulsos quedaron registrados.</p></section>
          <RunHistory runs={project.runs} currentStep={project.currentStep} activeCycle={-1} />
        </>
      ) : (
        <>
          <div className="workflow-grid">
            <section className="workflow-panel" aria-labelledby="variables-title">
              <p className="panel-index">01 / Variables</p><h2 id="variables-title">Configura el prompt</h2>
              {project.currentStep === 0 && (
                <label className="field workspace-upload">
                  <span className="field__label">Archivo .workspace</span>
                  <input
                    type="file"
                    accept=".workspace,.code-workspace"
                    disabled={pending}
                    className="workspace-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const json = JSON.parse(ev.target?.result as string);
                          const folders: string[] = (json.folders ?? []).map((f: { path: string }) => f.path).filter(Boolean);
                          if (folders.length > 0) {
                            setValues((current) => ({ ...current, WORKSPACE: folders.join(", ") }));
                            return;
                          }
                        } catch {}
                        setValues((current) => ({ ...current, WORKSPACE: file.name.replace(/\.(code-)?workspace$/, "") }));
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              )}
              <VariableForm variables={variables} values={values} disabled={pending} onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))} />
              {message ? <p className="form-alert" role="alert">{message}</p> : null}
              <Button type="button" disabled={pending || variables.some((name) => !values[name]?.trim())} onClick={generate}>{pending ? "Procesando…" : "Generar y copiar"}</Button>
              <p className="workflow-note">Generar y copiar guarda el snapshot, pero no avanza la etapa.</p>
            </section>
            <div className="workflow-output">
              <p className="panel-index">02 / Salida persistente</p>
              <PromptPreview prompt={prompt} preview={previewProp} copyError={copyError} copied={copied} onCopy={copy} />
              {project.currentStep !== 0 && project.currentStep !== 4 && (
                <label className="field workspace-upload">
                  <span className="field__label">Resultado del agente (.md)</span>
                  <input
                    type="file"
                    accept=".md,.markdown"
                    disabled={pending}
                    className="workspace-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => setResultContent(ev.target?.result as string);
                      reader.readAsText(file);
                    }}
                  />
                  {resultContent
                    ? <span className="workspace-upload__ok">✓ {resultContent.split("\n")[0].replace(/^#+ /, "").trim()}</span>
                    : <span className="workspace-upload__hint">Sube el .md generado por el agente para poder completar la etapa.</span>}
                </label>
              )}
              <div className="workflow-actions">
                {isDecisionStep
                  ? <><Button type="button" disabled={!prompt || !resultContent || pending} onClick={() => transition("approve")}>Aprobado</Button><Button type="button" variant="quiet" disabled={!prompt || !resultContent || pending} onClick={(event) => { changesTrigger.current = event.currentTarget; setDecisionError(undefined); setConfirmChanges(true); }}>Requiere cambios</Button></>
                  : <Button type="button" disabled={!prompt || (project.currentStep !== 0 && project.currentStep !== 4 && !resultContent) || pending} onClick={() => transition()}>Completar etapa</Button>}
              </div>
            </div>
          </div>
          <RunHistory runs={project.runs} currentStep={project.currentStep} activeCycle={project.cycle} />
        </>
      )}
      </div>
      {confirmChanges ? <div className="confirmation-backdrop"><section className="confirmation" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" onKeyDown={keepModalFocus}><p className="panel-index">Confirmación requerida</p><h2 id="confirm-title">Iniciar un ciclo nuevo</h2><p id="confirm-description">Esta decisión vuelve a Requerimiento y conserva el historial del ciclo actual.</p>{decisionError ? <p className="form-alert" role="alert" aria-live="assertive">{decisionError}</p> : null}<div className="form-actions"><Button type="button" autoFocus onClick={() => transition("request_changes")} disabled={pending}>Confirmar cambios</Button><Button type="button" variant="quiet" onClick={closeChanges} disabled={pending}>Cancelar</Button></div></section></div> : null}
    </div>
  );
}
