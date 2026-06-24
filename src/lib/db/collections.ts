import "server-only";

import type { Collection } from "mongodb";

import { getDb } from "./client";
import { COLLECTION_NAMES } from "./collection-names";
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
    projects: db.collection<ProjectDocument>(COLLECTION_NAMES.projects),
    stepRuns: db.collection<StepRunDocument>(COLLECTION_NAMES.stepRuns),
    templates: db.collection<TemplateDocument>(COLLECTION_NAMES.templates),
    templateVersions: db.collection<TemplateVersionDocument>(
      COLLECTION_NAMES.templateVersions,
    ),
    events: db.collection<WorkflowEventDocument>(
      COLLECTION_NAMES.workflowEvents,
    ),
  };
}
