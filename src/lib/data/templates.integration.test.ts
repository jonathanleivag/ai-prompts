import { MongoClient, ObjectId } from "mongodb";
import { beforeAll, afterAll, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { AppCollections } from "@/lib/db/collections";
import type { TemplateDocument } from "@/lib/db/models";

import { createTemplateRepository } from "./templates";

const uri = process.env.MONGODB_TEST_URI?.trim();
const describeWithMongo = uri ? describe : describe.skip;

if (!uri) {
  console.warn(
    "[integration] MONGODB_TEST_URI no está configurada; se omiten las pruebas transaccionales de plantillas contra Atlas.",
  );
}

test("restore appends a version through the transaction path", async () => {
  const templateId = new ObjectId();
  const historical = {
    _id: new ObjectId(),
    templateId,
    version: 1,
    content: "original {{NAME}}",
    variables: ["NAME"],
    createdAt: new Date(),
  };
  const template = {
    _id: templateId,
    step: 1 as const,
    name: "Discovery",
    recommendedAgent: "codex" as const,
    currentVersion: 2,
    currentContent: "updated {{TEAM}}",
    variables: ["TEAM"],
    updatedAt: new Date(),
  };
  const inserted: unknown[] = [];
  const withTransaction = vi.fn(async (callback: () => Promise<unknown>) =>
    callback(),
  );
  const withSession = vi.fn(
    async (callback: (session: { withTransaction: typeof withTransaction }) => Promise<unknown>) =>
      callback({ withTransaction }),
  );
  const repository = createTemplateRepository({
    client: { withSession } as never,
    collections: {
      templates: {
        findOne: vi.fn().mockResolvedValue(template),
        updateOne: vi.fn().mockResolvedValue({ matchedCount: 1 }),
      },
      templateVersions: {
        findOne: vi.fn().mockResolvedValue(historical),
        insertOne: vi.fn(async (document) => {
          inserted.push(document);
          return { acknowledged: true };
        }),
      },
    } as never,
  });

  const restored = await repository.restoreTemplateVersion({
    templateId: templateId.toHexString(),
    version: 1,
  });

  expect(restored).toMatchObject({ version: 3, content: historical.content });
  expect(inserted).toEqual([
    expect.objectContaining({
      templateId,
      version: 3,
      content: historical.content,
      variables: historical.variables,
    }),
  ]);
  expect(historical.version).toBe(1);
  expect(withTransaction).toHaveBeenCalledOnce();
});

describeWithMongo("template repository (MongoDB transaction integration)", () => {
  let client: MongoClient;
  let collections: AppCollections;
  let template: TemplateDocument;

  beforeAll(async () => {
    client = await new MongoClient(uri!).connect();
    const db = client.db(`tpl_${new ObjectId().toHexString()}`);
    collections = {
      projects: db.collection("projects"),
      stepRuns: db.collection("step_runs"),
      templates: db.collection("templates"),
      templateVersions: db.collection("template_versions"),
      events: db.collection("workflow_events"),
    } as AppCollections;
    template = {
      _id: new ObjectId(),
      step: 1,
      name: "Discovery",
      recommendedAgent: "codex",
      currentVersion: 1,
      currentContent: "original {{NAME}}",
      variables: ["NAME"],
      updatedAt: new Date(),
    };
    await collections.templates.insertOne(template);
    await collections.templateVersions.insertOne({
      _id: new ObjectId(),
      templateId: template._id,
      version: 1,
      content: template.currentContent,
      variables: template.variables,
      createdAt: new Date(),
    });
    await collections.templateVersions.createIndex(
      { templateId: 1, version: 1 },
      { unique: true },
    );
  });

  afterAll(async () => {
    if (client) {
      await collections.templates.drop().catch(() => undefined);
      await collections.templateVersions.drop().catch(() => undefined);
      await client.close();
    }
  });

  test("saving and restoring append versions without mutating history", async () => {
    const repository = createTemplateRepository({ client, collections });

    const saved = await repository.saveTemplateVersion({
      templateId: template._id.toHexString(),
      content: "updated {{TEAM}}",
    });
    const restored = await repository.restoreTemplateVersion({
      templateId: template._id.toHexString(),
      version: 1,
    });
    const history = await collections.templateVersions
      .find({ templateId: template._id })
      .sort({ version: 1 })
      .toArray();

    expect(saved.version).toBe(2);
    expect(restored.version).toBe(3);
    expect(history.map(({ version, content }) => ({ version, content }))).toEqual([
      { version: 1, content: "original {{NAME}}" },
      { version: 2, content: "updated {{TEAM}}" },
      { version: 3, content: "original {{NAME}}" },
    ]);
  });
});
