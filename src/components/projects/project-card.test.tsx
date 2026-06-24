import { render, screen } from "@testing-library/react";

import type { ProjectSummary } from "@/lib/data/projects";
import { ProjectCard } from "./project-card";

const baseProject: ProjectSummary = {
  id: "665f4e4e8a77a64e3b6d1200",
  name: "Agente móvil",
  description: "Coordina la entrega del agente.",
  currentStep: 4,
  cycle: 3,
  status: "active",
  initialStep: 4,
  updatedAt: new Date("2026-06-23T12:00:00.000Z"),
};

describe("ProjectCard", () => {
  test("presenta el próximo prompt y los nueve pulsos de un proyecto activo", () => {
    render(<ProjectCard project={baseProject} />);

    expect(screen.getByText("Próximo prompt · IMP")).toBeInTheDocument();
    expect(screen.getByText("Ciclo 03")).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Progreso: etapa 4 de 8" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByText(/Actualizado 23 jun 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir proyecto Agente móvil" })).toHaveTextContent("Abrir flujo");
  });

  test("presenta como omitidos los pulsos anteriores a la etapa inicial", () => {
    render(<ProjectCard project={{ ...baseProject, cycle: 1 }} />);

    expect(screen.getByText("Requerimiento: omitida")).toBeInTheDocument();
    expect(screen.getByText("Análisis técnico: omitida")).toBeInTheDocument();
    expect(screen.getByText("Diseño UX/UI: omitida")).toBeInTheDocument();
    expect(screen.getByText("Implementación: actual")).toBeInTheDocument();
  });

  test("en un ciclo nuevo prioriza la etapa actual sobre la omisión inicial", () => {
    render(<ProjectCard project={{ ...baseProject, currentStep: 1, cycle: 2 }} />);

    expect(screen.getByText("Requerimiento: actual")).toBeInTheDocument();
    expect(screen.queryByText("Requerimiento: omitida")).not.toBeInTheDocument();
  });

  test("reinicia el progreso visual completo en ciclos posteriores", () => {
    render(<ProjectCard project={{ ...baseProject, currentStep: 2, cycle: 2 }} />);

    expect(screen.getByText("Requerimiento: completada")).toBeInTheDocument();
    expect(screen.getByText("Análisis técnico: actual")).toBeInTheDocument();
    expect(screen.getByText("Diseño UX/UI: pendiente")).toBeInTheDocument();
    expect(screen.queryByText(/: omitida$/)).not.toBeInTheDocument();
  });

  test("presenta el cierre sin sugerir un próximo prompt en un proyecto completado", () => {
    render(
      <ProjectCard
        project={{ ...baseProject, currentStep: 8, cycle: 4, status: "completed" }}
      />,
    );

    expect(screen.getByText("Flujo completado · PRD")).toBeInTheDocument();
    expect(screen.getByText("Checklist finalizado")).toBeInTheDocument();
    expect(screen.queryByText(/Próximo prompt/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(9);
    expect(screen.getByRole("link", { name: "Abrir proyecto Agente móvil" })).toHaveTextContent("Ver historial");
    expect(screen.queryByText("Abrir flujo")).not.toBeInTheDocument();
  });
});
