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
    { id: "1", step: 1, cycle: 1, status: "skipped", templateSnapshot: "Descubrir {{GOAL}}", variables: {} },
    { id: "2", step: 2, cycle: 1, status: "completed", templateSnapshot: "Definir {{SCOPE}}", variables: { SCOPE: "MVP" }, generatedPrompt: "Definir MVP" },
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
  test("muestra ocho etapas y distingue omitida, completada y actual", () => {
    render(<WorkflowWizard project={project} />);
    const progress = screen.getByRole("list", { name: "Ruta del workflow" });
    expect(within(progress).getAllByRole("listitem")).toHaveLength(8);
    expect(within(progress).getByText(/Requerimiento · Omitida/)).toBeInTheDocument();
    expect(within(progress).getByText(/Análisis técnico · Completada/)).toBeInTheDocument();
    expect(within(progress).getByText(/Implementación · Actual/)).toBeInTheDocument();
  });

  test("deriva los campos de variables de la plantilla activa", () => {
    render(<WorkflowWizard project={project} />);
    expect(screen.getByLabelText("FEATURE")).toBeInTheDocument();
    expect(screen.getByLabelText("AUDIENCE")).toBeInTheDocument();
  });

  test("genera y copia el snapshot exacto sin avanzar la etapa", async () => {
    render(<WorkflowWizard project={project} />);
    fireEvent.change(screen.getByLabelText("FEATURE"), { target: { value: "offline" } });
    fireEvent.change(screen.getByLabelText("AUDIENCE"), { target: { value: "equipos" } });
    fireEvent.click(screen.getByRole("button", { name: "Generar prompt" }));

    expect(await screen.findByText("Prompt exacto persistido")).toBeInTheDocument();
    expect(actions.generate).toHaveBeenCalledWith(expect.objectContaining({ currentStep: 4, cycle: 2 }));
    expect(actions.complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Copiar prompt" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Prompt exacto persistido"));
  });

  test("conserva el preview y permite reintentar cuando falla el portapapeles", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    render(<WorkflowWizard project={{ ...project, runs: [...project.runs.slice(0, 2), { ...project.runs[2], generatedPrompt: "Persistente" }] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar prompt" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo copiar; inténtalo nuevamente");
    expect(screen.getByText("Persistente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar prompt" })).toBeEnabled();
  });

  test("no permite completar hasta que exista un prompt", () => {
    const { rerender } = render(<WorkflowWizard project={project} />);
    expect(screen.getByRole("button", { name: "Completar etapa" })).toBeDisabled();
    rerender(<WorkflowWizard project={{ ...project, runs: [...project.runs.slice(0, 2), { ...project.runs[2], generatedPrompt: "Listo" }] }} />);
    expect(screen.getByRole("button", { name: "Completar etapa" })).toBeEnabled();
  });

  test.each([5, 6] as const)("ofrece decisiones en la etapa %i y confirma visualmente los cambios", async (step) => {
    const reviewProject = { ...project, currentStep: step, runs: [{ ...project.runs[2], step, generatedPrompt: "Evaluar" }] } as WorkflowProjectView;
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
});
