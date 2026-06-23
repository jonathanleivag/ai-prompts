import { MongoClient, ObjectId } from "mongodb";
import { beforeAll, afterAll, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AppCollections } from "@/lib/db/collections";
import type { TemplateDocument } from "@/lib/db/models";

import {
  WorkflowConflictError,
  generatePromptFromRun,
  createProjectRepository,
} from "./projects";

const uri = process.env.MONGODB_TEST_URI?.trim();
const describeWithMongo = uri ? describe : describe.skip;

if (!uri) {
  console.warn(
    "[integration] MONGODB_TEST_URI no está configurada; se omiten las pruebas transaccionales de proyectos contra Atlas.",
  );
}

test("prompt generation uses the run snapshot, version, and exact variables", () => {
  const run = {
    _id: new ObjectId(),
    projectId: new ObjectId(),
    step: 2 as const,
    cycle: 1,
    status: "active" as const,
    templateId: new ObjectId(),
    templateVersion: 7,
    templateSnapshot: "Build {{FEATURE}} for {{TEAM}}",
    variables: {},
  };

  expect(
    generatePromptFromRun(run, { FEATURE: "search", TEAM: "platform" }),
  ).toEqual({
    prompt: "Build search for platform",
    templateVersion: 7,
    templateSnapshot: "Build {{FEATURE}} for {{TEAM}}",
    variables: { FEATURE: "search", TEAM: "platform" },
  });
});

test("a stale transition fails inside a transaction with WorkflowConflictError", async () => {
  const withTransaction = vi.fn(async (callback: () => Promise<unknown>) =>
    callback(),
  );
  const withSession = vi.fn(
    async (callback: (session: { withTransaction: typeof withTransaction }) => Promise<unknown>) =>
      callback({ withTransaction }),
  );
  const updateOne = vi.fn().mockResolvedValue({ matchedCount: 0 });
  const repository = createProjectRepository({
    client: { withSession } as never,
    collections: { projects: { updateOne } } as never,
  });

  await expect(
    repository.completeStep({
      projectId: new ObjectId().toHexString(),
      currentStep: 4,
      cycle: 1,
    }),
  ).rejects.toBeInstanceOf(WorkflowConflictError);
  expect(withSession).toHaveBeenCalledOnce();
  expect(withTransaction).toHaveBeenCalledOnce();
  expect(updateOne).toHaveBeenCalledWith(
    expect.objectContaining({ currentStep: 4, cycle: 1 }),
    expect.anything(),
    expect.anything(),
  );
});

describeWithMongo("project repository (MongoDB transaction integration)", () => {
  let client: MongoClient;
  let collections: AppCollections;

  beforeAll(async () => {
    client = await new MongoClient(uri!).connect();
    const db = client.db(`project_repository_${new ObjectId().toHexString()}`);
    collections = {
      projects: db.collection("projects"),
      stepRuns: db.collection("step_runs"),
      templates: db.collection("templates"),
      templateVersions: db.collection("template_versions"),
      events: db.collection("workflow_events"),
    } as AppCollections;
    await collections.stepRuns.createIndex(
      { projectId: 1, cycle: 1, step: 1 },
      { unique: true },
    );
  });

  afterAll(async () => {
    if (client) {
      await collections.projects.drop().catch(() => undefined);
      await collections.stepRuns.drop().catch(() => undefined);
      await collections.templates.drop().catch(() => undefined);
      await collections.templateVersions.drop().catch(() => undefined);
      await collections.events.drop().catch(() => undefined);
      await client.close();
    }
  });

  test("creates from step 4 with three skipped runs and one active run", async () => {
    await seedTemplates(collections);
    const repository = createProjectRepository({ client, collections });

    const project = await repository.createProject({
      name: "Checkout",
      description: "Implement checkout",
      initialStep: 4,
    });
    const runs = await collections.stepRuns
      .find({ projectId: new ObjectId(project.id) })
      .sort({ step: 1 })
      .toArray();

    expect(runs.map(({ step, status }) => ({ step, status }))).toEqual([
      { step: 1, status: "skipped" },
      { step: 2, status: "skipped" },
      { step: 3, status: "skipped" },
      { step: 4, status: "active" },
    ]);
  });

  test("stores the template snapshot and advances after completion", async () => {
    await seedTemplates(collections);
    const repository = createProjectRepository({ client, collections });
    const project = await repository.createProject({
      name: "Search",
      description: "Add search",
      initialStep: 4,
    });

    const generated = await repository.generateStepPrompt({
      projectId: project.id,
      currentStep: 4,
      cycle: 1,
      variables: { VALUE: "catalog" },
    });
    await collections.templates.updateOne(
      { step: 4 },
      { $set: { currentContent: "changed {{VALUE}}", currentVersion: 2 } },
    );
    const transition = await repository.completeStep({
      projectId: project.id,
      currentStep: 4,
      cycle: 1,
    });

    expect(generated.prompt).toBe("step 4 catalog");
    expect(generated.templateVersion).toBe(1);
    expect(generated.templateSnapshot).toBe("step 4 {{VALUE}}");
    expect(transition).toMatchObject({ currentStep: 5, cycle: 1 });
  });

  test("request_changes from review starts cycle 2 at step 1", async () => {
    await seedTemplates(collections);
    const repository = createProjectRepository({ client, collections });
    const project = await repository.createProject({
      name: "Review",
      description: "Review work",
      initialStep: 5,
    });

    const transition = await repository.decideReview({
      projectId: project.id,
      currentStep: 5,
      cycle: 1,
      decision: "request_changes",
    });

    expect(transition).toMatchObject({ currentStep: 1, cycle: 2 });
    await expect(
      repository.decideReview({
        projectId: project.id,
        currentStep: 5,
        cycle: 1,
        decision: "request_changes",
      }),
    ).rejects.toBeInstanceOf(WorkflowConflictError);
  });
});

async function seedTemplates(collections: AppCollections): Promise<void> {
  const existing = await collections.templates.countDocuments();
  if (existing > 0) return;
  await collections.templates.insertMany(
    Array.from({ length: 8 }, (_, index): TemplateDocument => ({
      _id: new ObjectId(),
      step: (index + 1) as TemplateDocument["step"],
      name: `Step ${index + 1}`,
      recommendedAgent: "codex",
      currentVersion: 1,
      currentContent: `step ${index + 1} {{VALUE}}`,
      variables: ["VALUE"],
      updatedAt: new Date(),
    })),
  );
}
