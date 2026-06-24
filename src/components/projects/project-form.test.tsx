import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/app/actions/projects", () => ({ createProjectAction: vi.fn() }));

import { ProjectForm } from "./project-form";

describe("ProjectForm", () => {
  test("expone etiquetas accesibles y selecciona la etapa 1 por defecto", () => {
    render(<ProjectForm createAction={vi.fn()} />);

    expect(screen.getByLabelText("Nombre del proyecto")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
    expect(screen.getByLabelText("Etapa inicial")).toHaveValue("1");
  });

  test("ofrece las nueve etapas reales del workflow", () => {
    render(<ProjectForm createAction={vi.fn()} />);

    expect(screen.getAllByRole("option")).toHaveLength(9);
    expect(screen.getByRole("option", { name: /0 · Contexto de Workspace/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /8 · Checklist de producción/ })).toBeInTheDocument();
  });

  test("muestra errores y conserva los valores enviados", async () => {
    const createAction = vi.fn().mockResolvedValue({
      ok: false,
      message: "Revisa los campos indicados",
      fieldErrors: { name: ["El nombre es obligatorio"] },
    });
    render(<ProjectForm createAction={createAction} />);

    fireEvent.change(screen.getByLabelText("Nombre del proyecto"), {
      target: { value: "  " },
    });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Coordina la entrega del agente" },
    });
    fireEvent.change(screen.getByLabelText("Etapa inicial"), {
      target: { value: "4" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Crear proyecto" }).closest("form")!);

    expect(await screen.findByText("El nombre es obligatorio")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toHaveValue("Coordina la entrega del agente");
    expect(screen.getByLabelText("Etapa inicial")).toHaveValue("4");
  });

  test("bloquea el envío mientras crea el proyecto", async () => {
    let resolveAction!: (value: { ok: true; data: unknown }) => void;
    const createAction = vi.fn(
      () => new Promise<{ ok: true; data: unknown }>((resolve) => (resolveAction = resolve)),
    );
    render(<ProjectForm createAction={createAction} />);

    fireEvent.change(screen.getByLabelText("Nombre del proyecto"), {
      target: { value: "Entrega móvil" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Crear proyecto" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Creando proyecto…" })).toBeDisabled();
    });

    resolveAction({ ok: true, data: {} });
  });
});
