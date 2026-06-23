import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ObjectId } from "mongodb";

import { extractVariables } from "../src/lib/domain/template";
import type { Step } from "../src/lib/domain/types";

const TEMPLATE_FILENAME = /^(0[1-8])-[^/]+\.md$/;

export interface SeedTemplate {
  step: Step;
  filename: string;
  name: string;
  recommendedAgent: "codex" | "claude" | "antigravity" | "manual";
  content: string;
  variables: string[];
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

  const [{ collections }, { ensureIndexes }] = await Promise.all([
    import("../src/lib/db/collections"),
    import("../src/lib/db/indexes"),
  ]);

  await ensureIndexes();
  const { templates, templateVersions } = await collections();

  for (const seedTemplate of seedTemplates) {
    const templateId = new ObjectId();
    const now = new Date();
    const result = await templates.updateOne(
      { step: seedTemplate.step },
      {
        $setOnInsert: {
          _id: templateId,
          step: seedTemplate.step,
          name: seedTemplate.name,
          recommendedAgent: seedTemplate.recommendedAgent,
          currentVersion: 1,
          currentContent: seedTemplate.content,
          variables: seedTemplate.variables,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    if (result.upsertedId) {
      await templateVersions.insertOne({
        _id: new ObjectId(),
        templateId,
        version: 1,
        content: seedTemplate.content,
        variables: seedTemplate.variables,
        createdAt: now,
      });
    }
  }

  console.log(`${seedTemplates.length} plantillas disponibles`);
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
  seedTemplates(process.cwd()).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
