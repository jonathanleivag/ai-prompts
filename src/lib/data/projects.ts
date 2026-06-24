import "server-only";

import { ObjectId, type ClientSession, type MongoClient } from "mongodb";
import { connection } from "next/server";

import { collections as getCollections, type AppCollections } from "@/lib/db/collections";
import { getMongoClient } from "@/lib/db/client";
import type {
  ProjectDocument,
  StepRunDocument,
  TemplateDocument,
  WorkflowEventDocument,
} from "@/lib/db/models";
import { toObjectId } from "@/lib/db/object-id";
import { renderPrompt } from "@/lib/domain/template";
import type { Step } from "@/lib/domain/types";
import { createInitialRuns, transitionWorkflow } from "@/lib/domain/workflow";

export class WorkflowConflictError extends Error {
  constructor() {
    super("El workflow cambió; recarga el proyecto e inténtalo de nuevo");
    this.name = "WorkflowConflictError";
  }
}

export class PromptRequiredError extends Error {
  constructor() {
    super("Genera un prompt antes de continuar");
    this.name = "PromptRequiredError";
  }
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  currentStep: Step;
  cycle: number;
  status: ProjectDocument["status"];
  initialStep: Step;
  updatedAt: Date;
}

export interface ProjectDetail extends ProjectSummary {
  initialStep: Step;
  createdAt: Date;
  runs: Array<Omit<StepRunDocument, "_id" | "projectId" | "templateId"> & {
    id: string;
    templateId: string;
  }>;
}

export interface ProjectState {
  id: string;
  currentStep: Step;
  cycle: number;
  status: ProjectDocument["status"];
}

export interface ProjectRepositoryDependencies {
  client: Pick<MongoClient, "withSession">;
  collections: AppCollections;
}

export interface CreateProjectInput {
  userId: string;
  name: string;
  description: string;
  initialStep: Step;
}

export interface ExpectedWorkflowState {
  projectId: string;
  currentStep: Step;
  cycle: number;
}

export interface GenerateStepPromptInput extends ExpectedWorkflowState {
  variables: Record<string, string>;
}

export interface DecideReviewInput extends ExpectedWorkflowState {
  decision: "approve" | "request_changes";
}

