import { beforeEach, describe, expect, test, vi } from "vitest";

const repository = vi.hoisted(() => ({
  createProject: vi.fn(),
  generateStepPrompt: vi.fn(),
  completeStep: vi.fn(),
  decideReview: vi.fn(),
}));
const next = vi.hoisted(() => ({ revalidatePath: vi.fn(), redirect: vi.fn() }));

vi.mock("@/lib/data/projects", () => ({
  ...repository,
  WorkflowConflictError: class WorkflowConflictError extends Error {
    constructor() {
      super("El workflow cambió; recarga el proyecto e inténtalo de nuevo");
    }
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: next.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: next.redirect }));

import {
  completeStepAction,
  createProjectAction,
  generatePromptAction,
  reviewDecisionAction,
} from "./projects";
import { WorkflowConflictError } from "@/lib/data/projects";

const id = "507f1f77bcf86cd799439011";
const formData = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("createProjectAction", () => {
  test("rejects an empty name with a field error", async () => {
    const result = await createProjectAction(
      formData({ name: "  ", description: "desc", initialStep: "1" }),
    );

    expect(result).toMatchObject({ ok: false, fieldErrors: { name: expect.any(Array) } });
    expect(repository.createProject).not.toHaveBeenCalled();
  });

  test("rejects a step outside 1-8", async () => {
    const result = await createProjectAction(
      formData({ name: "Proyecto", description: "desc", initialStep: "9" }),
    );

    expect(result).toMatchObject({ ok: false, fieldErrors: { initialStep: expect.any(Array) } });
  });

  test("rejects a boolean initial step", async () => {
    repository.createProject.mockResolvedValue({ id, currentStep: 1, cycle: 1, status: "active" });
    const hostileInput = new Map<string, unknown>([
      ["name", "Proyecto"],
      ["description", "desc"],
      ["initialStep", true],
    ]) as unknown as FormData;

    const result = await createProjectAction(hostileInput);

    expect(result).toMatchObject({ ok: false, fieldErrors: { initialStep: expect.any(Array) } });
    expect(repository.createProject).not.toHaveBeenCalled();
  });

  test("revalidates and redirects only after a successful creation", async () => {
    repository.createProject.mockResolvedValue({ id, currentStep: 1, cycle: 1, status: "active" });

    const result = await createProjectAction(
      formData({ name: " Proyecto ", description: " desc ", initialStep: "1" }),
    );

    expect(result).toEqual({ ok: true, data: { id, currentStep: 1, cycle: 1, status: "active" } });
    expect(repository.createProject).toHaveBeenCalledWith({ name: "Proyecto", description: "desc", initialStep: 1 });
    expect(next.revalidatePath).toHaveBeenCalledWith("/projects");
    expect(next.redirect).toHaveBeenCalledWith(`/projects/${id}`);
  });

  test("lets Next redirect control flow escape after a successful creation", async () => {
    const redirectSignal = new Error("NEXT_REDIRECT");
    repository.createProject.mockResolvedValue({ id, currentStep: 1, cycle: 1, status: "active" });
    next.redirect.mockImplementationOnce(() => {
      throw redirectSignal;
    });

    await expect(
      createProjectAction(formData({ name: "Proyecto", description: "", initialStep: "1" })),
    ).rejects.toBe(redirectSignal);
  });
});

test("generatePromptAction rejects variables that do not match the template", async () => {
  repository.generateStepPrompt.mockRejectedValue(new Error("Faltan valores: AUDIENCE. Valores desconocidos: EXTRA"));

  const result = await generatePromptAction({
    projectId: id,
    currentStep: 2,
    cycle: 1,
    variables: { EXTRA: "valor" },
  });

  expect(result).toMatchObject({ ok: false, fieldErrors: { variables: expect.any(Array) } });
});

test("generatePromptAction rejects boolean workflow numbers", async () => {
  repository.generateStepPrompt.mockResolvedValue({ prompt: "ok" });

  const result = await generatePromptAction({
    projectId: id,
    currentStep: true,
    cycle: true,
    variables: {},
  });

  expect(result).toMatchObject({
    ok: false,
    fieldErrors: { currentStep: expect.any(Array), cycle: expect.any(Array) },
  });
  expect(repository.generateStepPrompt).not.toHaveBeenCalled();
});

test("reviewDecisionAction rejects an unknown decision", async () => {
  const result = await reviewDecisionAction({
    projectId: id,
    currentStep: 5,
    cycle: 1,
    decision: "skip" as "approve",
  });

  expect(result).toMatchObject({ ok: false, fieldErrors: { decision: expect.any(Array) } });
  expect(repository.decideReview).not.toHaveBeenCalled();
});

test("completeStepAction translates WorkflowConflictError into a recoverable result", async () => {
  repository.completeStep.mockRejectedValue(new WorkflowConflictError());

  const result = await completeStepAction({ projectId: id, currentStep: 3, cycle: 2 });

  expect(result).toEqual({
    ok: false,
    message: "El workflow cambió; recarga el proyecto e inténtalo de nuevo",
  });
});

test("completeStepAction rejects boolean workflow numbers", async () => {
  repository.completeStep.mockResolvedValue({ id, currentStep: 2, cycle: 1, status: "active" });

  const result = await completeStepAction({ projectId: id, currentStep: true, cycle: true });

  expect(result).toMatchObject({
    ok: false,
    fieldErrors: { currentStep: expect.any(Array), cycle: expect.any(Array) },
  });
  expect(repository.completeStep).not.toHaveBeenCalled();
});

test("reviewDecisionAction rejects a boolean cycle", async () => {
  repository.decideReview.mockResolvedValue({ id, currentStep: 6, cycle: 1, status: "active" });

  const result = await reviewDecisionAction({
    projectId: id,
    currentStep: 5,
    cycle: true,
    decision: "approve",
  });

  expect(result).toMatchObject({ ok: false, fieldErrors: { cycle: expect.any(Array) } });
  expect(repository.decideReview).not.toHaveBeenCalled();
});

test("workflow actions reject invalid project ids", async () => {
  const result = await completeStepAction({ projectId: "bad-id", currentStep: 1, cycle: 1 });

  expect(result).toMatchObject({ ok: false, fieldErrors: { projectId: expect.any(Array) } });
});
