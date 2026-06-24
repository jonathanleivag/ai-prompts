import "server-only";

import { collections } from "./collections";

export async function ensureIndexes(): Promise<void> {
  const { events, projects, stepRuns, templates, templateVersions } =
    await collections();

  await Promise.all([
    templates.createIndex({ step: 1 }, { unique: true }),
    stepRuns.createIndex({ projectId: 1, cycle: 1, step: 1 }, { unique: true }),
    templateVersions.createIndex(
      { templateId: 1, version: 1 },
      { unique: true },
    ),
    projects.createIndex({ updatedAt: -1 }),
    events.createIndex({ projectId: 1, createdAt: -1 }),
  ]);
}
