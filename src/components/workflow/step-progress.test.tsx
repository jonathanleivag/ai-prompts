import { render, screen, within } from "@testing-library/react";

import { StepProgress } from "./step-progress";

test("solo usa runs del ciclo actual al pintar el progreso", () => {
  render(
    <StepProgress
      currentStep={1}
      currentCycle={2}
      projectStatus="active"
      runs={[
        { step: 1, cycle: 1, status: "completed" },
        { step: 2, cycle: 1, status: "completed" },
        { step: 3, cycle: 1, status: "completed" },
        { step: 4, cycle: 1, status: "completed" },
        { step: 5, cycle: 1, status: "changes_requested" },
        { step: 1, cycle: 2, status: "active" },
      ]}
    />,
  );

  const progress = screen.getByRole("list", { name: "Ruta del workflow" });
  expect(within(progress).getByText("Requerimiento · Actual")).toBeInTheDocument();
  expect(within(progress).getByText("Análisis técnico · Pendiente")).toBeInTheDocument();
  expect(within(progress).getByText("Code review · Pendiente")).toBeInTheDocument();
});
