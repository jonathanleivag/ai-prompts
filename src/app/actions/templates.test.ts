import { beforeEach, describe, expect, test, vi } from "vitest";

const repository = vi.hoisted(() => ({
  saveTemplateVersion: vi.fn(),
  restoreTemplateVersion: vi.fn(),
}));
const next = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/data/templates", () => ({
  ...repository,
  TemplateConflictError: class TemplateConflictError extends Error {
    constructor() {
      super("La plantilla cambió; vuelve a intentarlo");
    }
  },
  TemplateNotFoundError: class TemplateNotFoundError extends Error {
    constructor() {
      super("Plantilla no encontrada");
    }
  },
  TemplateVersionNotFoundError: class TemplateVersionNotFoundError extends Error {
    constructor(version: number) {
      super(`No existe la versión ${version}`);
    }
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: next.revalidatePath }));
vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue({ user: { name: "jonathanleivag", login: "jonathanleivag" } }) }));

import { restoreTemplateAction, saveTemplateAction } from "./templates";
import { TemplateConflictError } from "@/lib/data/templates";

const id = "507f1f77bcf86cd799439011";
const formData = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("saveTemplateAction", () => {
  test("rejects content with an invalid marker", async () => {
    const result = await saveTemplateAction(
      formData({ templateId: id, content: "Hola {{invalid}}" }),
    );

    expect(result).toMatchObject({ ok: false, fieldErrors: { content: expect.any(Array) } });
    expect(repository.saveTemplateVersion).not.toHaveBeenCalled();
  });

  test("saves valid content and revalidates its template path", async () => {
    const saved = { templateId: id, version: 2, content: "Hola {{NAME}}", variables: ["NAME"] };
    repository.saveTemplateVersion.mockResolvedValue(saved);

    const result = await saveTemplateAction(
      formData({ templateId: id, content: "Hola {{NAME}}" }),
    );

    expect(result).toEqual({ ok: true, data: saved });
    expect(next.revalidatePath).toHaveBeenCalledWith(`/templates/${id}`);
  });

  test("limita el contenido a 200000 caracteres", async () => {
    const result = await saveTemplateAction(
      formData({ templateId: id, content: "x".repeat(200001) }),
    );

    expect(result).toMatchObject({ ok: false, fieldErrors: { content: expect.any(Array) } });
    expect(repository.saveTemplateVersion).not.toHaveBeenCalled();
  });
});

test("restoreTemplateAction rejects invalid ids and versions", async () => {
  const result = await restoreTemplateAction({ templateId: "bad", version: 0 });

  expect(result).toMatchObject({
    ok: false,
    fieldErrors: { templateId: expect.any(Array), version: expect.any(Array) },
  });
  expect(repository.restoreTemplateVersion).not.toHaveBeenCalled();
});

test("saveTemplateAction conserva un conflicto de dominio útil", async () => {
  repository.saveTemplateVersion.mockRejectedValue(new TemplateConflictError());

  const result = await saveTemplateAction(formData({ templateId: id, content: "Hola {{NAME}}" }));

  expect(result).toEqual({ ok: false, message: "La plantilla cambió; vuelve a intentarlo" });
});

test("restoreTemplateAction rejects a boolean version", async () => {
  repository.restoreTemplateVersion.mockResolvedValue({ templateId: id, version: 2 });

  const result = await restoreTemplateAction({ templateId: id, version: true });

  expect(result).toMatchObject({ ok: false, fieldErrors: { version: expect.any(Array) } });
  expect(repository.restoreTemplateVersion).not.toHaveBeenCalled();
});

test.each([
  ["object", {}],
  ["null", null],
])("restoreTemplateAction rejects an %s version", async (_, version) => {
  repository.restoreTemplateVersion.mockResolvedValue({ templateId: id, version: 2 });

  const result = await restoreTemplateAction({ templateId: id, version });

  expect(result).toMatchObject({ ok: false, fieldErrors: { version: expect.any(Array) } });
  expect(repository.restoreTemplateVersion).not.toHaveBeenCalled();
});
