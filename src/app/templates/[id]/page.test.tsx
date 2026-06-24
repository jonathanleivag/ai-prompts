import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const data = vi.hoisted(() => ({ getTemplateDetail: vi.fn() }));
const navigation = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));
const editor = vi.hoisted(() => ({ props: vi.fn() }));

vi.mock("@/lib/data/templates", () => data);
vi.mock("next/navigation", () => ({ notFound: navigation.notFound }));
vi.mock("@/components/templates/template-editor", () => ({
  TemplateEditor: (props: unknown) => { editor.props(props); return <div>Editor serializado</div>; },
}));

import TemplatePage from "./page";

beforeEach(() => vi.clearAllMocks());

describe("TemplatePage", () => {
  test("convierte fechas de plantilla y versiones a props serializables", async () => {
    data.getTemplateDetail.mockResolvedValueOnce({
      id: "507f1f77bcf86cd799439011", step: 1, name: "Requerimiento", recommendedAgent: "claude",
      currentVersion: 2, currentContent: "Define {{GOAL}}", variables: ["GOAL"], updatedAt: new Date("2026-06-23T12:00:00Z"),
      versions: [{ id: "v2", version: 2, content: "Define {{GOAL}}", variables: ["GOAL"], createdAt: new Date("2026-06-22T12:00:00Z") }],
    });

    render(await TemplatePage({ params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }) }));
    expect(screen.getByText("Editor serializado")).toBeInTheDocument();
    expect(editor.props).toHaveBeenCalledWith(expect.objectContaining({ template: expect.objectContaining({
      updatedAt: "2026-06-23T12:00:00.000Z",
      versions: [expect.objectContaining({ createdAt: "2026-06-22T12:00:00.000Z" })],
    }) }));
  });

  test.each(["bad", "507f1f77bcf86cd799439012"])("responde notFound para id inválido o inexistente: %s", async (id) => {
    data.getTemplateDetail.mockResolvedValueOnce(null);
    await expect(TemplatePage({ params: Promise.resolve({ id }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigation.notFound).toHaveBeenCalled();
    if (id === "bad") expect(data.getTemplateDetail).not.toHaveBeenCalled();
  });
});
