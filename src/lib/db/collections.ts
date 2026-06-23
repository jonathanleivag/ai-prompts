import "server-only";

import type { Collection } from "mongodb";

import { getDb } from "./client";
import type {
  ProjectDocument,
  StepRunDocument,
  TemplateDocument,
  TemplateVersionDocument,
  WorkflowEventDocument,
} from "./models";

export interface AppCollections {
  projects: Collection<ProjectDocument>;
  stepRuns: Collection<StepRunDocument>;
  templates: Collection<TemplateDocument>;
  templateVersions: Collection<TemplateVersionDocument>;
  events: Collection<WorkflowEventDocument>;
}

export async function collections(): Promise<AppCollections> {
  const db = await getDb();
  return {
    projects: db.collection<ProjectDocument>("projects"),
    stepRuns: db.collection<StepRunDocument>("step_runs"),
    templates: db.collection<TemplateDocument>("templates"),
    templateVersions:
      db.collection<TemplateVersionDocument>("template_versions"),
    events: db.collection<WorkflowEventDocument>("events"),
  };
}