export function createProjectRepository(dependencies: ProjectRepositoryDependencies) {
  const { client, collections } = dependencies;

  return {
    async listProjects({ userId, q, page, pageSize }: { userId: string; q?: string; page?: number; pageSize?: number }): Promise<{ items: ProjectSummary[]; total: number }> {
      const filter: Record<string, unknown> = { userId };
      if (q?.trim()) filter.name = { $regex: q.trim(), $options: "i" };
      const size = pageSize ?? 6;
      const skip = ((page ?? 1) - 1) * size;
      const [items, total] = await Promise.all([
        collections.projects.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(size).toArray(),
        collections.projects.countDocuments(filter),
      ]);
      return { items: items.map(projectSummary), total };
    },

    async getProjectDetail(id: string): Promise<ProjectDetail | null> {
      const projectId = toObjectId(id);
      const project = await collections.projects.findOne({ _id: projectId });
      if (!project) return null;
      const runs = await collections.stepRuns
        .find({ projectId })
        .sort({ cycle: 1, step: 1 })
        .toArray();
      return {
        ...projectSummary(project),
        initialStep: project.initialStep,
        createdAt: project.createdAt,
        runs: runs.map((run) => {
          const { _id, projectId, templateId, ...detail } = run;
          void projectId;
          return {
            ...detail,
            id: _id.toHexString(),
            templateId: templateId.toHexString(),
          };
        }),
      };
    },

    async deleteProject(id: string): Promise<void> {
      const projectId = toObjectId(id);
      await client.withSession((session) =>
        session.withTransaction(async () => {
          await collections.stepRuns.deleteMany({ projectId }, { session });
          await collections.events.deleteMany({ projectId }, { session });
          await collections.projects.deleteOne({ _id: projectId }, { session });
        }),
      );
    },

    async createProject(input: CreateProjectInput): Promise<ProjectState> {
      return client.withSession((session) =>
        session.withTransaction(async () => {
          const initialRuns = createInitialRuns(input.initialStep);
          const templates = await collections.templates
            .find(
              { step: { $in: initialRuns.map(({ step }) => step) } },
              { session },
            )
            .toArray();
          const templatesByStep = new Map(templates.map((template) => [template.step, template]));
          const missingStep = initialRuns.find(({ step }) => !templatesByStep.has(step))?.step;
          if (missingStep) throw new Error(`No existe plantilla para el paso ${missingStep}`);

          const now = new Date();
          const project: ProjectDocument = {
            _id: new ObjectId(),
            userId: input.userId,
            name: input.name,
            description: input.description,
            currentStep: input.initialStep,
            cycle: 1,
            status: "active",
            initialStep: input.initialStep,
            createdAt: now,
            updatedAt: now,
          };
          await collections.projects.insertOne(project, { session });
          await collections.stepRuns.insertMany(
            initialRuns.map(({ step, status }): StepRunDocument => {
              const template = templatesByStep.get(step)!;
              return runFromTemplate(project._id, 1, status, template);
            }),
            { session },
          );
          await collections.events.insertOne(
            event(project, "project_created", { initialStep: input.initialStep }, now),
            { session },
          );
          return projectState(project);
        }),
      );
    },

    async generateStepPrompt(input: GenerateStepPromptInput) {
      const projectId = toObjectId(input.projectId);
      return client.withSession((session) =>
        session.withTransaction(async () => {
          const run = await collections.stepRuns.findOne(
            { projectId, step: input.currentStep, cycle: input.cycle, status: "active" },
            { session },
          );
          if (!run) throw new WorkflowConflictError();
          const generated = generatePromptFromRun(run, input.variables);
          const now = new Date();
          await assertProjectState(collections, session, input, now);
          await collections.stepRuns.updateOne(
            { _id: run._id },
            {
              $set: {
                variables: generated.variables,
                generatedPrompt: generated.prompt,
                generatedAt: now,
              },
            },
            { session },
          );
          await collections.events.insertOne(
            eventForState(projectId, input, "prompt_generated", {
              templateVersion: run.templateVersion,
            }, now),
            { session },
          );
          return generated;
        }),
      );
    },

    async completeStep(input: ExpectedWorkflowState): Promise<ProjectState> {
      return transition(input, "complete");
    },

    async decideReview(input: DecideReviewInput): Promise<ProjectState> {
      return transition(input, input.decision);
    },
  };

  async function transition(
    input: ExpectedWorkflowState,
    decision: "complete" | "approve" | "request_changes",
  ): Promise<ProjectState> {
    const projectId = toObjectId(input.projectId);
    const next = transitionWorkflow(
      { step: input.currentStep, cycle: input.cycle },
      decision,
    );
    return client.withSession((session) =>
      session.withTransaction(async () => {
        const now = new Date();
        const runStatus =
          decision === "approve"
            ? "approved"
            : decision === "request_changes"
              ? "changes_requested"
              : "completed";
        const runUpdate = await collections.stepRuns.updateOne(
          {
            projectId,
            step: input.currentStep,
            cycle: input.cycle,
            status: "active",
            generatedPrompt: { $regex: /\S/ },
          },
          { $set: { status: runStatus, completedAt: now } },
          { session },
        );
        if (runUpdate.matchedCount === 0) {
          const activeRun = await collections.stepRuns.findOne(
            { projectId, step: input.currentStep, cycle: input.cycle, status: "active" },
            { session },
          );
          if (activeRun) throw new PromptRequiredError();
          throw new WorkflowConflictError();
        }

        const update = await collections.projects.updateOne(
          { _id: projectId, currentStep: input.currentStep, cycle: input.cycle },
          { $set: { currentStep: next.step, cycle: next.cycle, status: next.projectStatus, updatedAt: now } },
          { session },
        );
        if (update.matchedCount === 0) throw new WorkflowConflictError();

        if (next.projectStatus !== "completed") {
          const template = await collections.templates.findOne(
            { step: next.step },
            { session },
          );
          if (!template) throw new Error(`No existe plantilla para el paso ${next.step}`);
          await collections.stepRuns.insertOne(
            runFromTemplate(projectId, next.cycle, "active", template),
            { session },
          );
        }

        const type =
          decision === "approve"
            ? "approved"
            : decision === "request_changes"
              ? "changes_requested"
              : next.projectStatus === "completed"
                ? "project_completed"
                : "step_completed";
        await collections.events.insertOne(
          eventForState(projectId, input, type, { nextStep: next.step, nextCycle: next.cycle }, now),
          { session },
        );
        if (decision === "request_changes") {
          await collections.events.insertOne(
            eventForState(projectId, { ...input, currentStep: next.step, cycle: next.cycle }, "cycle_restarted", {}, now),
            { session },
          );
        }
        return {
          id: projectId.toHexString(),
          currentStep: next.step,
          cycle: next.cycle,
          status: next.projectStatus,
        };
      }),
    );
  }
}

