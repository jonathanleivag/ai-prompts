import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { TemplateEditor, type TemplateEditorView } from "./template-editor";

const actions = vi.hoisted(() => ({ save: vi.fn(), restore: vi.fn() }));
const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("@/app/actions/templates", () => ({
  saveTemplateAction: actions.save,
  restoreTemplateAction: actions.restore,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: navigation.refresh }) }));

const template: TemplateEditorView = {
  id: "507f1f77bcf86cd799439011",
  step: 4,
  name: "Implementación",
  recommendedAgent: "codex",
  currentVersion: 3,
  currentContent: "Implementa {{FEATURE}} para {{AUDIENCE}}",
  variables: ["FEATURE", "AUDIENCE"],
  updatedAt: "2026-06-23T12:00:00.000Z",
  versions: [
    { id: "v2", version: 2, content: "Implementa {{FEATURE}}", variables: ["FEATURE"], createdAt: "2026-06-22T12:00:00.000Z" },
    { id: "v3", version: 3, content: "Implementa {{FEATURE}} para {{AUDIENCE}}", variables: ["FEATURE", "AUDIENCE"], createdAt: "2026-06-23T12:00:00.000Z" },
    { id: "v1", version: 1, content: "Implementa el alcance", variables: [], createdAt: "2026-06-21T12:00:00.000Z" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  actions.save.mockResolvedValue({ ok: true, data: { version: 4 } });
  actions.restore.mockResolvedValue({ ok: true, data: { version: 4 } });
});

describe("TemplateEditor", () => {
  test("muestra el contenido actual, sus variables y el preview", () => {
    render(<TemplateEditor template={template} />);

    expect(screen.getByLabelText("Contenido de la plantilla")).toHaveValue(template.currentContent);
    expect(screen.getByRole("list", { name: "Variables detectadas" })).toHaveTextContent("FEATUREAUDIENCE");
    expect(screen.getByTestId("template-preview")).toHaveTextContent(template.currentContent);
  });

  test("detecta variables en vivo, sin duplicados", () => {
    render(<TemplateEditor template={template} />);
    fireEvent.change(screen.getByLabelText("Contenido de la plantilla"), {
      target: { value: "Hola {{NAME}}, revisa {{PROJECT}} con {{NAME}}" },
    });

    const variables = screen.getByRole("list", { name: "Variables detectadas" });
    expect(within(variables).getAllByRole("listitem")).toHaveLength(2);
    expect(variables).toHaveTextContent("NAMEPROJECT");
    expect(screen.getByTestId("template-preview")).toHaveTextContent("Hola {{NAME}}, revisa {{PROJECT}} con {{NAME}}");
  });

  test("anuncia marcadores malformados y bloquea guardar", () => {
    render(<TemplateEditor template={template} />);
    fireEvent.change(screen.getByLabelText("Contenido de la plantilla"), { target: { value: "Hola {{variable}}" } });

    expect(screen.getByRole("alert")).toHaveTextContent("Marcador inválido");
    expect(screen.getByLabelText("Contenido de la plantilla")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Guardar nueva versión" })).toBeDisabled();
  });

  test("mantiene guardar deshabilitado sin cambios y durante una petición", async () => {
    let resolveSave!: (value: unknown) => void;
    actions.save.mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    render(<TemplateEditor template={template} />);
    const save = screen.getByRole("button", { name: "Guardar nueva versión" });

    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Contenido de la plantilla"), { target: { value: "Implementa {{FEATURE}} con pruebas" } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();

    resolveSave({ ok: true, data: { version: 4 } });
    expect(await screen.findByRole("status")).toHaveTextContent("Versión 4 guardada");
  });

  test("envía el contenido y comunica la versión incrementada", async () => {
    render(<TemplateEditor template={template} />);
    fireEvent.change(screen.getByLabelText("Contenido de la plantilla"), { target: { value: "Implementa {{FEATURE}} con pruebas" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar nueva versión" }));

    await waitFor(() => expect(actions.save).toHaveBeenCalled());
    const data = actions.save.mock.calls[0][0] as FormData;
    expect(Object.fromEntries(data)).toEqual({ templateId: template.id, content: "Implementa {{FEATURE}} con pruebas" });
    expect(await screen.findByRole("status")).toHaveTextContent("Versión 4 guardada");
    expect(navigation.refresh).toHaveBeenCalled();
  });

  test("ordena el historial de mayor a menor versión", () => {
    render(<TemplateEditor template={template} />);
    const history = screen.getByRole("list", { name: "Historial de versiones" });
    expect(within(history).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Versión 3", "Versión 2", "Versión 1",
    ]);
  });

  test("explica que restaurar crea una versión nueva y permite cancelar", () => {
    render(<TemplateEditor template={template} />);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar versión 2" }));

    const dialog = screen.getByRole("dialog", { name: "Restaurar versión 2" });
    expect(dialog).toHaveTextContent("creará una versión nueva");
    expect(actions.restore).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("confirma la restauración y anuncia la nueva versión", async () => {
    render(<TemplateEditor template={template} />);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar versión 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear versión nueva" }));

    await waitFor(() => expect(actions.restore).toHaveBeenCalledWith({ templateId: template.id, version: 2 }));
    expect(await screen.findByRole("status")).toHaveTextContent("Versión 4 creada desde la versión 2");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(navigation.refresh).toHaveBeenCalled();
  });

  test("mantiene el modal accesible y recuperable cuando falla restaurar", async () => {
    actions.restore.mockResolvedValueOnce({ ok: false, message: "No fue posible restaurar" });
    render(<TemplateEditor template={template} />);
    fireEvent.click(screen.getByRole("button", { name: "Restaurar versión 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear versión nueva" }));

    const dialog = await screen.findByRole("dialog", { name: "Restaurar versión 2" });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("No fue posible restaurar");
    expect(within(dialog).getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Crear versión nueva" })).toBeEnabled());
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeEnabled();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
});
