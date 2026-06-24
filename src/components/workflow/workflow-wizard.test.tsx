import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { WorkflowWizard, type WorkflowProjectView } from "./workflow-wizard";

const actions = vi.hoisted(() => ({
  generate: vi.fn(),
  complete: vi.fn(),
  decide: vi.fn(),
}));

vi.mock("@/app/actions/projects", () => ({
  generatePromptAction: actions.generate,
  completeStepAction: actions.complete,
  reviewDecisionAction: actions.decide,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const project: WorkflowProjectView = {
  id: "665f4e4e8a77a64e3b6d1200",
  name: "Agente móvil",
  description: "Entrega guiada",
  currentStep: 4,
  cycle: 2,
  status: "active",
  runs: [
    { id: "1", step: 1, cycle: 2, status: "skipped", templateSnapshot: "Descubrir {{GOAL}}", variables: {} },
    { id: "2", step: 2, cycle: 2, status: "completed", templateSnapshot: "Definir {{SCOPE}}", variables: { SCOPE: "MVP" }, generatedPrompt: "Definir MVP" },
    { id: "4", step: 4, cycle: 2, status: "active", templateSnapshot: "Implementa {{FEATURE}} para {{AUDIENCE}}", variables: {} },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  actions.generate.mockResolvedValue({ ok: true, data: { prompt: "Prompt exacto persistido", variables: { FEATURE: "offline", AUDIENCE: "equipos" } } });
  actions.complete.mockResolvedValue({ ok: true, data: { currentStep: 5 } });
  actions.decide.mockResolvedValue({ ok: true, data: { currentStep: 6 } });
});

describe("WorkflowWizard", () => {
  test("muestra nueve etapas y distingue omitida, completada y actual", () => {
    render(<WorkflowWizard project={project} />);
    const progress = screen.getByRole("list", { name: "Ruta del workflow" });
    expect(within(progress).getAllByRole("listitem")).toHaveLength(9);
    expect(within(progress).getByText(/Requerimiento · Omitida/)).toBeInTheDocument();
    expect(within(progress).getByText(/Análisis técnico · Completada/)).toBeInTheDocument();
    expect(within(progress).getByText(/Implementación · Actual/)).toBeInTheDocument();
  });

  test("preserva etapas omitidas y marca las ejecutadas completadas cuando el proyecto terminó", () => {
    const completedRuns = Array.from({ length: 9 }, (_, index) => ({
      id: String(index),
      step: index as WorkflowProjectView["currentStep"],
      cycle: 2,
      status: index < 3 ? "skipped" : "completed",
      templateSnapshot: "",
      variables: {},
    }));
    render(<WorkflowWizard project={{ ...project, status: "completed", currentStep: 8, runs: completedRuns }} />);
    const progress = screen.getByRole("list", { name: "Ruta del workflow" });

    expect(within(progress).getAllByText(/· Omitida$/)).toHaveLength(3);
    expect(within(progress).getAllByText(/· Completada$/)).toHaveLength(6);
    expect(within(progress).queryByText(/· Actual$/)).not.toBeInTheDocument();
    expect(within(progress).queryByRole("listitem", { current: "step" })).not.toBeInTheDocument();
  });

  test("deriva los campos de variables de la plantilla activa", () => {
    render(<WorkflowWizard project={project} />);
    expect(screen.getByLabelText("FEATURE")).toBeInTheDocument();
    expect(screen.getByLabelText("AUDIENCE")).toBeInTheDocument();
  });

  test("genera y copia el snapshot exacto automáticamente sin avanzar la etapa", async () => {
    render(<WorkflowWizard project={project} />);
    fireEvent.change(screen.getByLabelText("FEATURE"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("AUDIENCE"), { target: { value: "equipos" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar y copiar" }));

    expect(await screen.findByText("Prompt exacto persistido")).toBeInTheDocument();
    expect(actions.generate).toHaveBeenCalledWith(expect.objectContaining({ currentStep: 4, cycle: 2 }));
    expect(actions.complete).not.toHaveBeenCalled();
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Prompt exacto persistido"));
  });

  test("conserva el prompt recién generado y ofrece reintento si la copia automática falla", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    render(<WorkflowWizard project={project} />);
    fireEvent.change(screen.getByLabelText("FEATURE"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("AUDIENCE"), { target: { value: "equipos" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar y copiar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo copiar; inténtalo nuevamente");
    expect(screen.getByText("Prompt exacto persistido")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copiar prompt" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Copiado al portapapeles.");
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2);
  });

  test("conserva el preview y permite reintentar cuando falla el portapapeles", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    render(<WorkflowWizard project={{ ...project, runs: [...project.runs.slice(0, 2), { ...project.runs[2], generatedPrompt: "Persistente" }] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar prompt" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo copiar; inténtalo nuevamente");
    expect(screen.getByText("Persistente")).toBeInTheDocument();
    const copyButton = screen.getByRole("button", { name: "Copiar prompt" });
    expect(copyButton).toBeEnabled();

    fireEvent.click(copyButton);
    expect(await screen.findByRole("status")).toHaveTextContent("Copiado al portapapeles.");
    expect(screen.queryByText("No se pudo copiar; inténtalo nuevamente")).not.toBeInTheDocument();
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2);
  });

  test("no permite completar hasta que exista un prompt y un .md", () => {
    const { rerender } = render(<WorkflowWizard project={project} />);
    expect(screen.getByRole("button", { name: "Completar etapa" })).toBeDisabled();
    // con prompt pero sin resultContent: sigue deshabilitado
    rerender(<WorkflowWizard project={{ ...project, runs: [...project.runs.slice(0, 2), { ...project.runs[2], generatedPrompt: "Listo" }] }} />);
    expect(screen.getByRole("button", { name: "Completar etapa" })).toBeDisabled();
    // con prompt y resultContent: se habilita
    rerender(<WorkflowWizard project={{ ...project, runs: [...project.runs.slice(0, 2), { ...project.runs[2], generatedPrompt: "Listo", resultContent: "# Resultado" }] }} />);
    expect(screen.getByRole("button", { name: "Completar etapa" })).toBeEnabled();
  });

  test.each([5, 6] as const)("ofrece decisiones en la etapa %i y confirma visualmente los cambios", async (step) => {
    const reviewProject = { ...project, currentStep: step, runs: [{ ...project.runs[2], step, generatedPrompt: "Evaluar", resultContent: "# Resultado" }] } as WorkflowProjectView;
    render(<WorkflowWizard project={reviewProject} />);
    expect(screen.getByRole("button", { name: "Aprobado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Requiere cambios" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Completar etapa" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Requiere cambios" }));
    expect(actions.decide).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Iniciar un ciclo nuevo" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cambios" }));
    await waitFor(() => expect(actions.decide).toHaveBeenCalledWith(expect.objectContaining({ decision: "request_changes" })));
  });

  test("mantiene el modal operativo y anuncia dentro el fallo al solicitar cambios", async () => {
    actions.decide.mockResolvedValueOnce({ ok: false, message: "No fue posible iniciar el ciclo" });
    const reviewProject = { ...project, currentStep: 5, runs: [{ ...project.runs[2], step: 5, generatedPrompt: "Evaluar", resultContent: "# Resultado" }] } as WorkflowProjectView;
    render(<WorkflowWizard project={reviewProject} />);
    fireEvent.click(screen.getByRole("button", { name: "Requiere cambios" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cambios" }));

    const dialog = await screen.findByRole("dialog", { name: "Iniciar un ciclo nuevo" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("No fue posible iniciar el ciclo");
    expect(within(dialog).getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Confirmar cambios" })).toBeEnabled());
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeEnabled();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  test("confina el foco dentro del modal de cambios", () => {
    const reviewProject = { ...project, currentStep: 5, runs: [{ ...project.runs[2], step: 5, generatedPrompt: "Evaluar", resultContent: "# Resultado" }] } as WorkflowProjectView;
    render(<WorkflowWizard project={reviewProject} />);
    fireEvent.click(screen.getByRole("button", { name: "Requiere cambios" }));
    const dialog = screen.getByRole("dialog", { name: "Iniciar un ciclo nuevo" });
    const confirm = within(dialog).getByRole("button", { name: "Confirmar cambios" });
    const cancel = within(dialog).getByRole("button", { name: "Cancelar" });

    cancel.focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(confirm).toHaveFocus();
    confirm.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(cancel).toHaveFocus();
  });

  test("vuelve al trigger al cerrar con Escape y vuelve inerte el fondo", () => {
    const reviewProject = { ...project, currentStep: 5, runs: [{ ...project.runs[2], step: 5, generatedPrompt: "Evaluar", resultContent: "# Resultado" }] } as WorkflowProjectView;
    render(<WorkflowWizard project={reviewProject} />);
    const trigger = screen.getByRole("button", { name: "Requiere cambios" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Iniciar un ciclo nuevo" });
    expect(screen.getByTestId("workflow-background")).toHaveAttribute("inert");

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("muestra vista previa en tiempo real al escribir una variable", () => {
    render(<WorkflowWizard project={project} />);
    fireEvent.change(screen.getByLabelText("FEATURE"), { target: { value: "offline" } });
    expect(screen.getByRole("heading", { name: "Vista previa" })).toBeInTheDocument();
    expect(screen.getByText(/offline para \[AUDIENCE\]/)).toBeInTheDocument();
  });

  test("oculta la vista previa cuando ambas variables están vacías al inicio", () => {
    render(<WorkflowWizard project={project} />);
    expect(screen.queryByRole("heading", { name: "Vista previa" })).not.toBeInTheDocument();
    expect(screen.getByText("El snapshot generado aparecerá aquí.")).toBeInTheDocument();
  });

  test("cambia el título a 'Snapshot del prompt' después de generar", async () => {
    render(<WorkflowWizard project={project} />);
    fireEvent.change(screen.getByLabelText("FEATURE"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("AUDIENCE"), { target: { value: "equipos" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar y copiar" }));
    expect(await screen.findByRole("heading", { name: "Snapshot del prompt" })).toBeInTheDocument();
  });
});