async function runtimeRepository() {
  await connection();
  const [client, collections] = await Promise.all([getMongoClient(), getCollections()]);
  return createProjectRepository({ client, collections });
}

export async function listProjects(params: { userId: string; q?: string; page?: number; pageSize?: number }) {
  return (await runtimeRepository()).listProjects(params);
}
export async function getProjectDetail(id: string) {
  return (await runtimeRepository()).getProjectDetail(id);
}
export async function createProject(input: CreateProjectInput) {
  return (await runtimeRepository()).createProject(input);
}
export async function generateStepPrompt(input: GenerateStepPromptInput) {
  return (await runtimeRepository()).generateStepPrompt(input);
}
export async function completeStep(input: ExpectedWorkflowState) {
  return (await runtimeRepository()).completeStep(input);
}
export async function decideReview(input: DecideReviewInput) {
  return (await runtimeRepository()).decideReview(input);
}
export async function deleteProject(id: string) {
  return (await runtimeRepository()).deleteProject(id);
}

export function generatePromptFromRun(
  run: Pick<StepRunDocument, "templateSnapshot" | "templateVersion">,
  variables: Record<string, string>,
) {
  return {
    prompt: renderPrompt(run.templateSnapshot, variables),
    templateVersion: run.templateVersion,
    templateSnapshot: run.templateSnapshot,
    variables,
  };
}

function projectSummary(project: ProjectDocument): ProjectSummary {
  return {
    id: project._id.toHexString(),
    name: project.name,
    description: project.description,
    currentStep: project.currentStep,
    cycle: project.cycle,
    status: project.status,
    initialStep: project.initialStep,
    updatedAt: project.updatedAt,
  };
}

function projectState(project: ProjectDocument): ProjectState {
  return {
    id: project._id.toHexString(),
    currentStep: project.currentStep,
    cycle: project.cycle,
    status: project.status,
  };
}

function runFromTemplate(
  projectId: ObjectId,
  cycle: number,
  status: StepRunDocument["status"],
  template: TemplateDocument,
): StepRunDocument {
  return {
    _id: new ObjectId(),
    projectId,
    step: template.step,
    cycle,
    status,
    templateId: template._id,
    templateVersion: template.currentVersion,
    templateSnapshot: template.currentContent,
    variables: {},
  };
}

async function assertProjectState(
  collections: AppCollections,
  session: ClientSession,
  input: ExpectedWorkflowState,
  now: Date,
) {
  const result = await collections.projects.updateOne(
    { _id: toObjectId(input.projectId), currentStep: input.currentStep, cycle: input.cycle },
    { $set: { updatedAt: now } },
    { session },
  );
  if (result.matchedCount === 0) throw new WorkflowConflictError();
}

function event(
  project: ProjectDocument,
  type: "project_created",
  metadata: Record<string, unknown>,
  createdAt: Date,
) {
  return eventForState(project._id, { currentStep: project.currentStep, cycle: project.cycle }, type, metadata, createdAt);
}

function eventForState(
  projectId: ObjectId,
  state: Pick<ExpectedWorkflowState, "currentStep" | "cycle">,
  type: WorkflowEventDocument["type"],
  metadata: Record<string, unknown>,
  createdAt: Date,
) {
  return { _id: new ObjectId(), projectId, cycle: state.cycle, step: state.currentStep, type, metadata, createdAt };
}
