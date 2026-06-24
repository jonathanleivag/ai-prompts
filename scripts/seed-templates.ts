import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ObjectId, type ClientSession } from "mongodb";

import { extractVariables } from "../src/lib/domain/template";
import type { Step } from "../src/lib/domain/types";
import type {
  RecommendedAgent,
  TemplateDocument,
  TemplateVersionDocument,
} from "../src/lib/db/models";

const TEMPLATE_FILENAME = /^(0[1-8])-[^/]+\.md$/;

export interface SeedTemplate {
  step: Step;
  filename: string;
  name: string;
  recommendedAgent: RecommendedAgent;
  content: string;
  variables: string[];
}

export interface SeedTransactionSession {
  withTransaction<T>(callback: () => Promise<T>): Promise<T>;
}

export interface SeedTransactionClient {
  withSession<T>(
    callback: (session: SeedTransactionSession) => Promise<T>,
  ): Promise<T>;
}

export interface SeedPersistence {
  findTemplate(
    step: Step,
    session: SeedTransactionSession,
  ): Promise<TemplateDocument | null>;
  insertTemplate(
    document: TemplateDocument,
    session: SeedTransactionSession,
  ): Promise<void>;
  upsertVersionOne(
    document: TemplateVersionDocument,
    session: SeedTransactionSession,
  ): Promise<void>;
}

export interface SeedTemplatesCliDependencies {
  seedTemplates(rootDir: string): Promise<void>;
  closeMongoClient(): Promise<void>;
}

export async function readSeedTemplates(rootDir: string): Promise<SeedTemplate[]> {
  const filenames = (await readdir(rootDir))
    .filter((filename) => TEMPLATE_FILENAME.test(filename))
    .sort();

  const steps = new Map<number, string[]>();
  for (const filename of filenames) {
    const step = Number.parseInt(filename.slice(0, 2), 10);
    const stepFiles = steps.get(step) ?? [];
    stepFiles.push(filename);
    steps.set(step, stepFiles);
  }

  for (const [step, stepFiles] of steps) {
    if (stepFiles.length > 1) {
      throw new Error(`Paso duplicado ${step}: ${stepFiles.join(", ")}`);
    }
  }

  return Promise.all(
    filenames.map(async (filename) => {
      const content = await readFile(path.join(rootDir, filename), "utf8");
      const name = content.match(/^# (.+)$/m)?.[1]?.trim();
      if (!name) {
        throw new Error(`La plantilla ${filename} no tiene un encabezado H1`);
      }

      return {
        step: Number.parseInt(filename.slice(0, 2), 10) as Step,
        filename,
        name,
        recommendedAgent: recommendedAgent(filename),
        content,
        variables: extractVariables(content),
      };
    }),
  );
}

export async function seedTemplates(rootDir: string): Promise<void> {
  const seedTemplates = await readSeedTemplates(rootDir);
  if (seedTemplates.length !== 8) {
    throw new Error(
      `Se esperaban 8 plantillas y se encontraron ${seedTemplates.length}`,
    );
  }

  const [{ collections }, { ensureIndexes }, { getMongoClient }] =
    await Promise.all([
      import("../src/lib/db/collections"),
      import("../src/lib/db/indexes"),
      import("../src/lib/db/client"),
    ]);

  await ensureIndexes();
  const { templates, templateVersions } = await collections();
  const client = await getMongoClient();
  const persistence: SeedPersistence = {
    async findTemplate(step, session) {
      return templates.findOne(
        { step },
        { session: session as ClientSession },
      );
    },
    async insertTemplate(document, session) {
      await templates.insertOne(document, {
        session: session as ClientSession,
      });
    },
    async upsertVersionOne(document, session) {
      await templateVersions.updateOne(
        { templateId: document.templateId, version: 1 },
        { $setOnInsert: document },
        { upsert: true, session: session as ClientSession },
      );
    },
  };

  await persistSeedTemplates(seedTemplates, client, persistence);

  console.log(`${seedTemplates.length} plantillas disponibles`);
}

export async function persistSeedTemplates(
  seedTemplates: readonly SeedTemplate[],
  client: SeedTransactionClient,
  persistence: SeedPersistence,
): Promise<void> {
  for (const seedTemplate of seedTemplates) {
    await client.withSession(async (session) => {
      await session.withTransaction(async () => {
        const existingTemplate = await persistence.findTemplate(
          seedTemplate.step,
          session,
        );
        const templateId = existingTemplate?._id ?? new ObjectId();
        const now = new Date();

        if (!existingTemplate) {
          await persistence.insertTemplate(
            {
              _id: templateId,
              step: seedTemplate.step,
              name: seedTemplate.name,
              recommendedAgent: seedTemplate.recommendedAgent,
              currentVersion: 1,
              currentContent: seedTemplate.content,
              variables: seedTemplate.variables,
              updatedAt: now,
            },
            session,
          );
        }

        await persistence.upsertVersionOne(
          {
            _id: new ObjectId(),
            templateId,
            version: 1,
            content: seedTemplate.content,
            variables: seedTemplate.variables,
            createdAt: now,
          },
          session,
        );
      });
    });
  }
}

export async function runSeedTemplatesCli(
  rootDir: string,
  dependencies?: SeedTemplatesCliDependencies,
): Promise<void> {
  const cliDependencies = dependencies ?? {
    seedTemplates,
    async closeMongoClient() {
      const { closeMongoClient } = await import("../src/lib/db/client");
      await closeMongoClient();
    },
  };

  try {
    await cliDependencies.seedTemplates(rootDir);
  } finally {
    await cliDependencies.closeMongoClient();
  }
}

function recommendedAgent(
  filename: string,
): SeedTemplate["recommendedAgent"] {
  for (const agent of ["codex", "claude", "antigravity"] as const) {
    if (filename.includes(`-${agent}.md`)) return agent;
  }
  return "manual";
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
if (invokedFile === fileURLToPath(import.meta.url)) {
  runSeedTemplatesCli(process.cwd()).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
