import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { PromptPreview } from "./prompt-preview";

describe("PromptPreview", () => {
  test("shows empty state when neither prompt nor preview is provided", () => {
    render(<PromptPreview copied={false} onCopy={vi.fn()} />);
    expect(screen.getByText("El snapshot generado aparecerá aquí.")).toBeInTheDocument();
  });

  test("shows live preview with 'Vista previa' title when only preview is provided", () => {
    render(<PromptPreview preview="Hola [FEATURE]" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Vista previa" })).toBeInTheDocument();
    expect(screen.getByText("Hola [FEATURE]")).toBeInTheDocument();
  });

  test("copy button is disabled in preview-only mode", () => {
    render(<PromptPreview preview="Hola [FEATURE]" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Copiar prompt" })).toBeDisabled();
  });

  test("shows saved snapshot with 'Snapshot del prompt' title when prompt is provided", () => {
    render(<PromptPreview prompt="Hola mundo" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Snapshot del prompt" })).toBeInTheDocument();
    expect(screen.getByText("Hola mundo")).toBeInTheDocument();
  });

  test("copy button is enabled when saved prompt exists", () => {
    render(<PromptPreview prompt="Hola mundo" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Copiar prompt" })).toBeEnabled();
  });

  test("saved prompt takes precedence over preview when both are provided", () => {
    render(<PromptPreview prompt="Guardado" preview="En vivo" copied={false} onCopy={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Snapshot del prompt" })).toBeInTheDocument();
    expect(screen.getByText("Guardado")).toBeInTheDocument();
    expect(screen.queryByText("En vivo")).not.toBeInTheDocument();
  });

  test("shows 'Copiado al portapapeles.' status when copied is true", () => {
    render(<PromptPreview prompt="Hola" copied={true} onCopy={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Copiado al portapapeles.");
  });

  test("shows copy error alert when copyError is provided", () => {
    render(<PromptPreview prompt="Hola" copied={false} onCopy={vi.fn()} copyError="Error al copiar" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Error al copiar");
  });
});
